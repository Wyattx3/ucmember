# Email Verification Service

Production-ready email verification service using Resend API for the Member Card System.

## Features

- ✉️ **Resend API Integration** - Professional email delivery
- 🔐 **Secure Verification Codes** - 4-digit codes with 10-minute expiry
- 🛡️ **Rate Limiting** - 3 emails per minute per email address
- 📱 **Beautiful HTML Emails** - Responsive design with Member Card branding
- 🔄 **Attempt Limiting** - Maximum 5 verification attempts
- 🗄️ **Firestore Integration** - Persistent code storage
- 🚀 **Google Cloud Functions** - Serverless deployment

## API Endpoints

### Send Verification Code
```bash
POST /email-service
Content-Type: application/json

{
  "action": "sendVerificationCode",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "emailId": "email-id-from-resend",
  "expiresIn": 10
}
```

### Verify Code
```bash
POST /email-service
Content-Type: application/json

{
  "action": "verifyCode",
  "email": "user@example.com",
  "code": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "email": "user@example.com"
}
```

## Error Codes

- `EMAIL_RATE_LIMITED` - Too many emails sent
- `INVALID_EMAIL` - Invalid email format
- `CODE_EXPIRED` - Verification code expired
- `INVALID_CODE` - Wrong verification code
- `TOO_MANY_ATTEMPTS` - Maximum attempts exceeded
- `ALREADY_VERIFIED` - Email already verified

## Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Deploy to Google Cloud:**
   ```bash
   ./deploy.sh
   ```

3. **Test the Service:**
   ```bash
   curl -X POST \
     "https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/email-service" \
     -H "Content-Type: application/json" \
     -d '{"action":"sendVerificationCode","email":"test@example.com","firstName":"Test","lastName":"User"}'
   ```

## Environment Variables

- `RESEND_API_KEY` - Resend API key for email sending
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID
- `NODE_ENV` - Environment (production/development)

## Security Features

1. **Rate Limiting** - Prevents email spam
2. **Code Expiry** - 10-minute automatic expiration
3. **Attempt Limiting** - Maximum 5 verification attempts
4. **Input Validation** - Email format and required field validation
5. **CORS Protection** - Proper CORS headers

## Email Template

The service sends beautifully designed HTML emails with:
- Member Card branding
- Responsive design
- Clear verification code display
- Security warnings
- Professional styling

## Integration

Update your frontend environment variables:
```bash
VITE_EMAIL_SERVICE_URL=https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/email-service
```

## Monitoring

Monitor the service through Google Cloud Console:
- Function logs
- Error rates
- Performance metrics
- Resend delivery status 