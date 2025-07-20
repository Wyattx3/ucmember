// Steganography utility for hiding comprehensive login data in member card images
export class SteganographyService {
  // Encode comprehensive login data into image using LSB steganography
  static async encodeUserData(imageUrl: string, loginData: { 
    email: string; 
    name: string; 
    pin: string;
    accountId: string;
    createdAt: string;
    zodiacSign: string;
    verification: {
      phone: string;
      city: string;
      dob: string;
    }
  }): Promise<string> {
    try {
      // Prepare data for encoding
      const dataToEncode = {
        email: loginData.email, 
        name: loginData.name, 
        accountId: loginData.accountId,
        zodiacSign: loginData.zodiacSign,
        pin: '***HIDDEN***' 
      };
      
      console.log('Encoding data:', dataToEncode);

      // Create canvas to work with image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Load the image
      const img = await this.loadImage(imageUrl)
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Prepare data to hide (JSON string)
      const dataToHide = JSON.stringify(loginData)
      const binaryData = this.stringToBinary(dataToHide)
      
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
      
      // Convert to blob and create object URL
      const encodedImageBlob = await this.canvasToBlob(canvas)
      const encodedImageUrl = URL.createObjectURL(encodedImageBlob)
      
      return encodedImageUrl

    } catch (error) {
      console.error('Steganography encoding failed:', error)
      throw new Error(`Failed to encode login data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Decode comprehensive login data from image
  static async decodeUserData(imageUrl: string): Promise<{ 
    email: string; 
    name: string; 
    pin: string;
    accountId: string;
    createdAt: string;
    zodiacSign: string;
    verification: {
      phone: string;
      city: string;
      dob: string;
    }
  } | null> {
    try {

      // Create canvas to work with image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Load the image
      const img = await this.loadImage(imageUrl)
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

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
      const decodedString = this.binaryToString(binaryData)

      // Parse JSON
      const userData = JSON.parse(decodedString)

      return userData

    } catch (error) {
      console.error('Steganography decoding failed:', error)
      return null
    }
  }

  // Helper: Load image from URL
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
  }

  // Helper: Convert canvas to blob
  private static canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      }, 'image/png', 1.0)
    })
  }

  // Helper: Convert string to binary
  private static stringToBinary(str: string): string {
    return str
      .split('')
      .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
      .join('')
  }

  // Helper: Convert binary to string
  private static binaryToString(binary: string): string {
    const bytes = []
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.slice(i, i + 8)
      if (byte.length === 8) {
        bytes.push(String.fromCharCode(parseInt(byte, 2)))
      }
    }
    return bytes.join('')
  }

  // Verify if image contains hidden data
  static async hasHiddenData(imageUrl: string): Promise<boolean> {
    try {
      const userData = await this.decodeUserData(imageUrl)
      return userData !== null
    } catch {
      return false
    }
  }

  // Create a downloadable blob from encoded image
  static async createDownloadableCard(
    originalImageUrl: string, 
    loginData: { 
      email: string; 
      name: string; 
      pin: string;
      accountId: string;
      createdAt: string;
      zodiacSign: string;
      verification: {
        phone: string;
        city: string;
        dob: string;
      }
    },
    filename: string = 'member_card.png'
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    try {
      // Encode login data into image
      const encodedImageUrl = await this.encodeUserData(originalImageUrl, loginData)
      
      // Convert to blob
      const response = await fetch(encodedImageUrl)
      const blob = await response.blob()
      
      // Clean up object URL
      URL.revokeObjectURL(encodedImageUrl)
      
      return {
        blob,
        url: URL.createObjectURL(blob),
        filename: `${loginData.name.replace(/\s+/g, '_')}_${filename}`
      }
    } catch (error) {
      console.error('Failed to create downloadable card:', error)
      throw error
    }
  }
} 