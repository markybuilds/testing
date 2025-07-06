#!/bin/bash

# Release Script for YouTube Playlist Manager
# Automates the release process with version management

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to display usage
usage() {
    echo "Usage: $0 [VERSION_TYPE]"
    echo ""
    echo "VERSION_TYPE:"
    echo "  patch    - Bug fixes (1.0.0 -> 1.0.1)"
    echo "  minor    - New features (1.0.0 -> 1.1.0)"
    echo "  major    - Breaking changes (1.0.0 -> 2.0.0)"
    echo "  [version] - Specific version (e.g., 1.2.3)"
    echo ""
    echo "Examples:"
    echo "  $0 patch"
    echo "  $0 minor"
    echo "  $0 1.2.3"
    exit 1
}

# Check if version argument is provided
if [ $# -eq 0 ]; then
    print_error "Version argument required"
    usage
fi

VERSION_TYPE=$1

print_status "🚀 YouTube Playlist Manager Release Process"
echo "=============================================="

# Check prerequisites
print_status "Checking prerequisites..."

# Check git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "There are uncommitted changes. Please commit or stash them first."
    git status --porcelain
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "You're not on the main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Aborted by user"
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Calculate new version
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEW_VERSION=$VERSION_TYPE
else
    case $VERSION_TYPE in
        patch|minor|major)
            NEW_VERSION=$(npm version --no-git-tag-version $VERSION_TYPE | sed 's/v//')
            ;;
        *)
            print_error "Invalid version type: $VERSION_TYPE"
            usage
            ;;
    esac
fi

print_status "New version: $NEW_VERSION"

# Confirm release
echo ""
print_warning "⚠️  This will create a new release: $CURRENT_VERSION -> $NEW_VERSION"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Aborted by user"
    # Revert version change if it was automatic
    if [[ ! "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        git checkout package.json package-lock.json 2>/dev/null || true
    fi
    exit 1
fi

# Update version in package.json if not already done
if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
    print_status "Updating package.json version..."
    npm version --no-git-tag-version $NEW_VERSION > /dev/null
fi

# Update version in other files
print_status "Updating version references..."

# Update main.ts if it has version references
if [ -f "src/main/main.ts" ]; then
    sed -i.bak "s/version.*=.*['\"].*['\"];/version = '$NEW_VERSION';/g" src/main/main.ts 2>/dev/null || true
fi

# Create changelog entry
CHANGELOG_FILE="CHANGELOG.md"
if [ ! -f "$CHANGELOG_FILE" ]; then
    print_status "Creating CHANGELOG.md..."
    cat > "$CHANGELOG_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [$NEW_VERSION] - $(date +%Y-%m-%d)

### Added
- Initial release
- Comprehensive YouTube playlist management
- Video downloading with quality selection
- Offline video access
- Playlist organization and search
- Video format conversion
- Batch download capabilities
- Duplicate detection system
- Cross-platform support (Windows, macOS, Linux)

EOF
else
    print_status "Updating CHANGELOG.md..."
    # Add new version entry
    sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $(date +%Y-%m-%d)\n\n### Changed\n- Version $NEW_VERSION release\n/" "$CHANGELOG_FILE"
fi

# Run tests before release
print_status "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_error "Tests failed. Aborting release."
    exit 1
fi

# Run linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting issues found, but continuing..."
fi

# Build application
print_status "Building application..."
npm run build
print_success "Build completed"

# Commit version changes
print_status "Committing version changes..."
git add package.json package-lock.json CHANGELOG.md src/main/main.ts* 2>/dev/null || true
git commit -m "chore: bump version to $NEW_VERSION

- Update package.json version
- Update changelog
- Prepare for release $NEW_VERSION"

# Create git tag
print_status "Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION

$(sed -n "/## \[$NEW_VERSION\]/,/## \[.*\]/p" "$CHANGELOG_FILE" | head -n -1 | tail -n +3)"

# Push changes and tag
print_status "Pushing changes to remote..."
git push origin "$CURRENT_BRANCH"
git push origin "v$NEW_VERSION"

print_success "🎉 Release v$NEW_VERSION created successfully!"
echo ""
print_status "What happens next:"
echo "  1. GitHub Actions will automatically build packages"
echo "  2. A new release will be created on GitHub"
echo "  3. Packages will be attached to the release"
echo "  4. Users will be able to download the new version"
echo ""
print_status "Monitor the release process at:"
echo "  https://github.com/your-username/youtube-playlist-manager/actions"
echo ""
print_status "Manual package build (optional):"
echo "  npm run dist"

# Clean up backup files
rm -f src/main/main.ts.bak CHANGELOG.md.bak 2>/dev/null || true
