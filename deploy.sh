#!/bin/bash

# Docker deployment script for dashboard-landing
# This script runs the dashboard-landing container with custom configuration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="dashboard-landing"
CONTAINER_NAME="dashboard-landing-app"
PORT=3001

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

# Function to display usage
usage() {
    cat << USAGE
Usage: $0 [OPTIONS]

Deploy the dashboard-landing application using Docker.

Options:
    -u, --username USERNAME     Default admin username (required)
    -p, --password PASSWORD     Default admin password (required)
    -d, --database-dir DIR      Host directory for database persistence (required)
    -P, --port PORT            Port to expose (default: 3001)
    -i, --image-name NAME      Docker image name (default: dashboard-landing)
    -b, --build                Force build image before deploying
    -h, --help                 Display this help message

Example:
    $0 -u admin -p mySecurePass123 -d /home/user/dashboard-data
    $0 --username admin --password mySecurePass123 --database-dir ./data --port 8080
    $0 -u admin -p pass123 -d ./data --build

Note: Run ./docker-image-create.sh first to build the Docker image.

USAGE
    exit 1
}

# Parse command line arguments
BUILD_IMAGE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--username)
            DEFAULT_USERNAME="$2"
            shift 2
            ;;
        -p|--password)
            DEFAULT_PASSWORD="$2"
            shift 2
            ;;
        -d|--database-dir)
            DATABASE_DIR="$2"
            shift 2
            ;;
        -P|--port)
            PORT="$2"
            shift 2
            ;;
        -i|--image-name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_IMAGE=true
            shift
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

# Validate required parameters
if [ -z "$DEFAULT_USERNAME" ] || [ -z "$DEFAULT_PASSWORD" ] || [ -z "$DATABASE_DIR" ]; then
    print_error "Missing required parameters!"
    echo ""
    usage
fi

# Convert relative path to absolute path
DATABASE_DIR=$(realpath -m "$DATABASE_DIR")

print_info "Starting deployment with the following configuration:"
echo "  Username: $DEFAULT_USERNAME"
echo "  Password: ********"
echo "  Database Directory: $DATABASE_DIR"
echo "  Port: $PORT"
echo "  Image: $IMAGE_NAME"
echo ""

# Check if image exists or build is requested
if [ "$BUILD_IMAGE" = true ] || [ -z "$(docker images -q $IMAGE_NAME:latest 2> /dev/null)" ]; then
    if [ "$BUILD_IMAGE" = true ]; then
        print_info "Build flag detected. Building Docker image..."
    else
        print_warning "Docker image '$IMAGE_NAME:latest' not found."
        print_info "Building Docker image using docker-image-create.sh..."
    fi
    
    if [ -f "./docker-image-create.sh" ]; then
        chmod +x ./docker-image-create.sh
        ./docker-image-create.sh -n $IMAGE_NAME
        echo ""
    else
        print_info "Building Docker image directly..."
        docker build -t $IMAGE_NAME:latest .
        if [ $? -ne 0 ]; then
            print_error "Docker build failed!"
            exit 1
        fi
    fi
else
    print_info "Using existing Docker image: $IMAGE_NAME:latest"
fi

# Create database directory if it doesn't exist
if [ ! -d "$DATABASE_DIR" ]; then
    print_info "Creating database directory: $DATABASE_DIR"
    mkdir -p "$DATABASE_DIR"
fi

# Generate a secure JWT secret if not exists
JWT_SECRET=$(openssl rand -hex 32)
print_info "Generated JWT secret for secure authentication"

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    print_warning "Stopping and removing existing container..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
fi

# Run the container
print_info "Starting container: $CONTAINER_NAME"
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:3001 \
    -v "$DATABASE_DIR:/app/database" \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DATABASE_PATH=/app/database/dashboard.db \
    -e JWT_SECRET=$JWT_SECRET \
    -e DEFAULT_USERNAME=$DEFAULT_USERNAME \
    -e DEFAULT_PASSWORD=$DEFAULT_PASSWORD \
    --restart unless-stopped \
    $IMAGE_NAME:latest

if [ $? -ne 0 ]; then
    print_error "Failed to start container!"
    exit 1
fi

# Wait a few seconds for the container to start
print_info "Waiting for container to start..."
sleep 3

# Check if container is running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    print_info "Container started successfully!"
    echo ""
    print_info "Application is running at: http://localhost:$PORT"
    print_info "Admin login credentials:"
    echo "  Username: $DEFAULT_USERNAME"
    echo "  Password: $DEFAULT_PASSWORD"
    echo ""
    print_info "To view logs: docker logs -f $CONTAINER_NAME"
    print_info "To stop: docker stop $CONTAINER_NAME"
    print_info "Database is persisted in: $DATABASE_DIR"
else
    print_error "Container failed to start. Checking logs..."
    docker logs $CONTAINER_NAME
    exit 1
fi
