const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const { Resend } = require('resend');
const cors = require('cors');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const firestore = new Firestore();

// Use environment variable for Resend API key
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error('RESEND_API_KEY environment variable is required');
}
const resend = new Resend(resendApiKey);

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true
}));

// Enable JSON parsing
app.use(express.json());

// Rate limiting map for email sending
const emailRateLimit = new Map();

const isEmailRateLimited = (email) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxEmails = 3; // 3 emails per minute per email address
  
  if (!emailRateLimit.has(email)) {
    emailRateLimit.set(email, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  const record = emailRateLimit.get(email);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }
  
  record.count++;
  return record.count > maxEmails;
};

const generateVerificationCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'email-service', timestamp: new Date().toISOString() });
});

// Homepage route
app.get('/', (req, res) => {
  res.json({
    service: 'Member Card System API',
    status: 'Running',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health - Health check',
      'POST /api/send-verification-code - Send email verification',
      'POST /api/verify-code - Verify email code',
      'POST /api/encode-member-card - Encode member card with steganography',
      'POST /api/verify-member-card - Verify member card data'
    ],
    frontend: 'https://member-card-system.netlify.app',
    documentation: 'API endpoints for Member Card System'
  });
});

// Send verification code endpoint
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
          return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, lastName'
      });
    }

    // Check rate limiting
    if (isEmailRateLimited(email)) {
      return res.status(429).json({
        success: false,
        code: 'EMAIL_RATE_LIMITED',
        error: 'Too many emails sent to this address. Please wait before requesting another.'
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store verification data in Firestore
    const verificationDoc = {
      email,
      code: verificationCode,
      firstName,
      lastName,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      verified: false
    };

    const docRef = await firestore.collection('email_verifications').add(verificationDoc);

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Member Registration <noreply@membercard.app>',
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${firstName} ${lastName}!</h2>
          <p>Your verification code is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });


    res.json({
      success: true,
      message: 'Verification code sent successfully',
      emailId: emailResult.data?.id,
      expiresIn: 10 // minutes
    });

  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      message: error.message
    });
  }
});

// Verify code endpoint
app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing email or code'
      });
    }

    // Find verification record
    const snapshot = await firestore.collection('email_verifications')
      .where('email', '==', email)
      .where('verified', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        code: 'NO_PENDING_VERIFICATION',
        error: 'No pending verification found for this email'
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if expired
    if (new Date() > data.expiresAt.toDate()) {
      return res.status(400).json({
        success: false,
        code: 'CODE_EXPIRED',
        error: 'Verification code has expired'
      });
    }

    // Check attempt limit
    if (data.attempts >= 5) {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_ATTEMPTS',
        error: 'Too many verification attempts'
      });
    }

    // Check code
    if (data.code !== code) {
      // Increment attempts
      await doc.ref.update({
        attempts: data.attempts + 1
      });

      return res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        error: 'Invalid verification code',
        attemptsRemaining: 5 - (data.attempts + 1)
      });
    }

    // Mark as verified
    await doc.ref.update({
      verified: true,
      verifiedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

// Steganography utility functions
function stringToBinary(str) {
  return str
    .split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')
}

function binaryToString(binary) {
  const bytes = []
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.slice(i, i + 8)
    if (byte.length === 8) {
      bytes.push(String.fromCharCode(parseInt(byte, 2)))
    }
  }
  return bytes.join('')
}

async function encodeUserDataInImage(imageUrl, loginData) {
  try {
    
    // Load the image
    const image = await loadImage(imageUrl)
    
    // Create canvas
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    
    // Draw image to canvas
    ctx.drawImage(image, 0, 0)
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Prepare data to hide (JSON string)
    const dataToHide = JSON.stringify(loginData)
    const binaryData = stringToBinary(dataToHide)
    
    // Add end marker
    const endMarker = '1111111111111110' // 16 bits as end marker
    const fullBinaryData = binaryData + endMarker
    
    
    // Check if image has enough capacity
    if (fullBinaryData.length > data.length / 4) {
      throw new Error('Image too small to hide this amount of data')
    }
    
    // Hide data in LSB of red channel
    for (let i = 0; i < fullBinaryData.length; i++) {
      const pixelIndex = i * 4 // Red channel of pixel i
      const bit = parseInt(fullBinaryData[i])
      
      // Clear LSB and set new bit
      data[pixelIndex] = (data[pixelIndex] & 0xFE) | bit
    }
    
    // Put modified image data back
    ctx.putImageData(imageData, 0, 0)
    
    // Return the canvas as buffer
    return canvas.toBuffer('image/png')
    
  } catch (error) {
    console.error('Steganography encoding failed:', error)
    throw error
  }
}

// Steganography endpoint
app.post('/api/encode-member-card', async (req, res) => {
  try {
    const { imageUrl, loginData } = req.body
    
    if (!imageUrl || !loginData) {
      return res.status(400).json({
        success: false,
        error: 'Missing imageUrl or loginData'
      })
    }
    
    console.log('Registration data prepared:', {
      email: loginData.email, 
      name: loginData.name, 
      accountId: loginData.accountId 
    })
    
    // Encode the image with user data
    const encodedImageBuffer = await encodeUserDataInImage(imageUrl, loginData)
    
    // Convert buffer to base64 for response
    const base64Image = encodedImageBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
    res.json({
      success: true,
      encodedImageUrl: dataUrl,
      message: 'Member card encoded successfully'
    })
    
  } catch (error) {
    console.error('Member card encoding error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to encode member card'
    })
  }
})

// Member card verification endpoint (decode steganography)
app.post('/api/verify-member-card', async (req, res) => {
  try {
    const { imageData } = req.body
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Missing image data'
      })
    }
    
    
    // Convert base64 to buffer if needed
    let imageBuffer
    if (imageData.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else if (imageData.startsWith('http')) {
      // Fetch image from URL
      const response = await fetch(imageData)
      imageBuffer = await response.buffer()
    } else {
      imageBuffer = Buffer.from(imageData, 'base64')
    }
    
    // Create image from buffer
    const image = await loadImage(imageBuffer)
    
    // Create canvas
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    
    // Draw image to canvas
    ctx.drawImage(image, 0, 0)
    
    // Get image data
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageDataObj.data
    
    // Extract binary data from LSB of red channel
    let binaryData = ''
    const endMarker = '1111111111111110'
    
    for (let i = 0; i < data.length / 4; i++) {
      const pixelIndex = i * 4 // Red channel of pixel i
      const lsb = data[pixelIndex] & 1 // Get LSB
      binaryData += lsb.toString()
      
      // Check for end marker
      if (binaryData.length >= endMarker.length) {
        const lastBits = binaryData.slice(-endMarker.length)
        if (lastBits === endMarker) {
          // Remove end marker
          binaryData = binaryData.slice(0, -endMarker.length)
          break
        }
      }
    }
    
    // Convert binary to string
    const decodedString = binaryToString(binaryData)
    
    // Parse JSON
    const userData = JSON.parse(decodedString)
    
    res.json({
      success: true,
      userData: userData,
      message: 'Member card verified successfully'
    })
    
  } catch (error) {
    console.error('Member card verification error:', error)
    res.json({
      success: false,
      error: 'Invalid or corrupted member card',
      hasData: false
    })
  }
})

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
});

module.exports = app; 