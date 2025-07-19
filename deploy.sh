#!/bin/bash

# Production Deployment Script for Member Card System
# This script automates the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Member Card System"
BUILD_DIR="dist"
FIREBASE_PROJECT="dev-splicer-463021-u3"
GCP_REGION="asia-southeast1"

echo -e "${BLUE}🚀 Starting Production Deployment for ${PROJECT_NAME}${NC}"
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

# Step 1: Environment Check
print_info "Checking environment and dependencies..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Step 2: Environment Variables Check
print_info "Checking environment variables..."

if [ ! -f ".env.production" ]; then
    print_warning "No .env.production file found. Using production.env.example as template."
    print_info "Please copy production.env.example to .env.production and configure your API keys."
    
    read -p "Do you want to continue with default configuration? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled. Please configure .env.production first."
        exit 1
    fi
fi

# Step 3: Clean previous builds
print_info "Cleaning previous builds..."
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    print_status "Removed previous build directory"
fi

# Step 4: Install dependencies
print_info "Installing dependencies..."
npm ci --only=production
print_status "Dependencies installed"

# Step 5: Run linting
print_info "Running code quality checks..."
npm run lint || {
    print_warning "Linting issues found. Continuing anyway..."
}

# Step 6: Build for production
print_info "Building application for production..."
npm run build:prod

if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed - no dist directory found"
    exit 1
fi

print_status "Production build completed"

# Step 7: Build size analysis
print_info "Analyzing build size..."
BUILD_SIZE=$(du -sh $BUILD_DIR | cut -f1)
print_status "Total build size: $BUILD_SIZE"

# Check for large files
find $BUILD_DIR -size +1M -type f -exec ls -lh {} \; | while read -r line; do
    print_warning "Large file detected: $line"
done

# Step 8: Backend services health check
print_info "Checking backend services health..."

# Check Form Validation API
if curl -s -f -X POST "https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/form-validation" \
   -H "Content-Type: application/json" \
   -d '{"action": "validateField", "field": "name", "value": "test"}' > /dev/null; then
    print_status "Form Validation API is healthy"
else
    print_error "Form Validation API is not responding"
    exit 1
fi

# Check Member Auth API
if curl -s -f -X POST "https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/member-auth" \
   -H "Content-Type: application/json" \
   -d '{"action": "verify", "token": "test"}' > /dev/null; then
    print_status "Member Auth API is healthy"
else
    print_error "Member Auth API is not responding"
    exit 1
fi

# Step 9: Security scan (basic)
print_info "Running basic security checks..."

# Check for sensitive files in build
if find $BUILD_DIR -name "*.env*" -o -name "*.key" -o -name "*secret*" | grep -q .; then
    print_error "Sensitive files found in build directory!"
    find $BUILD_DIR -name "*.env*" -o -name "*.key" -o -name "*secret*"
    exit 1
fi

print_status "Security check passed"

# Step 10: Deployment options
print_info "Choose deployment platform:"
echo "1) Firebase Hosting"
echo "2) Netlify"
echo "3) Google Cloud Storage"
echo "4) Docker Container"
echo "5) Manual (just build)"

read -p "Select deployment option (1-5): " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        print_info "Deploying to Firebase Hosting..."
        if command -v firebase &> /dev/null; then
            firebase use $FIREBASE_PROJECT
            firebase deploy --only hosting
            print_status "Deployed to Firebase Hosting"
        else
            print_error "Firebase CLI not installed. Install with: npm install -g firebase-tools"
            exit 1
        fi
        ;;
    2)
        print_info "Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=$BUILD_DIR
            print_status "Deployed to Netlify"
        else
            print_error "Netlify CLI not installed. Install with: npm install -g netlify-cli"
            exit 1
        fi
        ;;
    3)
        print_info "Deploying to Google Cloud Storage..."
        if command -v gsutil &> /dev/null; then
            read -p "Enter GCS bucket name: " BUCKET_NAME
            gsutil -m rsync -r -d $BUILD_DIR/ gs://$BUCKET_NAME/
            print_status "Deployed to Google Cloud Storage"
        else
            print_error "Google Cloud SDK not installed"
            exit 1
        fi
        ;;
    4)
        print_info "Building Docker container..."
        if command -v docker &> /dev/null; then
            docker build -t member-card-system:latest .
            print_status "Docker container built successfully"
            print_info "Run with: docker run -p 80:80 member-card-system:latest"
        else
            print_error "Docker not installed"
            exit 1
        fi
        ;;
    5)
        print_status "Build completed. Manual deployment required."
        print_info "Build files are in the $BUILD_DIR directory"
        ;;
    *)
        print_error "Invalid option selected"
        exit 1
        ;;
esac

# Step 11: Post-deployment verification
if [ "$DEPLOY_OPTION" != "5" ] && [ "$DEPLOY_OPTION" != "4" ]; then
    print_info "Running post-deployment verification..."
    
    read -p "Enter deployed application URL for verification: " APP_URL
    
    if [ ! -z "$APP_URL" ]; then
        if curl -s -f "$APP_URL" > /dev/null; then
            print_status "Application is accessible at $APP_URL"
        else
            print_warning "Application may not be accessible yet. DNS propagation may take some time."
        fi
    fi
fi

# Step 12: Deployment summary
echo
echo "=================================================="
print_status "🎉 Production Deployment Summary"
echo "=================================================="
print_info "Project: $PROJECT_NAME"
print_info "Build Size: $BUILD_SIZE"
print_info "Node.js: $NODE_VERSION"
print_info "npm: $NPM_VERSION"
print_info "Build Time: $(date)"
print_info "Environment: Production"

if [ "$DEPLOY_OPTION" != "5" ]; then
    print_status "✅ Deployment completed successfully!"
else
    print_status "✅ Build completed successfully!"
fi

echo
print_info "Next steps:"
echo "1. Monitor application performance"
echo "2. Check error logs"
echo "3. Verify all features are working"
echo "4. Update DNS if necessary"
echo "5. Set up monitoring alerts"

print_status "🚀 Your Member Card System is ready for production!" 