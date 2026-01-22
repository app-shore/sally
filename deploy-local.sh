#!/bin/bash
# Local build and deploy script for REST-OS to CapRover

set -e  # Exit on error

echo "🚀 REST-OS Local Build & Deploy to CapRover"
echo "============================================"

# Configuration
APP_NAME="rest-os"
IMAGE_NAME="rest-os:latest"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Building Docker image locally...${NC}"
docker build -t ${IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Get image size
IMAGE_SIZE=$(docker images ${IMAGE_NAME} --format "{{.Size}}")
echo -e "${BLUE}📊 Image size: ${IMAGE_SIZE}${NC}"
echo ""

# Ask user if they want to test locally first
read -p "Would you like to test the image locally before deploying? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🧪 Starting container locally on port 3000 and 8000...${NC}"
    echo "Press Ctrl+C to stop and continue to deployment"
    docker run --rm -p 3000:3000 -p 8000:8000 \
        -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
        -e REDIS_URL="redis://host:6379/0" \
        ${IMAGE_NAME}
fi

echo ""
echo -e "${BLUE}🚀 Deploying to CapRover...${NC}"

# Deploy using tar approach (same as caprover deploy but with pre-built image)
# Save the image as a tar file
echo "Saving image to tar file..."
docker save ${IMAGE_NAME} -o /tmp/rest-os-image.tar

echo "Deploying to CapRover..."
caprover deploy -a ${APP_NAME} -t /tmp/rest-os-image.tar

# Clean up
rm /tmp/rest-os-image.tar

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}📱 Check your app at: https://${APP_NAME}.your-domain.com${NC}"
