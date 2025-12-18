#!/bin/bash

# Docker image creation script for dashboard-landing
# This script builds the Docker image that can be deployed using deploy.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="dashboard-landing"
IMAGE_TAG="latest"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${BLUE}[SUCCESS]${NC} $1"
}

# Function to display usage
usage() {
    cat << USAGE
Usage: $0 [OPTIONS]

Build a Docker image for the dashboard-landing application.

Options:
    -n, --name NAME            Image name (default: dashboard-landing)
    -t, --tag TAG              Image tag (default: latest)
    -h, --help                 Display this help message

Example:
    $0
    $0 -n my-dashboard -t v1.0.0
    $0 --name dashboard-landing --tag production

USAGE
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found in current directory!"
    exit 1
fi

print_info "Starting Docker image build process..."
echo "  Image Name: $IMAGE_NAME"
echo "  Image Tag: $IMAGE_TAG"
echo ""

# Build the Docker image
print_info "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

docker build -t $IMAGE_NAME:$IMAGE_TAG .

if [ $? -ne 0 ]; then
    print_error "Docker build failed!"
    exit 1
fi

# Also tag as latest if a specific tag was provided
if [ "$IMAGE_TAG" != "latest" ]; then
    print_info "Tagging image as latest..."
    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
fi

echo ""
print_success "Docker image built successfully!"
echo ""
print_info "Image Details:"
docker images | grep $IMAGE_NAME | head -2
echo ""
print_info "You can now deploy this image using:"
echo "  ./deploy.sh -u <username> -p <password> -d <database-dir>"
echo ""
print_info "Or run it manually with:"
echo "  docker run -d -p 3001:3001 -v /path/to/data:/app/database $IMAGE_NAME:$IMAGE_TAG"
