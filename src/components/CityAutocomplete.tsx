import { useState, useEffect, useRef } from 'react'
import { ValidationUtils } from '../utils/validation'

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

// Popular world cities as fallback
const POPULAR_CITIES = [
  'New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Singapore', 'Bangkok', 'Seoul',
  'Hong Kong', 'Dubai', 'Mumbai', 'Delhi', 'Shanghai', 'Beijing', 'Toronto', 'Vancouver',
  'Los Angeles', 'San Francisco', 'Chicago', 'Miami', 'Berlin', 'Amsterdam', 'Madrid',
  'Barcelona', 'Rome', 'Milan', 'Moscow', 'Istanbul', 'Cairo', 'Johannesburg',
  'Yangon', 'Mandalay', 'Naypyidaw', 'Bagan', 'Taunggyi', 'Mawlamyine', 'Pathein'
];

// Load Google Maps API script
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    
    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 100)
    
    script.onload = () => {
      // Additional check on load
      setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 500)
    }
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API script')
      clearInterval(checkInterval)
      reject(new Error('Failed to load Google Maps API'))
    }
    
    // Timeout for API loading
    setTimeout(() => {
      clearInterval(checkInterval)
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        reject(new Error('Google Maps API loading timeout after 5 seconds'))
      }
    }, 5000)
    
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
  const [useGoogleMaps, setUseGoogleMaps] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        
        // Check if API key is properly configured
        if (!apiKey || 
            apiKey === 'your_google_maps_api_key_here' || 
            apiKey === 'AIzaSyBvOkBrXXXXXXXXXXXXXXXXXXXXXXX' ||
            apiKey.includes('XXXXXX')) {
          console.info('Google Maps API key not configured - using fallback city list')
          setUseGoogleMaps(false)
          setError('')
          return
        }

        await loadGoogleMapsScript(apiKey)
        
        autocompleteRef.current = new google.maps.places.AutocompleteService()
        geocoderRef.current = new google.maps.Geocoder()
        setUseGoogleMaps(true)
        
        // Clear any previous errors
        setError('')
        console.info('Google Maps API initialized successfully')
      } catch (error) {
        console.warn('Google Maps API failed to initialize, using fallback:', error)
        setUseGoogleMaps(false)
        setError('')
      }
    }

    initializeGooglePlaces()
  }, [])

  // Fallback city search (without Google Maps API)
  const searchCitiesFallback = (searchTerm: string) => {
    const filtered = POPULAR_CITIES.filter(city =>
      city.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }

  // Google Maps API search
  const searchCitiesWithGoogle = (searchTerm: string) => {
    if (!autocompleteRef.current) {
      console.error('AutocompleteService not initialized')
      setIsLoading(false)
      // Fall back to simple search
      searchCitiesFallback(searchTerm)
      return
    }

    const request = {
      input: searchTerm,
      types: ['(cities)']
    }

    // Set a timeout for the API call
    const apiTimeout = setTimeout(() => {
      setIsLoading(false)
      console.warn('Google Places API timeout, falling back to city list')
      // Instead of showing error, fall back to simple search
      searchCitiesFallback(searchTerm)
    }, 3000) // 3 second timeout

    autocompleteRef.current.getPlacePredictions(request, (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
      clearTimeout(apiTimeout)
      setIsLoading(false)
      
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        const cityNames = predictions
          .map((prediction: google.maps.places.AutocompletePrediction) => {
            const parts = prediction.description.split(',')
            return parts[0].trim()
          })
          .filter((city: string, index: number, array: string[]) => array.indexOf(city) === index)
          .slice(0, 5)

        setSuggestions(cityNames)
        setShowSuggestions(true)
      } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        setSuggestions([])
        setShowSuggestions(false)
      } else {
        console.warn('Google Places API error, falling back to city list:', status)
        // Fall back to simple search instead of showing error
        searchCitiesFallback(searchTerm)
      }
    })
  }

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (inputValue.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      const sanitized = ValidationUtils.sanitizeInput(inputValue)
      
      if (useGoogleMaps) {
        searchCitiesWithGoogle(sanitized)
      } else {
        searchCitiesFallback(sanitized)
        setIsLoading(false)
      }
    }, 300)
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
        />
        
        {isLoading && (
          <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white/50"></div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      {!useGoogleMaps && (
        <div className="text-xs text-white/40 mt-1 ml-1">
          Using popular cities list
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-400 mt-1 ml-1">
          {error}
        </div>
      )}

      {/* Validation message */}
      {value && !isValid && (
        <div className="text-xs text-yellow-400 mt-1 ml-1">
          Please enter a valid city name
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg sm:rounded-xl shadow-lg">
          {suggestions.map((city, index) => (
            <div
              key={index}
              className="px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-white/10 cursor-pointer transition-all duration-200 first:rounded-t-lg first:sm:rounded-t-xl last:rounded-b-lg last:sm:rounded-b-xl"
              onClick={() => handleSuggestionClick(city)}
            >
              <div className="flex items-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/40 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {city}
              </div>
            </div>
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