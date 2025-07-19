import { useState, useEffect, useRef } from 'react'
import { ValidationUtils } from '../utils/validation'

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

// Load Google Maps API script
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps API'))
    document.head.appendChild(script)
  })
}

export default function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter city name",
  className = "",
  required = false 
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          console.warn('Google Maps API key not found')
          return
        }

        await loadGoogleMapsScript(apiKey)
        
        autocompleteRef.current = new google.maps.places.AutocompleteService()
        geocoderRef.current = new google.maps.Geocoder()
      } catch (error) {
        console.error('Failed to initialize Google Places:', error)
        setError('City autocomplete service unavailable')
      }
    }

    initializeGooglePlaces()
  }, [])

  const handleInputChange = async (inputValue: string) => {
    const sanitized = ValidationUtils.sanitizeInput(inputValue)
    const formatted = ValidationUtils.formatCity(sanitized)
    
    // Validate English only
    if (sanitized && !ValidationUtils.isEnglishOnly(sanitized)) {
      setError('Please use English characters only')
      onChange(sanitized) // Still update the value
      return
    }

    setError('')
    onChange(formatted)

    if (sanitized.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (!autocompleteRef.current) {
      return
    }

    setIsLoading(true)
    
    try {
      const request = {
        input: sanitized,
        types: ['(cities)']
        // No country restrictions - worldwide cities
      }

      autocompleteRef.current.getPlacePredictions(request, (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
        setIsLoading(false)
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const cityNames = predictions
            .map((prediction: google.maps.places.AutocompletePrediction) => {
              // Extract city name from description
              const parts = prediction.description.split(',')
              return parts[0].trim()
            })
            .filter((city: string, index: number, array: string[]) => array.indexOf(city) === index) // Remove duplicates
            .slice(0, 5) // Limit to 5 suggestions

          setSuggestions(cityNames)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      })
    } catch (error) {
      console.error('Google Places API error:', error)
      setIsLoading(false)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (city: string) => {
    const formatted = ValidationUtils.formatCity(city)
    onChange(formatted)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicking
    setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }

  const isValid = !value || ValidationUtils.isValidCity(value)

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/5 border ${
            error 
              ? 'border-red-500/50' 
              : isValid 
                ? 'border-white/10 focus:border-white/30' 
                : 'border-yellow-500/50'
          } rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all ${className}`}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>
      )}

      {/* Validation message */}
      {!error && value && !isValid && (
        <p className="text-yellow-400 text-xs mt-1 ml-1">Please enter a valid city name</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
          {suggestions.map((city, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(city)}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors text-sm border-b border-white/5 last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{city}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// TypeScript declarations for Google Maps
/// <reference types="google.maps" />

declare global {
  interface Window {
    google: typeof google
  }
} 