#!/bin/bash

# Frontend Web Application Production Deployment Script
# Builds and deploys the React application

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
BUILD_DIR="dist"

echo -e "${CYAN}🌐 Frontend Web Application Production Deployment${NC}"
echo "========================================================="

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

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_status "Node.js $(node --version) and npm $(npm --version) found"

# Check environment file
if [ ! -f ".env.production" ]; then
    print_warning "No .env.production file found"
    print_info "Please create .env.production from production.env.example"
    read -p "Continue with existing environment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status "Production environment file found"
fi

# Install dependencies
print_info "Installing dependencies..."
npm install

# Run linting
print_info "Running code quality checks..."
npm run lint || print_warning "Linting issues found - continuing anyway"

# Build production bundle
print_info "Building production bundle..."
npm run build:prod

# Check build output
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed - no dist directory found"
    exit 1
fi

BUILD_SIZE=$(du -sh $BUILD_DIR | cut -f1)
print_status "Production build completed - Size: $BUILD_SIZE"

# Check for large files
print_info "Checking for large files..."
find $BUILD_DIR -size +1M -type f -exec ls -lh {} \; | while read -r line; do
    print_warning "Large file: $line"
done

# Choose deployment target
echo
print_info "Choose deployment target:"
echo "1) Firebase Hosting"
echo "2) Netlify"
echo "3) Google Cloud Storage"
echo "4) Local preview only"

read -p "Select option (1-4): " choice

case $choice in
    1)
        deploy_to_firebase
        ;;
    2)
        deploy_to_netlify
        ;;
    3)
        deploy_to_gcs
        ;;
    4)
        print_info "Starting local preview..."
        npm run preview:prod
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Deploy to Firebase
deploy_to_firebase() {
    print_info "Deploying to Firebase Hosting..."
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found, installing..."
        npm install -g firebase-tools
    fi
    
    # Login (if needed)
    print_info "Checking Firebase authentication..."
    firebase login --no-localhost
    
    # Use project
    firebase use $GCP_PROJECT
    
    # Deploy
    print_info "Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    
    print_status "✅ Deployed to Firebase Hosting"
    print_info "🌐 URL: https://${GCP_PROJECT}.web.app"
    print_info "🌐 Custom domain: https://${GCP_PROJECT}.firebaseapp.com"
}

# Deploy to Netlify
deploy_to_netlify() {
    print_info "Deploying to Netlify..."
    
    # Check Netlify CLI
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found, installing..."
        npm install -g netlify-cli
    fi
    
    # Login (if needed)
    print_info "Checking Netlify authentication..."
    netlify status || netlify login
    
    # Deploy
    print_info "Deploying to Netlify..."
    netlify deploy --prod --dir=$BUILD_DIR
    
    print_status "✅ Deployed to Netlify"
    print_info "Check Netlify dashboard for the live URL"
}

# Deploy to Google Cloud Storage
deploy_to_gcs() {
    print_info "Deploying to Google Cloud Storage..."
    
    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed"
        exit 1
    fi
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        print_error "Not authenticated with Google Cloud"
        print_info "Run: gcloud auth login"
        exit 1
    fi
    
    # Get bucket name
    read -p "Enter GCS bucket name: " bucket_name
    
    if [ -z "$bucket_name" ]; then
        print_error "Bucket name cannot be empty"
        exit 1
    fi
    
    # Set project
    gcloud config set project $GCP_PROJECT
    
    # Create bucket if it doesn't exist
    print_info "Creating bucket (if it doesn't exist)..."
    gsutil mb gs://$bucket_name 2>/dev/null || true
    
    # Enable website configuration
    print_info "Configuring bucket for website hosting..."
    gsutil web set -m index.html -e index.html gs://$bucket_name
    
    # Make bucket public
    print_info "Making bucket publicly accessible..."
    gsutil iam ch allUsers:objectViewer gs://$bucket_name
    
    # Upload files
    print_info "Uploading files..."
    gsutil -m rsync -r -d $BUILD_DIR/ gs://$bucket_name/
    
    print_status "✅ Deployed to Google Cloud Storage"
    print_info "🌐 URL: https://storage.googleapis.com/${bucket_name}/index.html"
    print_info "🌐 Direct URL: https://${bucket_name}.storage.googleapis.com"
}

echo
echo "================================================="
print_status "🎉 Frontend Deployment Complete!"
echo "================================================="
print_info "Build Information:"
echo "  - Build Size: $BUILD_SIZE"
echo "  - Build Directory: $BUILD_DIR"
echo "  - Environment: Production"
echo
print_info "Next steps:"
echo "  1. Test the deployed application"
echo "  2. Verify all features work correctly"
echo "  3. Check browser console for errors"
echo "  4. Test on different devices and browsers"
echo "  5. Set up custom domain (if needed)" 