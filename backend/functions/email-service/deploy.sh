#!/bin/bash

echo "Starting GCP App Engine deployment for email service with steganography..."

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    echo "Error: Not logged in to gcloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Set project if not already set
PROJECT_ID="dev-splicer-463021-u3"
echo "Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project if needed
echo "Building project..."

# Deploy to App Engine
echo "Deploying to GCP App Engine..."
gcloud app deploy app.yaml --quiet

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "Your email service with steganography is now available at:"
    gcloud app browse --no-launch-browser
    echo ""
    echo "Available endpoints:"
    echo "- POST /api/send-verification-code"
    echo "- POST /api/verify-code"
    echo "- POST /api/encode-member-card"
    echo "- POST /api/verify-member-card"
else
    echo "❌ Deployment failed!"
    exit 1
fi 