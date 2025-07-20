import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const storage = new Storage();
const firestore = new Firestore();

// Rate limiting map
const rateLimitMap = new Map();

const isRateLimited = (ip) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // 5 attempts per 15 minutes
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }
  
  record.count++;
  return record.count > maxAttempts;
};

// Steganography decoding function (simplified for server-side)
const decodeUserDataFromImage = async (imageBuffer) => {
  try {
    // In production, you would implement LSB steganography decoding
    // For now, we'll simulate this with a placeholder
    
    // This is a placeholder - in real implementation, you would:
    // 1. Process the image buffer to extract LSB data
    // 2. Convert binary data back to JSON
    // 3. Return user data
    
    // For demo purposes, return null to indicate no data found
    return null;
  } catch (error) {
    console.error('Steganography decoding failed:', error);
    return null;
  }
};

const memberAuth = (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  return handleAuth(req, res);
};

const handleAuth = async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    const { action } = req.body;

    switch (action) {
      case 'register':
        return handleRegistration(req, res);
      case 'login':
        return handleLogin(req, res);
      case 'loginWithCard':
        return handleMemberCardLogin(req, res);
      case 'verify':
        return handleVerification(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          code: 'INVALID_ACTION'
        });
    }

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const handleRegistration = async (req, res) => {
  try {
    const { userData, memberCardData } = req.body;

    if (!userData || !memberCardData) {
      return res.status(400).json({
        success: false,
        error: 'User data and member card data are required',
        code: 'MISSING_DATA'
      });
    }

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dob', 'pin'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
          code: 'MISSING_FIELD'
        });
      }
    }

    // Check if user already exists
    const existingUser = await firestore
      .collection('users')
      .where('email', '==', userData.email)
      .get();

    if (!existingUser.empty) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(userData.pin, 12);

    // Create user document
    const userDoc = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      dob: userData.dob,
      height: userData.height,
      gender: userData.gender,
      city: userData.city,
      hobby: userData.hobby,
      relationshipStatus: userData.relationshipStatus,
      favoriteArtist: userData.favoriteArtist,
      zodiacSign: userData.zodiacSign,
      hashedPin,
      memberCardUrl: memberCardData.url,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    // Save to Firestore
    const docRef = await firestore.collection('users').add(userDoc);


    return res.json({
      success: true,
      message: 'User registered successfully',
      userId: docRef.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_FAILED'
    });
  }
};

const handleLogin = async (req, res) => {
  try {
    const { memberCardData, pin } = req.body;

    if (!memberCardData || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Member card data and PIN are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // In a real implementation, you would decode steganography data from the uploaded card
    // For now, we'll search by email if provided in memberCardData
    if (!memberCardData.email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member card - no user data found',
        code: 'INVALID_CARD'
      });
    }

    // Find user by email
    const userQuery = await firestore
      .collection('users')
      .where('email', '==', memberCardData.email)
      .where('isActive', '==', true)
      .get();

    if (userQuery.empty) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, userData.hashedPin);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
        code: 'INVALID_PIN'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      {
        userId: userDoc.id,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Update last login
    await firestore.collection('users').doc(userDoc.id).update({
      lastLogin: new Date(),
      updatedAt: new Date()
    });


    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
};

const handleVerification = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const decoded = jwt.verify(token, jwtSecret);

    // Check if user still exists and is active
    const userDoc = await firestore.collection('users').doc(decoded.userId).get();

    if (!userDoc.exists || !userDoc.data().isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.json({
      success: true,
      message: 'Token is valid',
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

const handleMemberCardLogin = async (req, res) => {
  try {
    const { memberCardData, enteredPin } = req.body;

    if (!memberCardData || !enteredPin) {
      return res.status(400).json({
        success: false,
        error: 'Member card data and PIN are required',
        code: 'MISSING_DATA'
      });
    }

    console.log("Member card data:", {      email: memberCardData.email,
      accountId: memberCardData.accountId,
      zodiacSign: memberCardData.zodiacSign
    });

    // Find user by email and verify additional data
    const userQuery = await firestore
      .collection('users')
      .where('email', '==', memberCardData.email)
      .get();

    if (userQuery.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Verify PIN
    const isValidPin = await bcrypt.compare(enteredPin, userData.hashedPin);
    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
        code: 'INVALID_PIN'
      });
    }

    // Additional verification using steganography data
    const memberCardVerification = {
      zodiacSignMatch: userData.zodiacSign === memberCardData.zodiacSign,
      phoneMatch: userData.phone === memberCardData.verification.phone,
      cityMatch: userData.city === memberCardData.verification.city,
      dobMatch: userData.dob === memberCardData.verification.dob
    };

    // Check if critical data matches
    if (!memberCardVerification.zodiacSignMatch || 
        !memberCardVerification.phoneMatch || 
        !memberCardVerification.dobMatch) {
      console.warn('Member card verification failed:', memberCardVerification);
      return res.status(401).json({
        success: false,
        error: 'Member card data verification failed',
        code: 'CARD_VERIFICATION_FAILED'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      {
        userId: userDoc.id,
        email: userData.email,
        accountId: memberCardData.accountId
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    await userDoc.ref.update({
      lastLogin: new Date(),
      updatedAt: new Date()
    });


    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    });

  } catch (error) {
    console.error('Member card login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
};

// Register the HTTP function
functions.http('memberAuth', memberAuth); 