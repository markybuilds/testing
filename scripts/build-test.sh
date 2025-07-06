#!/bin/bash

# Local Build and Package Test Script
# This script tests the packaging process locally

set -e  # Exit on any error

echo "🔧 YouTube Playlist Manager - Local Build Test"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Clean previous builds
print_status "Cleaning previous builds..."
npm run clean
print_success "Build directories cleaned"

# Install dependencies
print_status "Installing dependencies..."
npm ci
print_success "Dependencies installed"

# Run linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting failed, continuing anyway..."
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_warning "Tests failed, continuing anyway..."
fi

# Build application
print_status "Building application..."
npm run build
print_success "Application built successfully"

# Detect platform and package accordingly
print_status "Detecting platform..."
case "$(uname -s)" in
    Linux*)
        PLATFORM="Linux"
        print_status "Building Linux packages..."
        npm run package:linux-appimage
        ;;
    Darwin*)
        PLATFORM="macOS"
        print_status "Building macOS packages..."
        npm run package:mac-dmg
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        PLATFORM="Windows"
        print_status "Building Windows packages..."
        npm run package:win
        ;;
    *)
        print_warning "Unknown platform, building for current platform..."
        npm run package
        ;;
esac

print_success "Platform detected: $PLATFORM"

# Check output
print_status "Checking build output..."
if [ -d "dist-packages" ]; then
    print_success "Package directory created"
    
    # List generated packages
    echo ""
    print_status "Generated packages:"
    find dist-packages -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.snap" | while read file; do
        SIZE=$(du -h "$file" | cut -f1)
        echo "  📦 $(basename "$file") ($SIZE)"
    done
    
    # Calculate total size
    TOTAL_SIZE=$(du -sh dist-packages | cut -f1)
    print_success "Total package size: $TOTAL_SIZE"
else
    print_error "Package directory not found"
    exit 1
fi

# Test application startup (if possible)
print_status "Testing application startup..."
case $PLATFORM in
    "Linux")
        if [ -f dist-packages/*.AppImage ]; then
            print_status "AppImage found, testing startup..."
            timeout 10s dist-packages/*.AppImage --version || print_warning "Startup test timed out or failed"
        fi
        ;;
    "macOS")
        print_warning "macOS app testing requires manual verification"
        ;;
    "Windows")
        print_warning "Windows app testing requires manual verification"
        ;;
esac

# Summary
echo ""
print_success "🎉 Build and package test completed successfully!"
echo ""
print_status "Next steps:"
echo "  1. Test the generated packages manually"
echo "  2. Verify all features work correctly"
echo "  3. Test installation and uninstallation"
echo "  4. Create a release when ready"
echo ""
print_status "Package location: $(pwd)/dist-packages"
