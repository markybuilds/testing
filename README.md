# YouTube Playlist Manager

<div align="center">

![YouTube Playlist Manager Logo](assets/icon.png)

**A powerful cross-platform desktop application for comprehensive YouTube playlist management with advanced downloading, conversion, and organization capabilities.**

[![Build Status](https://github.com/youtube-playlist-manager/youtube-playlist-manager/workflows/Build%20and%20Release/badge.svg)](https://github.com/youtube-playlist-manager/youtube-playlist-manager/actions)
[![Release](https://img.shields.io/github/release/youtube-playlist-manager/youtube-playlist-manager.svg)](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases)
[![Downloads](https://img.shields.io/github/downloads/youtube-playlist-manager/youtube-playlist-manager/total.svg)](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases)
[![License](https://img.shields.io/github/license/youtube-playlist-manager/youtube-playlist-manager.svg)](LICENSE)

[Download](#download) • [Features](#features) • [Installation](#installation) • [Documentation](#documentation) • [Support](#support)

</div>

## Overview

YouTube Playlist Manager is a comprehensive desktop application that revolutionizes how you manage YouTube playlists. Built with Electron and TypeScript, it provides a seamless experience for importing, organizing, downloading, and managing your YouTube content across Windows, macOS, and Linux.

## ✨ Features

### 🎵 Playlist Management
- **Import YouTube Playlists**: Seamlessly import existing YouTube playlists
- **Custom Playlist Creation**: Create and organize custom playlists
- **Advanced Search & Filter**: Find videos instantly with powerful search capabilities
- **Drag & Drop Reordering**: Intuitive playlist organization
- **Metadata Management**: Comprehensive video information storage

### 📥 Advanced Downloading
- **Quality Selection**: Choose from available video qualities (4K, 1080p, 720p, etc.)
- **Format Options**: Download as MP4, WebM, MKV, or audio-only formats
- **Batch Downloads**: Download entire playlists with progress tracking
- **Resume & Pause**: Full control over download operations
- **Smart Duplicate Detection**: Prevent redundant downloads automatically

### 🎬 Media Processing
- **FFmpeg Integration**: Professional video format conversion
- **Quality Optimization**: Optimize videos for different uses
- **Batch Conversion**: Convert multiple videos simultaneously
- **Audio Extraction**: Extract audio from video files
- **Format Analysis**: Detailed media file information

### 📱 Offline Access
- **Local Library**: Organize downloaded videos in a local library
- **Media Player Integration**: Play videos with system default or integrated player
- **Recently Watched**: Track your viewing history
- **Bookmarking**: Save favorite videos for quick access

### 🔧 Smart Features
- **Auto-Updates**: Automatic yt-dlp and FFmpeg updates
- **Error Recovery**: Intelligent error handling with retry mechanisms
- **Export/Import**: Backup and restore your playlist data
- **Cross-Platform**: Native support for Windows, macOS, and Linux
- **Dark/Light Theme**: Customizable interface themes

## 🚀 Download

### Latest Release

| Platform | Download | Size | Checksum |
|----------|----------|------|----------|
| **Windows** | [Download Installer](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest/download/YouTube-Playlist-Manager-Setup.exe) | ~150MB | [SHA256](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) |
| **macOS** | [Download DMG](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest/download/YouTube-Playlist-Manager.dmg) | ~160MB | [SHA256](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) |
| **Linux** | [Download AppImage](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest/download/YouTube-Playlist-Manager.AppImage) | ~170MB | [SHA256](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) |

### Alternative Downloads

<details>
<summary>More download options</summary>

#### Windows
- [Portable Version](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - No installation required
- [ZIP Archive](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Manual extraction

#### macOS
- [PKG Installer](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Alternative installer
- [ZIP Archive](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Manual extraction

#### Linux
- [DEB Package](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Debian/Ubuntu
- [RPM Package](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Red Hat/Fedora
- [Snap Package](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Universal Linux
- [TAR Archive](https://github.com/youtube-playlist-manager/youtube-playlist-manager/releases/latest) - Manual extraction

</details>

## 📦 Installation

### Windows
1. Download the installer (.exe file)
2. Run the installer as administrator if required
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### macOS
1. Download the DMG file
2. Open the DMG and drag the app to Applications folder
3. If prompted, allow installation from unidentified developer:
   - Go to System Preferences → Security & Privacy
   - Click "Open Anyway" for YouTube Playlist Manager
4. Launch from Applications folder

### Linux

#### AppImage (Recommended)
```bash
# Download and make executable
chmod +x YouTube-Playlist-Manager-*.AppImage

# Run the application
./YouTube-Playlist-Manager-*.AppImage
```

#### Debian/Ubuntu
```bash
# Install the package
sudo dpkg -i youtube-playlist-manager_*.deb

# Fix dependencies if needed
sudo apt-get install -f
```

#### Red Hat/Fedora
```bash
# Install the package
sudo rpm -i youtube-playlist-manager-*.rpm

# Or using dnf
sudo dnf install youtube-playlist-manager-*.rpm
```

## 🛠️ System Requirements

### Minimum Requirements
- **RAM**: 4GB
- **Storage**: 500MB free space
- **Network**: Internet connection for downloading videos

### Platform Requirements
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.14 (Mojave) or later
- **Linux**: Modern distribution with glibc 2.17+

## 📚 Quick Start Guide

1. **Import a Playlist**: Paste a YouTube playlist URL and click Import
2. **Browse Videos**: Explore imported videos with thumbnails and metadata
3. **Download Videos**: Select quality and format, then start downloading
4. **Organize**: Create custom playlists and organize your content
5. **Convert**: Use FFmpeg integration for format conversion

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/youtube-playlist-manager/youtube-playlist-manager.git
cd youtube-playlist-manager

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building
```bash
# Build for current platform
npm run package

# Build for all platforms
npm run dist

# Run tests
npm test
```

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main application entry
│   └── preload.ts  # Preload script for IPC
├── renderer/       # Frontend application
│   ├── index.html  # Main HTML file
│   ├── styles/     # CSS stylesheets
│   └── scripts/    # JavaScript/TypeScript
└── shared/         # Shared types and utilities
    └── types.ts    # TypeScript interfaces
```

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 🤝 Support

### Getting Help
- 📖 [Documentation](https://github.com/youtube-playlist-manager/youtube-playlist-manager/wiki)
- 💬 [Discussions](https://github.com/youtube-playlist-manager/youtube-playlist-manager/discussions)
- 🐛 [Issue Tracker](https://github.com/youtube-playlist-manager/youtube-playlist-manager/issues)

## ⚖️ Legal

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Disclaimer
This application is not affiliated with, endorsed by, or sponsored by YouTube or Google. YouTube is a trademark of Google Inc. Users are responsible for complying with YouTube's Terms of Service when using this application.

### Privacy
YouTube Playlist Manager respects your privacy:
- ✅ All data stored locally on your device
- ✅ No data transmitted to our servers
- ✅ Optional anonymous usage analytics (disabled by default)
- ✅ Full control over your data

See our [Privacy Policy](assets/legal/privacy-policy.md) for details.

## 🎉 Acknowledgments

### Open Source Libraries
- [Electron](https://electronjs.org/) - Cross-platform desktop apps
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
- [FFmpeg](https://ffmpeg.org/) - Media processing
- [SQLite](https://sqlite.org/) - Database engine
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

### Contributors
Thank you to all contributors who have helped make this project better!

<div align="center">

---

**Made with ❤️ by the YouTube Playlist Manager team**

[⬆ Back to top](#youtube-playlist-manager)

</div>
