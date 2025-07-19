import { useState } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import Loader from './Loader'
import { ValidationUtils } from '../utils/validation'
import CityAutocomplete from './CityAutocomplete'
import { SteganographyService } from '../utils/steganography'
import { apiService } from '../services/api'

interface CreateAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

const StyledWrapper = styled.div`
  button {
    font-family: inherit;
    font-size: 20px;
    background: #212121;
    color: white;
    fill: rgb(155, 153, 153);
    padding: 0.7em 1em;
    padding-left: 0.9em;
    display: flex;
    align-items: center;
    cursor: pointer;
    border: none;
    border-radius: 15px;
    font-weight: 1000;
  }

  button span {
    display: block;
    margin-left: 0.3em;
    transition: all 0.3s ease-in-out;
  }

  button svg {
    display: block;
    transform-origin: center center;
    transition: transform 0.3s ease-in-out;
  }

  button:hover {
    background: #000;
  }

  button:hover .svg-wrapper {
    transform: scale(1.25);
    transition: 0.5s linear;
  }

  button:hover svg {
    transform: translateX(1.2em) scale(1.1);
    fill: #fff;
  }

  button:hover span {
    opacity: 0;
    transition: 0.5s linear;
  }

  button:active {
    transform: scale(0.95);
  }
`

export default function CreateAccountModal({ isOpen, onClose }: CreateAccountModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [firstName, setFirstName] = useState('John')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('(775) 351-6501')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [dob, setDob] = useState('')
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState('')
  const [city, setCity] = useState('')
  const [hobby, setHobby] = useState('')
  const [relationshipStatus, setRelationshipStatus] = useState('')
  const [favoriteArtist, setFavoriteArtist] = useState('')
  const [facebookConnected, setFacebookConnected] = useState(false)
  const [privatePhoto, setPrivatePhoto] = useState<File | null>(null)
  const [publicPhoto, setPublicPhoto] = useState<File | null>(null)
  const [rawPublicPhoto, setRawPublicPhoto] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropPreview, setCropPreview] = useState<string>('')
  const [cropSettings, setCropSettings] = useState({
    scale: 1,
    x: 0,
    y: 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [verificationCode, setVerificationCode] = useState(['', '', '', ''])
  const [pinCode, setPinCode] = useState(['', '', '', '', '', ''])
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)
  const [memberCardUrl, setMemberCardUrl] = useState('')
  // const [cardGenerated, setCardGenerated] = useState(false) // Removed as not used

  // Calculate zodiac sign from DOB
  const getZodiacSign = (dateString: string) => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '♈ Aries'
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '♉ Taurus'
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '♊ Gemini'
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '♋ Cancer'
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '♌ Leo'
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '♍ Virgo'
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '♎ Libra'
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '♏ Scorpio'
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '♐ Sagittarius'
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '♑ Capricorn'
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '♒ Aquarius'
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '♓ Pisces'
    
    return ''
  }

  const zodiacSign = getZodiacSign(dob)

  // Production validation handlers using backend API
  const validateAndSetField = async (fieldName: string, value: string, validator?: (val: string) => boolean, formatter?: (val: string) => string) => {
    const errors = {...validationErrors}
    let processedValue = value

    try {
      // Use production backend for validation and formatting
      const result = await apiService.validateAndFormatField(fieldName, value)
      
      if (result.success) {
        processedValue = result.formatted
        
        if (!result.valid && result.error) {
          errors[fieldName] = result.error
        } else {
          delete errors[fieldName]
        }
      } else {
        // Fallback to client-side validation
        console.warn('Backend validation failed, using client-side validation')
        
        // Apply formatter if provided
        if (formatter) {
          processedValue = formatter(value)
        }

        // Sanitize input
        processedValue = ValidationUtils.sanitizeInput(processedValue)

        // Validate English only for text fields
        if (['firstName', 'lastName', 'city', 'hobby', 'favoriteArtist'].includes(fieldName)) {
          if (processedValue && !ValidationUtils.isEnglishOnly(processedValue)) {
            errors[fieldName] = 'Please use English characters only'
          } else {
            delete errors[fieldName]
          }
        }

        // Apply custom validator if provided
        if (validator && processedValue && !validator(processedValue)) {
          if (fieldName === 'email') {
            errors[fieldName] = 'Please enter a valid email address'
          } else if (fieldName === 'phone') {
            errors[fieldName] = 'Please enter a valid phone number'
          } else if (fieldName === 'firstName' || fieldName === 'lastName') {
            errors[fieldName] = 'Name must be 2-50 characters, English letters only'
          } else {
            errors[fieldName] = 'Invalid format'
          }
        } else if (validator) {
          delete errors[fieldName]
        }
      }

    } catch (error) {
      console.error('Validation API error:', error)
      // Fallback to original client-side validation
      if (formatter) {
        processedValue = formatter(value)
      }
      processedValue = ValidationUtils.sanitizeInput(processedValue)
      
      if (['firstName', 'lastName', 'city', 'hobby', 'favoriteArtist'].includes(fieldName)) {
        if (processedValue && !ValidationUtils.isEnglishOnly(processedValue)) {
          errors[fieldName] = 'Please use English characters only'
        } else {
          delete errors[fieldName]
        }
      }
    }

    setValidationErrors(errors)
    
    // Update the field value
    switch (fieldName) {
      case 'firstName': setFirstName(processedValue); break
      case 'lastName': setLastName(processedValue); break
      case 'email': setEmail(processedValue); break
      case 'phone': setPhone(processedValue); break
      case 'city': setCity(processedValue); break
      case 'hobby': setHobby(processedValue); break
      case 'favoriteArtist': setFavoriteArtist(processedValue); break
    }
  }

  // Check if all fields are filled and valid
  const isFormValid = firstName && lastName && email && phone && dob && height && gender && city && hobby && relationshipStatus && favoriteArtist &&
    ValidationUtils.isValidName(firstName) &&
    ValidationUtils.isValidName(lastName) &&
    ValidationUtils.isValidEmail(email) &&
    ValidationUtils.isValidPhoneNumber(phone) &&
    ValidationUtils.isValidCity(city) &&
    Object.keys(validationErrors).length === 0

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (isFormValid) {
      setCurrentStep(2)
    }
  }

  const handleFacebookConnect = () => {
    setFacebookConnected(true)
    // Here you would integrate with Facebook SDK
    console.log('Connecting to Facebook...')
  }

  const handlePrivatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrivatePhoto(e.target.files[0])
    }
  }

  const handlePublicPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setRawPublicPhoto(file)
      
      // Reset crop settings
      setCropSettings({ scale: 1, x: 0, y: 0 })
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setCropPreview(event.target.result as string)
          setShowCropModal(true)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendVerificationCode = () => {
    // Here you would send verification code to email
    setIsCodeSent(true)
    console.log('Verification code sent to:', email)
  }

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode]
      newCode[index] = value
      setVerificationCode(newCode)
      
      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`code-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handlePinCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pinCode]
      newPin[index] = value
      setPinCode(newPin)
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`pin-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleCreateAccount = async () => {
    try {
      console.log('Creating account with production backend...')
      
      // Prepare user data for backend
      const userData = {
        firstName,
        lastName,
        email,
        phone,
        dob,
        height,
        gender,
        city,
        hobby,
        relationshipStatus,
        favoriteArtist,
        zodiacSign,
        pin: pinCode.join(''),
        facebookConnected,
        hasPrivatePhoto: !!privatePhoto,
        hasPublicPhoto: !!publicPhoto,
        verificationCode: verificationCode.join('')
      }

      console.log('User data prepared:', { 
        email: userData.email, 
        name: `${userData.firstName} ${userData.lastName}`,
        zodiacSign: userData.zodiacSign 
      })
      
      // Go to member card page and start generation
      setCurrentStep(5)
      await generateMemberCard()
      
    } catch (error) {
      console.error('Account creation failed:', error)
      // You could show an error message here
    }
  }

  const generateMemberCard = async () => {
    setIsGeneratingCard(true)
    
    try {
      console.log('Starting member card generation...')
      console.log('Account data being used:')
      console.log('- First Name:', firstName)
      console.log('- Last Name:', lastName)
      console.log('- Full Name:', `${firstName} ${lastName}`)
      console.log('- Public Photo:', publicPhoto ? publicPhoto.name : 'No photo')
      console.log('- Zodiac sign:', zodiacSign)
      
      // Validate required data
      if (!firstName || !lastName) {
        throw new Error('Name information is missing. Please complete your profile first.')
      }
      
      if (!publicPhoto) {
        console.warn('No public photo provided - card will be generated without photo')
      }
      
      // Get template UUID based on zodiac sign
      const templateUuid = zodiacTemplates[zodiacSign]
      console.log('Template UUID:', templateUuid)
      
      if (!templateUuid) {
        throw new Error(`Template not found for zodiac sign: ${zodiacSign}`)
      }

      // Convert photo to base64 if exists
      let photoData = null
      if (publicPhoto) {
        console.log('Converting photo to base64...')
        try {
          const base64String = await convertToBase64(publicPhoto)
          console.log('Photo converted successfully')
          photoData = base64String
        } catch (photoError) {
          console.error('Photo conversion error:', photoError)
          throw new Error('Failed to process photo. Please try with a different image.')
        }
      }

      // First, fetch template data to get actual layer names
      console.log('Fetching template data to get layer names...')
      const templateResponse = await fetch(`/api/placid/api/rest/templates/${templateUuid}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer placid-shkqjnmsaeksxkwy-neunc45bhjjm6cv9',
          'Accept': 'application/json'
        }
      })

      let textLayerName = 'Name' // fallback
      let photoLayerName = 'Photo' // fallback

      if (templateResponse.ok) {
        const templateData = await templateResponse.json()
        console.log('Template data:', templateData)
        
        if (templateData.layers) {
          // Find text layer
          const textLayer = templateData.layers.find((layer: any) => layer.type === 'text')
          if (textLayer) {
            textLayerName = textLayer.name
            console.log('Found text layer:', textLayerName)
          }
          
          // Find picture layer
          const pictureLayer = templateData.layers.find((layer: any) => layer.type === 'picture')
          if (pictureLayer) {
            photoLayerName = pictureLayer.name
            console.log('Found picture layer:', photoLayerName)
          }
        }
      } else {
        console.warn('Could not fetch template data, using fallback layer names')
      }

      const requestPayload = {
        template_uuid: templateUuid,
        layers: {
          [textLayerName]: {
            'text': `${firstName} ${lastName}`
          }
        } as { [key: string]: any }
      }

      // Add photo layer only if photo exists
      if (photoData) {
        requestPayload.layers[photoLayerName] = {
          'image': photoData
        }
        console.log('Photo layer added:', photoLayerName)
      } else {
        console.log('No photo layer - generating card with name only')
      }

                    console.log('Final payload data:')
       console.log('- Template UUID:', templateUuid)
       console.log('- Name for card:', `${firstName} ${lastName}`)
       console.log('- Photo included:', photoData ? 'Yes' : 'No')
       console.log('- Text layer name:', textLayerName)
       console.log('- Photo layer name:', photoData ? photoLayerName : 'None')
       console.log('- Total layers:', Object.keys(requestPayload.layers).length)

      // Single API request to save credits
      console.log('Making single API request to save credits...')
      console.log('Sending request to:', '/api/placid/api/rest/images')
      console.log('Request headers:', {
        'Authorization': 'Bearer placid-shkqjnmsaeksxkwy-neunc45bhjjm6cv9',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('/api/placid/api/rest/images', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer placid-shkqjnmsaeksxkwy-neunc45bhjjm6cv9',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log(`API Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error (${response.status}):`, errorText)
        
        if (response.status === 401) {
          throw new Error('API authentication failed. Please contact administrator.')
        } else if (response.status === 404) {
          throw new Error('Brand template not found. Please contact administrator.')
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again in a few minutes.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`API returned error ${response.status}: ${errorText}`)
        }
      }

      const responseData = await response.json()
      console.log('API Response data:', responseData)
      console.log('Full API response structure:', JSON.stringify(responseData, null, 2))
      
      // Check for image URL in different possible fields
      let imageUrl = responseData.image_url || 
                    responseData.url || 
                    responseData.download_url || 
                    responseData.png_url ||
                    responseData.jpeg_url ||
                    responseData.image ||
                    responseData.result?.image_url ||
                    responseData.result?.url ||
                    responseData.data?.image_url ||
                    responseData.data?.url

      console.log('Initial image URL:', imageUrl)
      console.log('Response status:', responseData.status)
      console.log('Polling URL:', responseData.polling_url)

        // If no image URL but has polling URL, this is an async operation
        if (!imageUrl && responseData.polling_url && responseData.status) {
          console.log('Image generation is async, polling for result...')
          
          // Poll for the result
          const maxPollAttempts = 30 // 30 attempts = 30 seconds max
          let pollAttempt = 0
          
          while (pollAttempt < maxPollAttempts && !imageUrl) {
            pollAttempt++
            console.log(`Polling attempt ${pollAttempt}/${maxPollAttempts}...`)
            
            // Wait 1 second before polling
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            try {
              const pollResponse = await fetch(responseData.polling_url.replace('https://api.placid.app', '/api/placid'), {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer placid-shkqjnmsaeksxkwy-neunc45bhjjm6cv9',
                  'Accept': 'application/json'
                }
              })
              
              if (pollResponse.ok) {
                const pollData = await pollResponse.json()
                console.log(`Poll ${pollAttempt} response:`, pollData)
                
                // Check if image is ready
                imageUrl = pollData.image_url || pollData.url || pollData.download_url
                
                if (imageUrl) {
                  console.log('Image generation completed:', imageUrl)
                  break
                } else if (pollData.status === 'failed' || pollData.status === 'error') {
                  console.error('Image generation failed:', pollData)
                  throw new Error(`Image generation failed: ${pollData.errors || 'Unknown error'}`)
                } else {
                  console.log(`Image still processing... Status: ${pollData.status}`)
                }
              } else {
                console.warn(`Poll attempt ${pollAttempt} failed with status ${pollResponse.status}`)
              }
            } catch (pollError) {
              console.warn(`Poll attempt ${pollAttempt} error:`, pollError)
              // Continue polling even if one attempt fails
            }
          }
          
          if (!imageUrl) {
            throw new Error('Image generation timed out after polling')
          }
        }

        console.log('Final image URL:', imageUrl)
        console.log('All possible URL fields:', {
          image_url: responseData.image_url,
          url: responseData.url,
          download_url: responseData.download_url,
          png_url: responseData.png_url,
          jpeg_url: responseData.jpeg_url,
          image: responseData.image,
          result_image_url: responseData.result?.image_url,
          result_url: responseData.result?.url,
          data_image_url: responseData.data?.image_url,
          data_url: responseData.data?.url
        })

        if (!imageUrl) {
          console.error('No image URL found in response:', responseData)
          console.error('Response keys:', Object.keys(responseData))
          throw new Error(`Brand template generation failed - no image URL received. Response keys: ${Object.keys(responseData).join(', ')}, Status: ${responseData.status}`)
        }

        // Verify the image URL is accessible
        try {
          const imageCheck = await fetch(imageUrl, { method: 'HEAD' })
          if (!imageCheck.ok) {
            throw new Error('Generated brand template is not accessible')
          }
        } catch (imageError) {
          console.warn('Image URL check failed:', imageError)
          // Continue anyway, the URL might still work for display
        }

        // Apply steganography to hide user data in the card
        console.log('Applying steganography to member card...')
        try {
          const userData = {
            email: email,
            name: `${firstName} ${lastName}`,
            pin: pinCode.join('')
          }
          
          // Create downloadable card with hidden data
          const encodedCard = await SteganographyService.createDownloadableCard(
            imageUrl,
            userData,
            'member_card.png'
          )
          
          console.log('Steganography applied successfully')
          console.log('Encoded card created:', encodedCard.filename)
          
          // Use encoded image URL for display and download
          setMemberCardUrl(encodedCard.url)
          // setCardGenerated(true) // Removed
          console.log('Brand member card with hidden data generated successfully')
          
          // Register user with backend after successful card generation
          await registerUserWithBackend(encodedCard.url)
          
        } catch (stegoError) {
          console.error('Steganography failed, using original card:', stegoError)
          // Fallback to original card if steganography fails
          setMemberCardUrl(imageUrl)
          // setCardGenerated(true) // Removed
          console.log('Brand member card generated successfully (without steganography):', imageUrl)
          
          // Register user with backend using original card
          await registerUserWithBackend(imageUrl)
        }
        
      } catch (error) {
        console.error('Brand member card generation failed:', error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Error message:', errorMessage)
        
        // Show detailed error message and stop the process
        let userMessage = 'Brand member card generation မအောင်မြင်ပါ။\n\n'
        
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Load failed')) {
          userMessage += 'Internet connection စစ်ကြည့်ပြီး ပြန်လုပ်ကြည့်ပါ။'
        } else if (errorMessage.includes('API authentication')) {
          userMessage += 'API authentication ပြဿနာ။ Administrator ကို contact လုပ်ပါ။'
        } else if (errorMessage.includes('Brand template')) {
          userMessage += 'Brand template configuration ပြဿနာ။ Administrator ကို contact လုပ်ပါ။'
        } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          userMessage += 'Server response နှေးနေပါတယ်။ ပြန်လုပ်ကြည့်ပါ။'
        } else if (errorMessage.includes('Failed to process photo')) {
          userMessage += 'Photo ပြဿနာ ရှိနေပါတယ်။ မတူတဲ့ photo နဲ့ ပြန်လုပ်ကြည့်ပါ။'
        } else {
          userMessage += 'Technical error ဖြစ်နေပါတယ်။ Administrator ကို contact လုပ်ပါ။'
        }
        
        userMessage += '\n\nTechnical details: ' + errorMessage
        
        console.error('Card generation failed:', userMessage)
        
        // Reset states and go back to PIN step
        // setCardGenerated(false) // Removed
        setMemberCardUrl('')
        setCurrentStep(4) // Go back to PIN step to try again
      } finally {
        setIsGeneratingCard(false)
          }
  }

  const registerUserWithBackend = async (memberCardUrl: string) => {
    try {
      console.log('Registering user with production backend...')
      
      const userData = {
        firstName,
        lastName,
        email,
        phone,
        dob,
        height,
        gender,
        city,
        hobby,
        relationshipStatus,
        favoriteArtist,
        zodiacSign,
        pin: pinCode.join(''),
        facebookConnected,
        hasPrivatePhoto: !!privatePhoto,
        hasPublicPhoto: !!publicPhoto,
        verificationCode: verificationCode.join('')
      }

      const memberCardData = {
        url: memberCardUrl,
        generatedAt: new Date().toISOString(),
        hasHiddenData: true,
        zodiacSign
      }

      const registrationResult = await apiService.registerUser(userData, memberCardData)
      
      if (registrationResult.success) {
        console.log('User successfully registered with backend!')
        console.log('User ID:', registrationResult.userId)
      } else {
        console.error('Backend registration failed:', registrationResult.error)
        // Card is still generated, user can still download it
        // Just log the error without breaking the flow
      }
      
    } catch (error) {
      console.error('Backend registration error:', error)
      // Card generation was successful, registration failure shouldn't break the flow
    }
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleDownloadCard = () => {
    console.log('Download card clicked!')
    console.log('Member card URL:', memberCardUrl)
    
    if (memberCardUrl) {
      try {
        const link = document.createElement('a')
        link.href = memberCardUrl
        const filename = `${firstName}_${lastName}_MemberCard.png`
        link.download = filename
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        
        console.log('Downloading member card with filename:', filename)
        console.log('Card contains data for:', `${firstName} ${lastName}`)
        
        // Add to DOM temporarily
        link.style.display = 'none'
        document.body.appendChild(link)
        
        // Trigger download
        link.click()
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link)
        }, 100)
        
        // Show feedback - silent download
        console.log('Member card downloaded successfully')
        
              } catch (error) {
          console.error('Download error:', error)
        }
      } else {
        console.error('No member card URL available')
      }
  }

  // const handleFinish = () => {
  //   onClose()
  //   // Reset all states
  //   setCurrentStep(1)
  //   // setCardGenerated(false) // Removed
  //   setMemberCardUrl('')
  // } // Removed as not used

  const handleCropPhoto = () => {
    if (cropPreview && rawPublicPhoto) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Set canvas size for 2:3 ratio
        canvas.width = 400
        canvas.height = 600
        
        // Calculate crop area from the preview container (240x360)
        const previewWidth = 240
        const previewHeight = 360
        const cropAreaWidth = previewWidth - 32 // inset-4 = 16px each side  
        const cropAreaHeight = previewHeight - 32
        
        // Calculate the visible image area in the preview
        const imageDisplayWidth = previewWidth * cropSettings.scale
        const imageDisplayHeight = previewHeight * cropSettings.scale
        
        // Calculate scale factor from preview to actual image
        const scaleX = img.width / imageDisplayWidth
        const scaleY = img.height / imageDisplayHeight
        
        // Calculate crop area relative to the scaled image
        const cropStartX = (16 - cropSettings.x) * scaleX
        const cropStartY = (16 - cropSettings.y) * scaleY  
        const cropWidth = cropAreaWidth * scaleX
        const cropHeight = cropAreaHeight * scaleY
        
        // Ensure crop area is within image bounds
        const finalX = Math.max(0, Math.min(cropStartX, img.width - cropWidth))
        const finalY = Math.max(0, Math.min(cropStartY, img.height - cropHeight))
        const finalWidth = Math.min(cropWidth, img.width - finalX)
        const finalHeight = Math.min(cropHeight, img.height - finalY)
        
        // Draw cropped image to canvas
        if (ctx) {
          ctx.drawImage(
            img,
            finalX, finalY, finalWidth, finalHeight,
            0, 0, canvas.width, canvas.height
          )
        }
        
        // Convert to blob and create file
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], rawPublicPhoto.name, {
              type: rawPublicPhoto.type,
              lastModified: Date.now()
            })
            setPublicPhoto(croppedFile)
            setShowCropModal(false)
            setCropPreview('')
            setCropSettings({ scale: 1, x: 0, y: 0 })
          }
        }, rawPublicPhoto.type, 0.9)
      }
      
      img.src = cropPreview
    }
  }

  const handleCancelCrop = () => {
    setShowCropModal(false)
    setCropPreview('')
    setRawPublicPhoto(null)
    setCropSettings({ scale: 1, x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropSettings.x, y: e.clientY - cropSettings.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setCropSettings(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches[0]
    setDragStart({ x: touch.clientX - cropSettings.x, y: touch.clientY - cropSettings.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y
      setCropSettings(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setCropSettings(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }))
  }

  const handleZoomOut = () => {
    setCropSettings(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.5) }))
  }

  const handleResetCrop = () => {
    setCropSettings({ scale: 1, x: 0, y: 0 })
  }

  // Zodiac template mapping
  const zodiacTemplates: { [key: string]: string } = {
    '♈ Aries': 'j6ehthwp4ebni',
    '♌ Leo': 'edwpmrtvv5jve',
    '♐ Sagittarius': 'lg7nzqy6j4cmp',
    '♑ Capricorn': 'fxttmjldsihon',
    '♉ Taurus': 'gn90qglltsblt',
    '♍ Virgo': 'ktvyen2uccve4',
    '♓ Pisces': 'gytvthemh7u4q',
    '♏ Scorpio': 'l2lkioklntrfn',
    '♋ Cancer': 'odeocw8irt0dm',
    '♒ Aquarius': 'tk89fegxkwtze',
    '♊ Gemini': 'yye2smun1hjh5',
    '♎ Libra': 'wrwqrid3twimv'
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 75%, #000000 100%)'
      }}
    >
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 sm:px-6"
      >
        {/* Glass morphism card */}
        <div 
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white z-10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-4 sm:mb-6 md:mb-8 pr-8 sm:pr-0">
            {currentStep === 1 && 'Create an account'}
            {currentStep === 2 && 'Complete your profile'}
            {currentStep === 3 && 'Verify your email'}
            {currentStep === 4 && 'Set your PIN code'}
            {currentStep === 5 && (isGeneratingCard ? 'ကတ်ကို ပြုလုပ်နေပါတယ်...' : 'Your Member Card')}
          </h2>

          {/* Step 1: Personal Information Form */}
          {currentStep === 1 && (
          <form className="space-y-3 sm:space-y-4" onSubmit={handleNext}>
            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => validateAndSetField('firstName', e.target.value, ValidationUtils.isValidName, ValidationUtils.formatName)}
                  className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                    validationErrors.firstName ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                  } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                  placeholder="First name (English only) *"
                  required
                />
                {validationErrors.firstName && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.firstName}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => validateAndSetField('lastName', e.target.value, ValidationUtils.isValidName, ValidationUtils.formatName)}
                  className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                    validationErrors.lastName ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                  } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                  placeholder="Last name (English only) *"
                  required
                />
                {validationErrors.lastName && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => validateAndSetField('email', e.target.value, ValidationUtils.isValidEmail, ValidationUtils.formatEmail)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                  validationErrors.email ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                placeholder="Enter your email *"
                required
              />
              {validationErrors.email && (
                <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone field */}
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-5 h-3 sm:w-6 sm:h-4 bg-gradient-to-r from-red-500 via-white to-blue-500 rounded-sm flex items-center justify-center">
                    <span className="text-xs">🇺🇸</span>
                  </div>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => validateAndSetField('phone', e.target.value, ValidationUtils.isValidPhoneNumber, ValidationUtils.formatPhoneNumber)}
                className={`w-full pl-16 sm:pl-20 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                  validationErrors.phone ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                placeholder="Phone number (US format) *"
                required
              />
              {validationErrors.phone && (
                <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.phone}</p>
              )}
            </div>

            {/* Date of Birth with Zodiac */}
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-16 sm:pr-20 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                required
              />
              {zodiacSign && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2"
                >
                  <span className="text-white/80 text-xs sm:text-sm font-medium">{zodiacSign}</span>
                </motion.div>
              )}
            </div>

            {/* Height */}
            <div>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                placeholder="Height (e.g., 5'8) *"
                required
              />
            </div>

            {/* Gender Radio Buttons */}
            <div>
              <div className="mb-2 text-white/60 text-xs sm:text-sm">Gender *</div>
              <div className="relative flex bg-white/6 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden w-full shadow-lg">
                <input type="radio" name="gender" id="male" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} className="sr-only" />
                <label htmlFor="male" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                  Male
                </label>
                
                <input type="radio" name="gender" id="female" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} className="sr-only" />
                <label htmlFor="female" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                  Female
                </label>

                <input type="radio" name="gender" id="non-binary" value="non-binary" checked={gender === 'non-binary'} onChange={(e) => setGender(e.target.value)} className="sr-only" />
                <label htmlFor="non-binary" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                  Other
                </label>

                {/* Glider */}
                <motion.div
                  className="absolute top-0 bottom-0 rounded-xl sm:rounded-2xl z-[1]"
                  style={{
                    width: '33.333%',
                    background: gender === 'male' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4))'
                      : gender === 'female'
                      ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(219, 39, 119, 0.4))'
                      : 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.4))',
                    boxShadow: gender 
                      ? '0 0 18px rgba(147, 51, 234, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)'
                      : 'none'
                  }}
                  animate={{
                    x: gender === 'male' ? '0%' : gender === 'female' ? '100%' : gender === 'non-binary' ? '200%' : '0%',
                    opacity: gender ? 1 : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                />
              </div>
            </div>

            {/* Living City with Google Places Autocomplete */}
            <CityAutocomplete
                value={city}
              onChange={(value) => setCity(value)}
              placeholder="Living City (Worldwide) *"
                required
              />

            {/* Hobby */}
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={hobby}
                onChange={(e) => validateAndSetField('hobby', e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                  validationErrors.hobby ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                placeholder="Hobby (English only) *"
                required
              />
              {validationErrors.hobby && (
                <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.hobby}</p>
              )}
            </div>

            {/* Relationship Status Radio Buttons */}
            <div>
              <div className="mb-2 text-white/60 text-xs sm:text-sm">Relationship Status *</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative flex bg-white/6 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden shadow-lg">
                  <input type="radio" name="relationship" id="single" value="single" checked={relationshipStatus === 'single'} onChange={(e) => setRelationshipStatus(e.target.value)} className="sr-only" />
                  <label htmlFor="single" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-3 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                    Single
                  </label>
                  
                  <input type="radio" name="relationship" id="in-relationship" value="in-relationship" checked={relationshipStatus === 'in-relationship'} onChange={(e) => setRelationshipStatus(e.target.value)} className="sr-only" />
                  <label htmlFor="in-relationship" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-3 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                    Dating
                  </label>

                  {/* Glider for first row */}
                  <motion.div
                    className="absolute top-0 bottom-0 rounded-xl sm:rounded-2xl z-[1]"
                    style={{
                      width: '50%',
                      background: relationshipStatus === 'single' 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.4))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.4))',
                      boxShadow: (relationshipStatus === 'single' || relationshipStatus === 'in-relationship')
                        ? '0 0 18px rgba(34, 197, 94, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)'
                        : 'none'
                    }}
                    animate={{
                      x: relationshipStatus === 'single' ? '0%' : relationshipStatus === 'in-relationship' ? '100%' : '0%',
                      opacity: (relationshipStatus === 'single' || relationshipStatus === 'in-relationship') ? 1 : 0
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                </div>

                <div className="relative flex bg-white/6 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden shadow-lg">
                  <input type="radio" name="relationship" id="married" value="married" checked={relationshipStatus === 'married'} onChange={(e) => setRelationshipStatus(e.target.value)} className="sr-only" />
                  <label htmlFor="married" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-3 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                    Married
                  </label>
                  
                  <input type="radio" name="relationship" id="divorced" value="divorced" checked={relationshipStatus === 'divorced'} onChange={(e) => setRelationshipStatus(e.target.value)} className="sr-only" />
                  <label htmlFor="divorced" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-3 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                    Divorced
                  </label>

                  {/* Glider for second row */}
                  <motion.div
                    className="absolute top-0 bottom-0 rounded-xl sm:rounded-2xl z-[1]"
                    style={{
                      width: '50%',
                      background: relationshipStatus === 'married' 
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.4))'
                        : 'linear-gradient(135deg, rgba(251, 146, 60, 0.4), rgba(249, 115, 22, 0.4))',
                      boxShadow: (relationshipStatus === 'married' || relationshipStatus === 'divorced')
                        ? '0 0 18px rgba(168, 85, 247, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)'
                        : 'none'
                    }}
                    animate={{
                      x: relationshipStatus === 'married' ? '0%' : relationshipStatus === 'divorced' ? '100%' : '0%',
                      opacity: (relationshipStatus === 'married' || relationshipStatus === 'divorced') ? 1 : 0
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <div className="relative flex bg-white/6 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden shadow-lg">
                    <input type="radio" name="relationship" id="complicated" value="complicated" checked={relationshipStatus === 'complicated'} onChange={(e) => setRelationshipStatus(e.target.value)} className="sr-only" />
                    <label htmlFor="complicated" className="flex-1 text-center py-2 sm:py-3 px-2 sm:px-3 cursor-pointer text-white/70 hover:text-white transition-colors font-medium text-xs sm:text-sm relative z-10">
                      It's Complicated
                    </label>

                    {/* Glider for third row */}
                    <motion.div
                      className="absolute top-0 bottom-0 rounded-xl sm:rounded-2xl z-[1]"
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(219, 39, 119, 0.4))',
                        boxShadow: relationshipStatus === 'complicated'
                          ? '0 0 18px rgba(236, 72, 153, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)'
                          : 'none'
                      }}
                      animate={{
                        opacity: relationshipStatus === 'complicated' ? 1 : 0
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Favorite Artist */}
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <input
                type="text"
                value={favoriteArtist}
                onChange={(e) => validateAndSetField('favoriteArtist', e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
                  validationErrors.favoriteArtist ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all`}
                placeholder="Favorite Artist (English only) *"
                required
              />
              {validationErrors.favoriteArtist && (
                <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.favoriteArtist}</p>
              )}
            </div>

            {/* Form Progress Indicator */}
            <div className="mt-4 sm:mt-6 mb-3 sm:mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Form Progress</span>
                <span>{Math.round((Object.values({firstName, lastName, email, phone, dob, height, gender, city, hobby, relationshipStatus, favoriteArtist}).filter(Boolean).length / 11) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 sm:h-2">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 sm:h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Object.values({firstName, lastName, email, phone, dob, height, gender, city, hobby, relationshipStatus, favoriteArtist}).filter(Boolean).length / 11) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Next button */}
            <motion.button
              whileHover={isFormValid ? { scale: 1.02 } : {}}
              whileTap={isFormValid ? { scale: 0.98 } : {}}
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all mt-4 sm:mt-6 ${
                isFormValid 
                  ? 'bg-white text-black hover:bg-white/90 cursor-pointer' 
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {isFormValid ? 'Next' : 'Please fill all fields'}
            </motion.button>
          </form>
          )}

          {/* Step 2: Facebook Connection and Photo Uploads */}
          {currentStep === 2 && (
          <div className="space-y-4 sm:space-y-6">
            {/* Facebook Connection */}
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Connect with Facebook</h3>
              {!facebookConnected ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFacebookConnect}
                  className="w-full py-3 sm:py-4 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all flex items-center justify-center space-x-2 sm:space-x-3"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Connect with Facebook</span>
                </motion.button>
              ) : (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 py-3 sm:py-4 bg-green-600/20 border border-green-500/30 rounded-lg sm:rounded-xl text-green-400">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-sm sm:text-base">Facebook Connected</span>
                </div>
              )}
            </div>

            {/* Private Photo Upload */}
            <div>
              <label className="block text-white/80 font-medium mb-2 sm:mb-3 text-sm sm:text-base">
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Private Photo (for spam check)</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePrivatePhotoUpload}
                  className="hidden"
                  id="private-photo"
                />
                <label
                  htmlFor="private-photo"
                  className="w-full min-h-[100px] sm:min-h-[120px] border-2 border-dashed border-white/20 rounded-lg sm:rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-all bg-white/5"
                >
                  {privatePhoto ? (
                    <div className="text-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-white/80 text-xs sm:text-sm">{privatePhoto.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white/50 mx-auto mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-white/60 text-xs sm:text-sm">Upload your personal photo</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Public Photo Upload */}
            <div>
              <label className="block text-white/80 font-medium mb-2 sm:mb-3 text-sm sm:text-base">
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Public Photo (for member card)</span>
                </span>
              </label>
              
              {/* Photo Upload */}
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePublicPhotoUpload}
                  className="hidden"
                  id="public-photo"
                />
                <label
                  htmlFor="public-photo"
                  className="w-full min-h-[80px] sm:min-h-[100px] border-2 border-dashed border-white/20 rounded-lg sm:rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-all bg-white/5"
                >
                  {publicPhoto ? (
                    <div className="text-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-white/80 text-xs">{publicPhoto.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/50 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-white/60 text-xs">Upload your photo</p>
                    </div>
                  )}
                </label>
              </div>
              </div>

            {/* Create Account Button */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2 sm:pt-4">
                  <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStep(1)}
                className="w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Back
              </motion.button>
              <motion.button
                whileHover={(facebookConnected && privatePhoto && publicPhoto) ? { scale: 1.02 } : {}}
                whileTap={(facebookConnected && privatePhoto && publicPhoto) ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (facebookConnected && privatePhoto && publicPhoto) {
                    setCurrentStep(3)
                  }
                }}
                disabled={!(facebookConnected && privatePhoto && publicPhoto)}
                className={`w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all ${
                  (facebookConnected && privatePhoto && publicPhoto)
                    ? 'bg-white text-black hover:bg-white/90 cursor-pointer' 
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                Next
              </motion.button>
            </div>
          </div>
          )}

          {/* Step 3: Email Verification */}
          {currentStep === 3 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-1 sm:mb-2">Check your email</h3>
              <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6">
                We sent a verification code to<br />
                <span className="text-white font-medium">{email}</span>
              </p>
            </div>

            {!isCodeSent ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendVerificationCode}
                className="w-full py-3 sm:py-4 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all"
              >
                Send Verification Code
              </motion.button>
            ) : (
              <>
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center text-white/80 text-xs sm:text-sm mb-3 sm:mb-4">Enter 4-digit verification code</div>
                  <div className="flex justify-center space-x-2 sm:space-x-3">
                    {verificationCode.map((digit, index) => (
                      <input
                    key={index}
                        id={`code-${index}`}
                        type="text"
                        value={digit}
                        onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                        className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-bold bg-white/10 border border-white/20 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all"
                        maxLength={1}
                      />
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-white/60 text-xs sm:text-sm">
                      Didn't receive the code?{' '}
                      <button
                        onClick={handleSendVerificationCode}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Resend
                      </button>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2 sm:pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    Back
                  </motion.button>
                  <motion.button
                    whileHover={verificationCode.every(digit => digit !== '') ? { scale: 1.02 } : {}}
                    whileTap={verificationCode.every(digit => digit !== '') ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (verificationCode.every(digit => digit !== '')) {
                        setCurrentStep(4)
                      }
                    }}
                    disabled={!verificationCode.every(digit => digit !== '')}
                    className={`w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all ${
                      verificationCode.every(digit => digit !== '')
                        ? 'bg-white text-black hover:bg-white/90 cursor-pointer' 
                        : 'bg-white/20 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    Verify
                  </motion.button>
                </div>
              </>
            )}
          </div>
          )}

          {/* Step 4: Set PIN Code */}
          {currentStep === 4 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-1 sm:mb-2">Set your PIN code</h3>
              <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6">
                Create a 6-digit PIN code to secure your account
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="text-center text-white/80 text-xs sm:text-sm mb-3 sm:mb-4">Enter 6-digit PIN code</div>
              <div className="flex justify-center space-x-1 sm:space-x-2">
                {pinCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${index}`}
                    type="password"
                    value={digit}
                    onChange={(e) => handlePinCodeChange(index, e.target.value)}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold bg-white/10 border border-white/20 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-purple-400 focus:bg-white/20 transition-all"
                    maxLength={1}
                    disabled={isGeneratingCard}
                  />
                ))}
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-xs">
                  This PIN will be used to access your account securely
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2 sm:pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStep(3)}
                disabled={isGeneratingCard}
                className="w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Back
              </motion.button>
              <motion.button
                whileHover={(pinCode.every(digit => digit !== '') && !isGeneratingCard) ? { scale: 1.02 } : {}}
                whileTap={(pinCode.every(digit => digit !== '') && !isGeneratingCard) ? { scale: 0.98 } : {}}
                onClick={handleCreateAccount}
                disabled={!pinCode.every(digit => digit !== '') || isGeneratingCard}
                className={`w-full sm:flex-1 py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  (pinCode.every(digit => digit !== '') && !isGeneratingCard)
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 cursor-pointer' 
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                {isGeneratingCard ? (
                  <>
                    <Loader />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </motion.button>
            </div>
          </div>
          )}

          {/* Member Card Display */}
          {currentStep === 5 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-medium text-white mb-1 sm:mb-2">
                {isGeneratingCard ? 'ကတ်ကို ပြုလုပ်နေပါတယ်...' : 'Account Created Successfully!'}
              </h3>
              <p className="text-white/60 text-xs mb-3 sm:mb-4">
                {isGeneratingCard ? 'ခေတ္တစောင့်ပေးပါ' : 'Your personalized member card is ready'}
              </p>
            </div>

            {/* Member Card Preview or Loader */}
            {isGeneratingCard ? (
              <div className="text-center">
                <div className="bg-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-3 sm:mb-4 min-h-[200px] flex items-center justify-center">
                  <Loader />
                </div>
              </div>
            ) : memberCardUrl && (
              <div className="text-center">
                {/* Glassmorphism Card */}
                <div 
                  className="relative mx-auto mb-4 cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 active:rotate-1 select-none"
                  style={{
                    width: 'min(288px, 90vw)',
                    height: 'min(192px, 60vw)',
                    background: 'rgba(217, 217, 217, 0.58)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '12px 17px 51px rgba(0, 0, 0, 0.22)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '17px'
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDownloadCard()
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.8)'
                    e.currentTarget.style.background = 'rgba(217, 217, 217, 0.7)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.background = 'rgba(217, 217, 217, 0.58)'
                  }}
                >
                  <div className="absolute inset-2 rounded-2xl overflow-hidden">
                    <img 
                      src={memberCardUrl} 
                      alt="Member Card" 
                      className="w-full h-full object-cover rounded-2xl pointer-events-none"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                  
                  {/* Download Indicator Overlay */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-300 rounded-[17px] flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-white/80">
                  <p>Name: <span className="text-white font-medium">{firstName} {lastName}</span></p>
                  <p>Zodiac: <span className="text-white font-medium">{zodiacSign}</span></p>
                  <p>Member ID: <span className="text-white font-medium">{pinCode.join('')}</span></p>
                  <p className="text-white/60 text-xs mt-2">
                    ✓ Using account data: {firstName} {lastName} | {publicPhoto ? 'Photo included' : 'No photo'}
                  </p>
                  
                  {/* Download Button */}
                  <div className="flex justify-center mt-4">
                    <StyledWrapper>
                      <button onClick={handleDownloadCard}>
                        <div className="svg-wrapper-1">
                          <div className="svg-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={30} height={30} className="icon">
                              <path d="M22,15.04C22,17.23 20.24,19 18.07,19H5.93C3.76,19 2,17.23 2,15.04C2,13.07 3.43,11.44 5.31,11.14C5.28,11 5.27,10.86 5.27,10.71C5.27,9.33 6.38,8.2 7.76,8.2C8.37,8.2 8.94,8.43 9.37,8.8C10.14,7.05 11.13,5.44 13.91,5.44C17.28,5.44 18.87,8.06 18.87,10.83C18.87,10.94 18.87,11.06 18.86,11.17C20.65,11.54 22,13.13 22,15.04Z" />
                            </svg>
                          </div>
                        </div>
                        <span>Save</span>
                      </button>
                    </StyledWrapper>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-400 text-xs font-medium">
                      Click button or card to download
                    </p>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}



            <div className="text-center">
              <p className="text-xs text-white/60">
                Keep your member card safe. You'll need it to access your account.
              </p>
            </div>
          </div>
          )}

          {/* Terms */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs text-white/60">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                Terms & Service
              </a>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Photo Crop Modal */}
      {showCropModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md mx-auto"
          >
            <div className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                ဓာတ်ပုံကို ချိန်ညှိပါ
              </h3>
              
              {/* Interactive Crop Area */}
              <div className="mb-6">
                <div 
                  className="relative mx-auto bg-white/10 rounded-xl overflow-hidden cursor-move select-none"
                  style={{ width: '240px', height: '360px' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {cropPreview && (
                    <img 
                      src={cropPreview} 
                      alt="Crop Preview" 
                      className="absolute pointer-events-none"
                      style={{
                        transform: `translate(${cropSettings.x}px, ${cropSettings.y}px) scale(${cropSettings.scale})`,
                        transformOrigin: 'center',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      draggable={false}
                    />
                  )}
                  
                  {/* Crop Overlay - Fixed 2:3 Frame */}
                  <div className="absolute inset-0 bg-black/40 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg">
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-white/80 text-xs font-medium">
                        2:3 Ratio
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleZoomOut}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </motion.button>
                  
                  <div className="text-white/60 text-xs min-w-[60px] text-center">
                    {Math.round(cropSettings.scale * 100)}%
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleZoomIn}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleResetCrop}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-all"
                  >
                    Reset
                  </motion.button>
                </div>
                
                <p className="text-white/60 text-xs text-center mt-3">
                  ပုံကို ဆွဲရွှေ့ပြီး zoom လုပ်ပြီး ချိန်ညှိပါ
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancelCrop}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  ပယ်ဖျက်
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCropPhoto}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all"
                >
                  သုံးမယ်
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
} 