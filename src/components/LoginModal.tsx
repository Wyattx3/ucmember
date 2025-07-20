import { useState } from 'react'
import { motion } from 'framer-motion'
import Loader from './Loader'
import { SteganographyService } from '../utils/steganography'
import { apiService } from '../services/api'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (userData: { email: string; name: string }) => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [loginStep, setLoginStep] = useState(1)
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<any>(null)

  const handleMemberCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setError('')
      setIsLoading(true)

      try {
        // Convert file to URL for steganography processing
        const imageUrl = URL.createObjectURL(file)
        
        // Extract login data from member card
        const hiddenData = await SteganographyService.decodeUserData(imageUrl)
        
        if (hiddenData) {
          // Successfully extracted login data
          console.log('Extracted member card data:', {
            email: hiddenData.email,
            name: hiddenData.name,
            accountId: hiddenData.accountId,
            zodiacSign: hiddenData.zodiacSign
          });
          
          setExtractedData(hiddenData)
          setLoginStep(2) // Move to PIN entry step
        } else {
          setError('Invalid member card - no login data found')
        }
        
        // Clean up URL
        URL.revokeObjectURL(imageUrl)
        
      } catch (error) {
        console.error('Failed to extract login data:', error)
        setError('Failed to read member card data')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handlePinChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pin]
      newPin[index] = value
      setPin(newPin)
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`login-pin-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleLogin = async () => {
    if (!extractedData || pin.some(digit => digit === '')) {
      setError('Please complete PIN entry')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const enteredPin = pin.join('')
      
      // Verify PIN matches the one stored in steganography
      if (enteredPin !== extractedData.pin) {
        setError('Incorrect PIN code')
        setIsLoading(false)
        return
      }

      // Login with backend using extracted data
      const loginResult = await apiService.loginWithMemberCard(extractedData, enteredPin)
      
      if (loginResult.success && loginResult.user) {
        onLoginSuccess({
          email: loginResult.user.email,
          name: loginResult.user.name
        })
      } else {
        setError(loginResult.error || 'Login failed')
      }
      
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setLoginStep(1)
    setPin(['', '', '', '', '', ''])
    setError('')
    setExtractedData(null)
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md mx-auto"
      >
        {/* Glass morphism card */}
        <div 
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
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
              {loginStep === 1 ? 'Login with Member Card' : 'Enter PIN Code'}
            </h2>

            <div className="space-y-6">
              {loginStep === 1 && (
                <div>
                  <label className="block text-white/80 font-medium mb-3 text-sm">
                    <span className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-4 0v2m4-2v2" />
                      </svg>
                      <span>Member Card</span>
                    </span>
                  </label>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMemberCardUpload}
                      className="hidden"
                      id="member-card"
                    />
                    <label
                      htmlFor="member-card"
                      className="w-full min-h-[120px] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-all bg-white/5"
                    >
                      {isLoading ? (
                        <div className="text-center">
                          <Loader />
                          <p className="text-white/60 text-sm mt-2">Reading member card...</p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-white/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-white/60 text-sm">Upload your member card</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {loginStep === 2 && extractedData && (
                <>
                  {/* Show extracted member card info */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-medium text-sm mb-2">Member Card Detected</h3>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>Name: <span className="text-white">{extractedData.name}</span></p>
                      <p>Email: <span className="text-white">{extractedData.email}</span></p>
                      <p>Account ID: <span className="text-white">{extractedData.accountId}</span></p>
                      <p>Zodiac: <span className="text-white">{extractedData.zodiacSign}</span></p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center text-white/80 text-sm">Enter your 6-digit PIN</div>
                    <div className="flex justify-center space-x-2">
                      {pin.map((digit, index) => (
                        <input
                          key={index}
                          id={`login-pin-${index}`}
                          type="password"
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          className="w-12 h-12 text-center text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:bg-white/20 transition-all"
                          maxLength={1}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {loginStep === 2 && (
                  <button
                    onClick={handleReset}
                    className="w-full py-3 text-sm font-semibold rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    Use Different Card
                  </button>
                )}

                {/* Login Button */}
                {(loginStep === 1 || (loginStep === 2 && pin.every(d => d !== ''))) && (
                  <motion.button
                    whileHover={(!isLoading && (loginStep === 1 || pin.every(d => d !== ''))) ? { scale: 1.02 } : {}}
                    whileTap={(!isLoading && (loginStep === 1 || pin.every(d => d !== ''))) ? { scale: 0.98 } : {}}
                    onClick={loginStep === 2 ? handleLogin : undefined}
                    disabled={isLoading || (loginStep === 2 && pin.some(d => d === ''))}
                    className={`w-full py-4 text-base font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 ${
                      (!isLoading && (loginStep === 1 || pin.every(d => d !== '')))
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 cursor-pointer' 
                        : 'bg-white/20 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader />
                        <span>{loginStep === 1 ? 'Reading Card...' : 'Logging in...'}</span>
                      </>
                    ) : (
                      <span>{loginStep === 1 ? 'Upload Member Card' : 'Login'}</span>
                    )}
                  </motion.button>
                )}
              </div>

              {/* Create Account Link */}
              <div className="text-center">
                <p className="text-white/60 text-sm">
                  Don't have a member card?{' '}
                  <button
                    onClick={onClose}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 