import functions from '@google-cloud/functions-framework';
import Joi from 'joi';

// Validation schemas
const schemas = {
  firstName: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,50}$/)
    .required()
    .messages({
      'string.pattern.base': 'First name must contain only English letters, spaces, hyphens, apostrophes, and periods',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters'
    }),
    
  lastName: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,50}$/)
    .required()
    .messages({
      'string.pattern.base': 'Last name must contain only English letters, spaces, hyphens, apostrophes, and periods',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters'
    }),
    
  name: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,50}$/)
    .required()
    .messages({
      'string.pattern.base': 'Name must contain only English letters, spaces, hyphens, apostrophes, and periods',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters'
    }),
    
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address'
    }),
    
  phone: Joi.string()
    .pattern(/^\+?1?\s?\(?\d{3}\)?\s?[-.\s]?\d{3}[-.\s]?\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid US phone number'
    }),
    
  city: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,100}$/)
    .required()
    .messages({
      'string.pattern.base': 'City name must contain only English letters, spaces, hyphens, apostrophes, and periods'
    }),
    
  hobby: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,100}$/)
    .required()
    .messages({
      'string.pattern.base': 'Hobby must contain only English letters, spaces, hyphens, apostrophes, and periods'
    }),
    
  favoriteArtist: Joi.string()
    .pattern(/^[a-zA-Z\s\-'\.]{2,100}$/)
    .required()
    .messages({
      'string.pattern.base': 'Artist name must contain only English letters, spaces, hyphens, apostrophes, and periods'
    })
};

// Auto-formatting functions
const formatters = {
  formatPhoneNumber: (input) => {
    const cleaned = input.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return input;
  },
  
  formatEmail: (input) => {
    return input.toLowerCase().trim();
  },
  
  formatName: (input) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  },
  
  formatCity: (input) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  },
  
  sanitizeInput: (input) => {
    return input
      .replace(/[<>"'%;()&+]/g, '')
      .trim();
  }
};

// Rate limiting (in production, use Redis or Firestore)
const rateLimitMap = new Map();

const isRateLimited = (ip) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute
  
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
  return record.count > maxRequests;
};

const formValidation = (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    const { action, field, value, userData } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
        code: 'MISSING_ACTION'
      });
    }

    switch (action) {
      case 'validateField':
        return validateSingleField(field, value, res);
        
      case 'formatField':
        return formatSingleField(field, value, res);
        
      case 'validateAll':
        return validateAllFields(userData, res);
        
      case 'validateAndFormat':
        return validateAndFormatField(field, value, res);
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          code: 'INVALID_ACTION'
        });
    }

  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const validateSingleField = (field, value, res) => {
  if (!field || value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Field name and value are required',
      code: 'MISSING_PARAMETERS'
    });
  }

  const schema = schemas[field];
  if (!schema) {
    return res.status(400).json({
      success: false,
      error: 'Invalid field name',
      code: 'INVALID_FIELD'
    });
  }

  const { error } = schema.validate(value);
  
  if (error) {
    return res.json({
      success: false,
      field,
      valid: false,
      error: error.details[0].message,
      code: 'VALIDATION_FAILED'
    });
  }

  return res.json({
    success: true,
    field,
    valid: true,
    message: 'Field is valid'
  });
};

const formatSingleField = (field, value, res) => {
  if (!field || value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Field name and value are required',
      code: 'MISSING_PARAMETERS'
    });
  }

  // Sanitize first
  const sanitized = formatters.sanitizeInput(value);
  
  let formatted = sanitized;
  
  switch (field) {
    case 'firstName':
    case 'lastName':
      formatted = formatters.formatName(sanitized);
      break;
    case 'email':
      formatted = formatters.formatEmail(sanitized);
      break;
    case 'phone':
      formatted = formatters.formatPhoneNumber(sanitized);
      break;
    case 'city':
      formatted = formatters.formatCity(sanitized);
      break;
    default:
      // For hobby and favoriteArtist, just sanitize
      formatted = sanitized;
  }

  return res.json({
    success: true,
    field,
    original: value,
    formatted,
    sanitized
  });
};

const validateAndFormatField = (field, value, res) => {
  // First format
  const formatResult = formatField(field, value);
  const formattedValue = formatResult.formatted;
  
  // Then validate
  const schema = schemas[field];
  if (!schema) {
    return res.status(400).json({
      success: false,
      error: 'Invalid field name',
      code: 'INVALID_FIELD'
    });
  }

  const { error } = schema.validate(formattedValue);
  
  return res.json({
    success: true,
    field,
    original: value,
    formatted: formattedValue,
    valid: !error,
    error: error ? error.details[0].message : null
  });
};

const validateAllFields = (userData, res) => {
  if (!userData || typeof userData !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'User data object is required',
      code: 'MISSING_USER_DATA'
    });
  }

  const results = {};
  const errors = {};
  let hasErrors = false;

  // Validate each field
  Object.keys(schemas).forEach(field => {
    if (userData[field] !== undefined) {
      const { error } = schemas[field].validate(userData[field]);
      
      results[field] = {
        valid: !error,
        error: error ? error.details[0].message : null
      };
      
      if (error) {
        errors[field] = error.details[0].message;
        hasErrors = true;
      }
    } else {
      results[field] = {
        valid: false,
        error: 'Field is required'
      };
      errors[field] = 'Field is required';
      hasErrors = true;
    }
  });

  return res.json({
    success: !hasErrors,
    valid: !hasErrors,
    results,
    errors: hasErrors ? errors : null,
    message: hasErrors ? 'Some fields have validation errors' : 'All fields are valid'
  });
};

const formatField = (field, value) => {
  const sanitized = formatters.sanitizeInput(value);
  
  switch (field) {
    case 'firstName':
    case 'lastName':
      return { formatted: formatters.formatName(sanitized) };
    case 'email':
      return { formatted: formatters.formatEmail(sanitized) };
    case 'phone':
      return { formatted: formatters.formatPhoneNumber(sanitized) };
    case 'city':
      return { formatted: formatters.formatCity(sanitized) };
    default:
      return { formatted: sanitized };
  }
};

// Register the HTTP function
functions.http('formValidation', formValidation); 