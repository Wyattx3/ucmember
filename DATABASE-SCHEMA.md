# Database Schema Documentation

## 🗄️ Database Overview

Member Card System က **Google Cloud Firestore** ကို NoSQL database အဖြစ် အသုံးပြုပါတယ်။ Firestore သည် real-time database တစ်ခုဖြစ်ပြီး auto-scaling နဲ့ high availability လုပ်ဆောင်နိုင်ပါတယ်။

### Database Configuration
- **Database Type:** Google Cloud Firestore (NoSQL)
- **Mode:** Native mode 
- **Location:** asia-southeast1 (Singapore)
- **Project:** dev-splicer-463021-u3

## 📊 Collections Structure

### 1. `users` Collection

Member registration နဲ့ authentication အတွက် user data သိမ်းဆည်းတဲ့ main collection ဖြစ်ပါတယ်။

#### Document Schema:
```javascript
{
  // User identification
  "email": "string",                    // Unique email address
  "firstName": "string",                // User's first name
  "lastName": "string",                 // User's last name
  
  // Personal information
  "phone": "string",                    // Formatted phone number
  "dob": "string",                      // Date of birth (YYYY-MM-DD)
  "height": "string",                   // Height information
  "gender": "string",                   // Gender selection
  "city": "string",                     // City of residence
  "hobby": "string",                    // Primary hobby
  "relationshipStatus": "string",       // Relationship status
  "favoriteArtist": "string",          // Favorite artist name
  "zodiacSign": "string",              // Zodiac sign
  
  // Security
  "hashedPin": "string",               // bcrypt hashed PIN (12 salt rounds)
  
  // Member card
  "memberCardUrl": "string",           // URL to generated member card
  
  // Metadata
  "createdAt": "timestamp",            // Registration date
  "updatedAt": "timestamp",            // Last modification date
  "isActive": "boolean"                // Account status
}
```

#### Example Document:
```javascript
{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "(555) 123-4567",
  "dob": "1990-01-15",
  "height": "5'10\"",
  "gender": "Male",
  "city": "New York",
  "hobby": "Photography",
  "relationshipStatus": "Single",
  "favoriteArtist": "Taylor Swift",
  "zodiacSign": "Capricorn",
  "hashedPin": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuAqv6gEcdB.rFBzKZjQy",
  "memberCardUrl": "https://storage.googleapis.com/bucket/cards/card_12345.png",
  "createdAt": "2025-01-15T08:30:00.000Z",
  "updatedAt": "2025-01-15T08:30:00.000Z",
  "isActive": true
}
```

#### Indexes:
- **Primary Index:** `email` (unique identifier)
- **Composite Index:** `email + isActive` (for active user lookup)

### 2. `email_verifications` Collection

Email verification process အတွက် temporary verification codes သိမ်းဆည်းတဲ့ collection ဖြစ်ပါတယ်။

#### Document Schema:
```javascript
{
  "email": "string",                   // Target email address
  "code": "string",                    // 4-digit verification code
  "firstName": "string",               // User's first name for email
  "lastName": "string",                // User's last name for email
  "createdAt": "timestamp",            // Code generation time
  "expiresAt": "timestamp",            // Code expiration time (10 minutes)
  "attempts": "number",                // Number of verification attempts
  "verified": "boolean"                // Verification status
}
```

#### Example Document:
```javascript
{
  "email": "john.doe@example.com",
  "code": "1234",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2025-01-15T08:25:00.000Z",
  "expiresAt": "2025-01-15T08:35:00.000Z",
  "attempts": 0,
  "verified": false
}
```

#### Indexes:
- **Primary Index:** `email`
- **Composite Index:** `email + verified + createdAt` (for finding latest unverified codes)

#### TTL (Time To Live):
- Documents automatically deleted after 24 hours
- Cleanup handled by Cloud Functions scheduler

## 🔧 Database Operations

### Backend Services Database Usage

#### 1. Member Auth Function (`memberAuth`)

**User Registration:**
```javascript
// Check if user exists
const existingUser = await firestore
  .collection('users')
  .where('email', '==', userData.email)
  .get();

// Create new user
const docRef = await firestore.collection('users').add(userDoc);
```

**User Login:**
```javascript
// Find user by email
const userQuery = await firestore
  .collection('users')
  .where('email', '==', email)
  .get();
```

**Token Verification:**
```javascript
// Get user by ID
const userDoc = await firestore.collection('users').doc(userId).get();
```

#### 2. Email Service Function (`email-service`)

**Send Verification Code:**
```javascript
// Store verification code
const docRef = await firestore.collection('email_verifications').add(verificationDoc);
```

**Verify Code:**
```javascript
// Find pending verification
const snapshot = await firestore.collection('email_verifications')
  .where('email', '==', email)
  .where('verified', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get();

// Update verification status
await doc.ref.update({
  verified: true,
  attempts: data.attempts + 1
});
```

## 🔒 Security Rules

### Current Security Model
- **Backend-only access:** Firestore အကြောင်း frontend ကနေ direct access မရှိပါ
- **Service Account Authentication:** Cloud Functions တွေက service account သုံးပြီး access လုပ်ပါတယ်
- **API Gateway Pattern:** Frontend က REST APIs တဆင့်ပဲ data access လုပ်ပါတယ်

