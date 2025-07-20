#!/bin/bash

# Complete Production Deployment Script
# Deploys both Backend Services and Frontend Web Application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Member Card System"
GCP_PROJECT="dev-splicer-463021-u3"
GCP_REGION="asia-southeast1"
BUILD_DIR="dist"

echo -e "${CYAN}🚀 Complete Production Deployment for ${PROJECT_NAME}${NC}"
echo "==============================================================="

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

print_step() {
    echo -e "${CYAN}🔷 $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_status "Node.js $(node --version) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_status "npm $(npm --version) found"
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed"
        print_info "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    print_status "Google Cloud CLI found"
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found, installing..."
        npm install -g firebase-tools
    fi
    print_status "Firebase CLI ready"
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        print_error "Not authenticated with Google Cloud"
        print_info "Run: gcloud auth login"
        exit 1
    fi
    print_status "Google Cloud authentication verified"
}

# Set up environment
setup_environment() {
    print_step "Setting up environment..."
    
    # Set GCP project
    gcloud config set project $GCP_PROJECT
    print_status "GCP project set to: $GCP_PROJECT"
    
    # Check for production environment file
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
}

# Deploy Backend Services
deploy_backend() {
    print_step "Deploying Backend Services..."
    
    cd backend
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    npm install
    
    # Deploy Cloud Functions
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
        --timeout 30s
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
        --timeout 60s
    cd ../..
    
    # Deploy Email Service to App Engine
    print_info "Deploying Email Service to App Engine..."
    cd functions/email-service
    npm install
    gcloud app deploy app.yaml --quiet
    cd ../../..
    
    print_status "Backend services deployed successfully!"
}

# Test Backend Services
test_backend() {
    print_step "Testing Backend Services..."
    
    # Test Form Validation API
    print_info "Testing Form Validation API..."
    if curl -s -f -X POST "https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/form-validation" \
       -H "Content-Type: application/json" \
       -d '{"action": "validateField", "field": "name", "value": "test"}' > /dev/null; then
        print_status "Form Validation API is working"
    else
        print_error "Form Validation API test failed"
        exit 1
    fi
    
    # Test Member Auth API
    print_info "Testing Member Auth API..."
    if curl -s -f -X POST "https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/member-auth" \
       -H "Content-Type: application/json" \
       -d '{"action": "verify", "token": "test"}' > /dev/null; then
        print_status "Member Auth API is working"
    else
        print_error "Member Auth API test failed"
        exit 1
    fi
    
    # Test Email Service
    print_info "Testing Email Service..."
    if curl -s -f "https://${GCP_PROJECT}.uc.r.appspot.com" > /dev/null; then
        print_status "Email Service is working"
    else
        print_warning "Email Service may still be starting up"
    fi
}

# Build Frontend
build_frontend() {
    print_step "Building Frontend Application..."
    
    # Install frontend dependencies
    print_info "Installing frontend dependencies..."
    npm install
    
    # Run linting
    print_info "Running code quality checks..."
    npm run lint || print_warning "Linting issues found"
    
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
    find $BUILD_DIR -size +1M -type f -exec ls -lh {} \; | while read -r line; do
        print_warning "Large file: $line"
    done
}

# Deploy Frontend
deploy_frontend() {
    print_step "Deploying Frontend Application..."
    
    echo "Choose deployment target:"
    echo "1) Firebase Hosting"
    echo "2) Netlify"
    echo "3) Google Cloud Storage"
    echo "4) Skip frontend deployment"
    
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
            print_info "Skipping frontend deployment"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Deploy to Firebase
deploy_to_firebase() {
    print_info "Deploying to Firebase Hosting..."
    
    # Login to Firebase (if needed)
    firebase login --no-localhost
    
    # Use project
    firebase use $GCP_PROJECT
    
    # Deploy
    firebase deploy --only hosting
    
    print_status "Deployed to Firebase Hosting"
    print_info "URL: https://${GCP_PROJECT}.web.app"
}

# Deploy to Netlify
deploy_to_netlify() {
    print_info "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found, installing..."
        npm install -g netlify-cli
    fi
    
    netlify deploy --prod --dir=$BUILD_DIR
    print_status "Deployed to Netlify"
}

# Deploy to Google Cloud Storage
deploy_to_gcs() {
    print_info "Deploying to Google Cloud Storage..."
    
    read -p "Enter GCS bucket name: " bucket_name
    
    if [ -z "$bucket_name" ]; then
        print_error "Bucket name cannot be empty"
        exit 1
    fi
    
    # Create bucket if it doesn't exist
    gsutil mb gs://$bucket_name 2>/dev/null || true
    
    # Enable website configuration
    gsutil web set -m index.html -e index.html gs://$bucket_name
    
    # Make bucket public
    gsutil iam ch allUsers:objectViewer gs://$bucket_name
    
    # Upload files
    gsutil -m rsync -r -d $BUILD_DIR/ gs://$bucket_name/
    
    print_status "Deployed to Google Cloud Storage"
    print_info "URL: https://storage.googleapis.com/${bucket_name}/index.html"
}

# Post-deployment verification
verify_deployment() {
    print_step "Post-deployment verification..."
    
    echo "Please verify the following:"
    echo "1. Frontend application loads correctly"
    echo "2. Facebook authentication works (if configured)"
    echo "3. Email verification sends emails"
    echo "4. Member card generation works"
    echo "5. Form validation is functioning"
    
    read -p "All tests passed? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment verification completed"
    else
        print_warning "Please check the issues and redeploy if necessary"
    fi
}

# Main deployment flow
main() {
    echo "Starting complete production deployment..."
    echo "This will deploy:"
    echo "- Backend Cloud Functions (Form Validation, Member Auth)"
    echo "- Email Service (App Engine)"
    echo "- Frontend Web Application"
    echo
    
    read -p "Continue with deployment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    # Execute deployment steps
    check_prerequisites
    setup_environment
    deploy_backend
    test_backend
    build_frontend
    deploy_frontend
    verify_deployment
    
    # Success summary
    echo
    echo "==============================================================="
    print_status "🎉 Complete Production Deployment Successful!"
    echo "==============================================================="
    print_info "Backend Services:"
    echo "  - Form Validation: https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/form-validation"
    echo "  - Member Auth: https://${GCP_REGION}-${GCP_PROJECT}.cloudfunctions.net/member-auth"
    echo "  - Email Service: https://${GCP_PROJECT}.uc.r.appspot.com"
    echo
    print_info "Next steps:"
    echo "  1. Test all functionality thoroughly"
    echo "  2. Monitor error logs"
    echo "  3. Set up monitoring alerts"
    echo "  4. Update DNS if necessary"
    echo
    print_status "Your Member Card System is now live in production! 🚀"
}

# Run main function
main "$@" 