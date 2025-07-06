# Distribution and Packaging Guide

## Overview

This guide covers the packaging and distribution setup for YouTube Playlist Manager across Windows, macOS, and Linux platforms.

## ⚠️ Important: Code Signing is Optional

**The application builds and works perfectly without code signing certificates.** Code signing is only needed for:
- Avoiding security warnings when users download your app
- Enterprise distribution requirements
- Professional/commercial distribution

### Build Status by Signing Configuration

| Configuration | Development | Local Testing | Distribution | User Experience |
|---------------|-------------|---------------|--------------|------------------|
| **No Signing** | ✅ Perfect | ✅ Perfect | ⚠️ Security warnings | App works 100% |
| **With Signing** | ✅ Perfect | ✅ Perfect | ✅ Trusted | App works 100% |

**Bottom Line**: Your app functionality is identical regardless of signing status!

### Check Your Signing Status
```bash
npm run check-signing    # Check current code signing configuration
```

## Build System

### Electron Builder Configuration
- **Config File**: `electron-builder.config.js`
- **Output Directory**: `dist-packages/`
- **Build Resources**: `build-resources/`

### Supported Platforms

#### Windows
- **NSIS Installer** (.exe) - Primary distribution method
- **Portable** (.exe) - No installation required
- **ZIP Archive** (.zip) - Manual extraction

#### macOS
- **DMG Image** (.dmg) - Primary distribution method
- **PKG Installer** (.pkg) - Alternative installer
- **ZIP Archive** (.zip) - Manual extraction

#### Linux
- **AppImage** (.AppImage) - Universal Linux app (Primary)
- **Debian Package** (.deb) - Ubuntu/Debian systems
- **RPM Package** (.rpm) - Red Hat/Fedora systems
- **Snap Package** (.snap) - Universal package manager
- **TAR Archive** (.tar.gz) - Manual extraction

## Build Scripts

### Development
```bash
npm run dev                 # Development mode with hot reload
npm run build              # Build application for production
npm run clean              # Clean build directories
```

### Packaging
```bash
npm run package            # Package for current platform
npm run package:all        # Package for all platforms
npm run package:win        # Windows packages (NSIS, Portable, ZIP)
npm run package:mac        # macOS packages (DMG, PKG, ZIP)
npm run package:linux      # Linux packages (AppImage, DEB, RPM, Snap)
```

### Distribution
```bash
npm run dist               # Build and package for all platforms
npm run dist:win           # Build and package for Windows
npm run dist:mac           # Build and package for macOS
npm run dist:linux         # Build and package for Linux
```

### Publishing
```bash
npm run package:publish    # Publish to GitHub releases
npm run package:draft      # Create draft release
```

## Platform-Specific Features

### Windows
- **NSIS Installer**: Custom installation wizard with prerequisites check
- **File Associations**: `.ytpm` files and `ytplaylist://` protocol
- **Registry Integration**: Proper Windows integration
- **Code Signing**: Optional certificate-based signing
- **Auto Updates**: Built-in updater support

### macOS
- **Notarization**: Apple notarization for security
- **Code Signing**: Developer certificate required for distribution
- **Hardened Runtime**: Security entitlements configured
- **Quarantine**: Automatic handling of downloaded applications
- **Universal Binary**: Support for Intel and Apple Silicon

### Linux
- **Desktop Integration**: .desktop file and icon installation
- **Package Managers**: Multiple distribution formats
- **Permissions**: Proper file system permissions
- **Dependencies**: Automatic dependency resolution where possible

## Security and Signing

### Windows Code Signing (Optional)
**Status**: ⚠️ Optional - App works perfectly without signing
**Impact**: Users may see "Unknown publisher" warning

Environment variables (only set if you have certificates):
- `WINDOWS_CERTIFICATE_FILE`: Path to certificate file
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

**Without signing**: App builds and runs perfectly, users see security warning
**With signing**: App builds and runs perfectly, no security warnings

### Code Signing Status
**Status**: ✅ **COMPLETELY REMOVED** - No signing configuration needed
**Impact**: Apps work perfectly, users see security warnings on first run

### Current Configuration
The build system has been simplified:
- ✅ **No certificates required**: Builds work immediately
- ✅ **No environment variables needed**: Zero configuration
- ✅ **No secrets required**: GitHub Actions work out-of-the-box
- ✅ **Fully functional**: App works 100% without any signing