### Recommended Firestore Rules (Optional)
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - read/write only via backend
    match /users/{userId} {
      allow read, write: if false; // Backend only
    }
    
    // Email verifications - backend only
    match /email_verifications/{verificationId} {
      allow read, write: if false; // Backend only
    }
  }
}
```

## 📈 Performance Optimization

### Indexing Strategy
1. **Email Indexes:** Fast user lookup by email
2. **Composite Indexes:** Efficient query filtering
3. **Timestamp Indexes:** Chronological data retrieval

### Query Optimization
```javascript
// Efficient user lookup
firestore.collection('users').where('email', '==', email)

// Latest verification code
firestore.collection('email_verifications')
  .where('email', '==', email)
  .where('verified', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(1)
```

## 🗂️ Data Management

### Backup Strategy
- **Automatic Backups:** Google Cloud automatic daily backups
- **Export/Import:** Cloud Functions for data export
- **Point-in-time Recovery:** Available for last 7 days

### Data Retention
- **User Data:** Permanent until account deletion
- **Verification Codes:** Auto-deleted after 24 hours
- **Audit Logs:** Retained for 90 days

## 🔍 Monitoring & Analytics

### Database Metrics
- **Read/Write Operations:** Monitor via GCP Console
- **Query Performance:** Index usage and optimization
- **Storage Usage:** Document count and size tracking
- **Error Rates:** Failed operations monitoring

### Health Checks
```javascript
// Database connectivity check
const healthCheck = async () => {
  try {
    await firestore.collection('users').limit(1).get();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

## 🛡️ Data Privacy & Compliance

### Personal Data Protection
- **Email Encryption:** Stored as plain text (required for verification)
- **PIN Security:** bcrypt hashed with 12 salt rounds
- **PII Handling:** Minimal data collection principle

### GDPR Compliance Features
- **Data Export:** User data export functionality
- **Right to Deletion:** Account deletion with data cleanup
- **Data Minimization:** Only necessary fields collected

## 🚀 Database Setup & Deployment

### Initial Setup
```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com

# Initialize Firestore in Native mode
gcloud firestore databases create --region=asia-southeast1
```

### Connection Configuration
```javascript
// Backend connection (automatic with service account)
import { Firestore } from '@google-cloud/firestore';
const firestore = new Firestore();
```

### Environment Variables
```env
# In Cloud Functions environment
GOOGLE_CLOUD_PROJECT=dev-splicer-463021-u3
FIRESTORE_EMULATOR_HOST=localhost:8080  # For local development
```

## 📊 Database Statistics

### Current Usage (Production)
- **Total Collections:** 2 (users, email_verifications)
- **Estimated Documents:** ~100 users, ~50 verifications/day
- **Storage Usage:** ~10MB (estimated)
- **Read Operations:** ~500/day
- **Write Operations:** ~200/day

### Scaling Projections
- **1,000 Users:** ~50MB storage, ~5K operations/day
- **10,000 Users:** ~500MB storage, ~50K operations/day
- **100,000 Users:** ~5GB storage, ~500K operations/day

## 🔧 Development & Testing

### Local Development
```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Set emulator environment
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Test Data Setup
```javascript
// Sample test data creation
const createTestUser = async () => {
  await firestore.collection('users').add({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    // ... other fields
    createdAt: new Date(),
    isActive: true
  });
};
```

## 📞 Troubleshooting

### Common Issues

#### Connection Problems
```javascript
// Check service account permissions
gcloud auth application-default print-access-token

// Verify project ID
gcloud config get project
```

#### Query Performance
```javascript
// Add composite index for complex queries
// Via GCP Console: Firestore → Indexes → Create Index
```

#### Data Inconsistency
```javascript
// Batch writes for data consistency
const batch = firestore.batch();
batch.set(docRef1, data1);
batch.set(docRef2, data2);
await batch.commit();
```

## 🎯 Best Practices

### Document Design
1. **Flat Structure:** Avoid deep nesting
2. **Atomic Updates:** Use transactions for consistency
3. **Efficient Queries:** Design for query patterns
4. **Data Validation:** Validate before write operations

### Security Best Practices
1. **Backend-only Access:** No direct client access
2. **Input Validation:** Sanitize all inputs
3. **Rate Limiting:** Prevent abuse
4. **Error Handling:** Don't expose internal errors

---

## 📋 Summary

Firestore database က Member Card System ရဲ့ core data storage layer ဖြစ်ပြီး:

- **2 Main Collections:** `users` နဲ့ `email_verifications`
- **Secure Access Pattern:** Backend-only access via Cloud Functions
- **Auto-scaling:** Google Cloud ရဲ့ managed service
- **Real-time Capability:** Live data updates (future feature)
- **Backup & Recovery:** Automatic daily backups

**Database Status:** ✅ Production Ready & Operational

**Live Database:** `dev-splicer-463021-u3` project ရဲ့ Firestore

**Last Updated:** July 20, 2025 