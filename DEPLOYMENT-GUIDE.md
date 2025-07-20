# 🚀 Production Deployment Guide

Complete guide for deploying both Backend Services and Frontend Web Application to production.

## 📋 Quick Commands

### Full Production Deployment
```bash
# Deploy everything (Backend + Frontend)
npm run deploy
# or
./production-deploy.sh
```

### Individual Deployments
```bash
# Deploy only backend services
npm run deploy:backend
# or
./deploy-backend.sh

# Deploy only frontend web app
npm run deploy:frontend
# or 
./deploy-frontend.sh
```

## 🔧 Prerequisites

### Required Software
- **Node.js** v20 or higher
- **npm** v10 or higher
- **Google Cloud CLI** (gcloud)
- **Firebase CLI** (optional, for Firebase hosting)

### Required Accounts & Setup
- Google Cloud Platform account
- Firebase project (optional)
- Netlify account (optional)

### Authentication
```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project dev-splicer-463021-u3

# Login to Firebase (if using Firebase hosting)
firebase login
```

## ⚙️ Environment Setup

### 1. Create Production Environment File
```bash
# Copy template
cp production.env.example .env.production

# Edit with your actual API keys
nano .env.production
```

### 2. Required Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=https://dev-splicer-463021-u3.uc.r.appspot.com

# Facebook Authentication
VITE_FACEBOOK_APP_ID=your_facebook_app_id

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Placid API
VITE_PLACID_API_KEY=your_placid_api_key
```

## 🔧 Backend Deployment

### What Gets Deployed
1. **Form Validation** Cloud Function
2. **Member Auth** Cloud Function  
3. **Email Service** App Engine

### Backend Deployment Command
```bash
./deploy-backend.sh
```

### Backend Endpoints After Deployment
- **Form Validation**: `https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/form-validation`
- **Member Auth**: `https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/member-auth`
- **Email Service**: `https://dev-splicer-463021-u3.uc.r.appspot.com`

## 🌐 Frontend Deployment

### Deployment Options
The frontend can be deployed to multiple platforms:

1. **Firebase Hosting** (Recommended)
2. **Netlify**
3. **Google Cloud Storage**

### Frontend Deployment Command
```bash
./deploy-frontend.sh
```

### Choose Your Platform
When you run the script, you'll be prompted to choose:
```
Choose deployment target:
1) Firebase Hosting
2) Netlify
3) Google Cloud Storage
4) Local preview only
```

## 🚀 Complete Deployment Process

### Step 1: Full Deployment
```bash
# Run complete deployment
./production-deploy.sh
```

### Step 2: Follow Prompts
The script will guide you through:
1. ✅ Prerequisites check
2. ✅ Environment setup
3. ✅ Backend deployment
4. ✅ Backend testing
5. ✅ Frontend build
6. ✅ Frontend deployment
7. ✅ Verification

### Step 3: Verification
After deployment, test:
- [ ] Frontend loads correctly
- [ ] Facebook authentication works
- [ ] Email verification sends emails
- [ ] Member card generation works
- [ ] Form validation functions

## 🔍 Troubleshooting

### Common Issues

#### Backend Deployment Fails
```bash
# Check authentication
gcloud auth list

# Check project
gcloud config get project

# Check billing
gcloud billing accounts list
```

#### Frontend Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check environment
cat .env.production

# Manual build
npm run build:prod
```

#### API Endpoints Not Working
```bash
# Test endpoints
curl -X POST "https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/form-validation" \
  -H "Content-Type: application/json" \
  -d '{"action": "validateField", "field": "name", "value": "test"}'
```

### Deployment Logs
Check deployment logs in:
- **Google Cloud Console**: Functions & App Engine logs
- **Firebase Console**: Hosting deployment history
- **Netlify Dashboard**: Deployment logs

## 📊 Post-Deployment Checklist

### Immediate Testing
- [ ] Visit deployed frontend URL
- [ ] Test user registration flow
- [ ] Test member card generation
- [ ] Test email verification
- [ ] Test Facebook authentication
- [ ] Check mobile responsiveness

### Monitoring Setup
- [ ] Set up error monitoring
- [ ] Configure performance alerts
- [ ] Monitor API usage quotas
- [ ] Set up uptime monitoring

### Security Verification
- [ ] Check HTTPS is enforced
- [ ] Verify API keys are working
- [ ] Test CORS configuration
- [ ] Validate security headers

## 🛠️ Manual Deployment (Alternative)

### Backend Only
```bash
cd backend

# Deploy Cloud Functions
gcloud functions deploy form-validation --runtime nodejs20 --trigger-http --allow-unauthenticated --region asia-southeast1
gcloud functions deploy member-auth --runtime nodejs20 --trigger-http --allow-unauthenticated --region asia-southeast1

# Deploy App Engine
cd functions/email-service
gcloud app deploy app.yaml
```

### Frontend Only
```bash
# Build
npm run build:prod

# Deploy to Firebase
firebase deploy --only hosting

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 📞 Support

### Getting Help
1. **Check Logs**: Google Cloud Console, Firebase Console
2. **Verify Environment**: `.env.production` file
3. **Test Locally**: `npm run preview:prod`
4. **Check Documentation**: `PRODUCTION.md`

### Contact
- Check GitHub issues for common problems
- Review deployment script logs
- Verify all prerequisites are met

---

## 🎉 Success!

After successful deployment:

**Your Member Card System is live at:**
- **Frontend**: Choose from Firebase, Netlify, or GCS URL
- **Backend APIs**: Google Cloud Functions and App Engine

**Next Steps:**
1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up automated backups
4. Plan regular maintenance schedule

**Production အတွက် deployment အောင်မြင်ပါပြီ! 🚀** 