### If You Want Signing Later (Optional)
To add code signing in the future:
1. **Windows**: Get code signing certificate, add to electron-builder config
2. **macOS**: Get Apple Developer account, add notarization config
3. **Add environment variables**: Update build configuration
4. **GitHub secrets**: Add credentials for automated signing

## CI/CD Integration

### GitHub Actions
- **Development Workflow**: Automated testing and building on push
- **Release Workflow**: Automated packaging and release on version tags
- **Multi-platform**: Builds on Windows, macOS, and Linux runners

### Release Process
1. Update version in `package.json`
2. Create git tag: `git tag v1.0.0`
3. Push tag: `git push origin v1.0.0`
4. GitHub Actions automatically builds and releases

## File Structure

```
dist-packages/
├── win-unpacked/                 # Windows unpacked application
├── mac/                          # macOS application bundle
├── linux-unpacked/               # Linux unpacked application
├── YouTube-Playlist-Manager-Setup-1.0.0.exe
├── YouTube-Playlist-Manager-1.0.0.dmg
├── YouTube-Playlist-Manager-1.0.0.AppImage
├── youtube-playlist-manager_1.0.0_amd64.deb
├── youtube-playlist-manager-1.0.0.x86_64.rpm
└── youtube-playlist-manager_1.0.0_amd64.snap
```

## Distribution Channels

### GitHub Releases
- Primary distribution method
- Automatic release creation via CI/CD
- Asset upload and management
- Release notes generation

### Package Managers (Future)
- **Windows**: Microsoft Store, Chocolatey, Winget
- **macOS**: Mac App Store, Homebrew
- **Linux**: Snap Store, Flathub, AUR

## Installation Instructions

### Windows
1. Download the installer (.exe)
2. Run as administrator if required
3. Follow installation wizard
4. Launch from Start Menu or Desktop shortcut

### macOS
1. Download the DMG file
2. Open DMG and drag app to Applications folder
3. Allow installation from unidentified developer if prompted
4. Launch from Applications folder

### Linux

#### AppImage (Recommended)
```bash
# Download and make executable
chmod +x YouTube-Playlist-Manager-*.AppImage
./YouTube-Playlist-Manager-*.AppImage
```

#### Debian/Ubuntu
```bash
sudo dpkg -i youtube-playlist-manager_*.deb
sudo apt-get install -f  # Fix dependencies if needed
```

#### Red Hat/Fedora
```bash
sudo rpm -i youtube-playlist-manager-*.rpm
# Or using dnf
sudo dnf install youtube-playlist-manager-*.rpm
```

#### Snap
```bash
sudo snap install youtube-playlist-manager_*.snap --dangerous
```

## System Requirements

### Minimum Requirements
- **RAM**: 4GB
- **Storage**: 500MB free space
- **Network**: Internet connection for downloading videos

### Platform Versions
- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 (Mojave) or later
- **Linux**: Modern distribution with glibc 2.17+

## Troubleshooting

### Common Issues

#### Windows
- **Antivirus warnings**: Whitelist the application directory
- **Installation blocked**: Run installer as administrator
- **Missing Visual C++**: Install Microsoft Visual C++ Redistributable

#### macOS
- **App damaged**: Allow apps from anywhere in Security preferences
- **Permission denied**: Grant required permissions in System Preferences
- **Notarization issues**: Wait for Apple's verification process

#### Linux
- **AppImage won't run**: Check file permissions and FUSE support
- **Missing dependencies**: Install required system libraries
- **Permission errors**: Check file ownership and permissions

### Support Resources
- **Documentation**: GitHub repository wiki
- **Issue Tracker**: GitHub Issues
- **Community**: GitHub Discussions

## Performance Optimization

### Build Optimization
- **Code splitting**: Separate main and renderer processes
- **Asset optimization**: Compress images and resources
- **Bundle analysis**: Monitor package size and dependencies
- **Native modules**: Proper handling of binary dependencies

### Runtime Optimization
- **Memory management**: Efficient resource usage
- **Startup time**: Fast application initialization
- **Update mechanism**: Incremental updates where possible

## Maintenance

### Regular Tasks
- Update Electron version
- Update dependencies
- Refresh code signing certificates
- Monitor security advisories
- Update documentation

### Version Management
- Semantic versioning (SemVer)
- Changelog maintenance
- Migration guides for major versions
- Deprecation notices for removed features
