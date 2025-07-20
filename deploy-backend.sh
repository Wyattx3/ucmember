#!/bin/bash

# Backend Services Production Deployment Script
# Deploys Cloud Functions and App Engine services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GCP_PROJECT="dev-splicer-463021-u3"
GCP_REGION="asia-southeast1"

echo -e "${CYAN}🔧 Backend Services Production Deployment${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI is not installed"
    exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    print_error "Not authenticated with Google Cloud"
    print_info "Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $GCP_PROJECT
print_status "Using GCP project: $GCP_PROJECT"

# Enter backend directory
cd backend

# Install dependencies
print_info "Installing backend dependencies..."
npm install

print_info "Deploying Cloud Functions..."

# Deploy Form Validation Function
print_info "Deploying Form Validation function..."
cd functions/validation
npm install
gcloud functions deploy form-validation \
    --runtime nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --region $GCP_REGION \
    --memory 256MB \
    --timeout 30s \
    --set-env-vars NODE_ENV=production

print_status "Form Validation function deployed"
cd ../..

# Deploy Member Auth Function
print_info "Deploying Member Auth function..."
cd functions/auth
npm install
gcloud functions deploy member-auth \
    --runtime nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --region $GCP_REGION \
    --memory 512MB \
    --timeout 60s \
    --set-env-vars NODE_ENV=production

print_status "Member Auth function deployed"
cd ../..

# Deploy Email Service to App Engine
print_info "Deploying Email Service to App Engine..."
cd functions/email-service
npm install
gcloud app deploy app.yaml --quiet

print_status "Email Service deployed"
cd ../../..

print_status "✅ All backend services deployed successfully!"

# Test endpoints
print_info "Testing deployed endpoints..."

# Test Form Validation
FORM_VALIDATION_URL="https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/form-validation"
if curl -s -f -X POST "$FORM_VALIDATION_URL" \
   -H "Content-Type: application/json" \
   -d '{"action": "validateField", "field": "name", "value": "test"}' > /dev/null; then
    print_status "Form Validation API is working"
else
    print_warning "Form Validation API may still be starting up"
fi

# Test Member Auth
MEMBER_AUTH_URL="https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/member-auth"
if curl -s -f -X POST "$MEMBER_AUTH_URL" \
   -H "Content-Type: application/json" \
   -d '{"action": "verify", "token": "test"}' > /dev/null; then
    print_status "Member Auth API is working"
else
    print_warning "Member Auth API may still be starting up"
fi

# Test Email Service
EMAIL_SERVICE_URL="https://${GCP_PROJECT}.uc.r.appspot.com"
if curl -s -f "$EMAIL_SERVICE_URL" > /dev/null; then
    print_status "Email Service is working"
else
    print_warning "Email Service may still be starting up"
fi

echo
echo "==============================================="
print_status "🎉 Backend Deployment Complete!"
echo "==============================================="
print_info "Deployed Services:"
echo "  - Form Validation: $FORM_VALIDATION_URL"
echo "  - Member Auth: $MEMBER_AUTH_URL"
echo "  - Email Service: $EMAIL_SERVICE_URL"
echo
print_info "Next steps:"
echo "  1. Test all APIs thoroughly"
echo "  2. Check GCP Console for logs"
echo "  3. Update frontend API URLs if needed"
echo "  4. Monitor function performance" 