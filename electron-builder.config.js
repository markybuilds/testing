/**
 * Electron Builder Configuration
 * Cross-platform application packaging and distribution
 */

const path = require('path');

module.exports = {
  appId: 'com.ytplaylistmanager.app',
  productName: 'YouTube Playlist Manager',
  copyright: 'Copyright © 2025 YouTube Playlist Manager',
  
  // Directories
  directories: {
    output: 'dist-packages',
    buildResources: 'build-resources'
  },
  
  // Files to include
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'assets/icon.*',
    '!node_modules/**/*.{md,txt,map}',
    '!node_modules/**/test/**/*',
    '!node_modules/**/tests/**/*',
    '!node_modules/**/*.d.ts',
    '!**/.*',
    '!**/*.log'
  ],
  
  // Extra resources
  extraResources: [
    {
      from: 'binaries',
      to: 'binaries',
      filter: ['**/*']
    },
    {
      from: 'assets/legal',
      to: 'legal',
      filter: ['**/*']
    }
  ],
  
  // Node.js native modules
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  
  // Security
  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'node_modules/node-pty/**/*',
    'binaries/**/*'
  ],
  
  // Compression
  compression: 'maximum',
  
  // Auto updater
  publish: {
    provider: 'github',
    owner: 'youtube-playlist-manager',
    repo: 'youtube-playlist-manager'
  },
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      },
      {
        target: 'portable',
        arch: ['x64']
      },
      {
        target: 'zip',
        arch: ['x64', 'ia32']
      }
    ],
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
    signingHashAlgorithms: ['sha256'],
    certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
    certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
    publisherName: 'YouTube Playlist Manager',
    verifyUpdateCodeSignature: false,
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  
  // Windows NSIS installer
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    installerHeader: 'build-resources/installer-header.bmp',
    installerSidebar: 'build-resources/installer-sidebar.bmp',
    uninstallerSidebar: 'build-resources/installer-sidebar.bmp',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'YouTube Playlist Manager',
    include: 'build-resources/installer.nsh',
    artifactName: '${productName}-Setup-${version}.${ext}',
    deleteAppDataOnUninstall: false,
    license: 'assets/legal/EULA.txt'
  },
  
  // macOS configuration
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      },
      {
        target: 'pkg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    minimumSystemVersion: '10.14.0',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build-resources/entitlements.mac.plist',
    entitlementsInherit: 'build-resources/entitlements.mac.plist',
    provisioningProfile: process.env.MACOS_PROVISIONING_PROFILE,
    notarize: {
      teamId: process.env.APPLE_TEAM_ID
    },
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  
  // macOS DMG
  dmg: {
    title: '${productName} ${version}',
    icon: 'assets/icon.icns',
    iconSize: 80,
    contents: [
      {
        x: 410,
        y: 150,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 130,
        y: 150,
        type: 'file'
      }
    ],
    background: 'build-resources/dmg-background.png',
    backgroundColor: '#2C3E50',
    window: {
      width: 540,
      height: 380
    },
    artifactName: '${productName}-${version}.${ext}'
  },
  
  // macOS PKG
  pkg: {
    license: 'assets/legal/EULA.txt',
    allowAnywhere: false,
    allowCurrentUserHome: false,
    allowRootDirectory: false,
    installLocation: '/Applications',
    artifactName: '${productName}-${version}.${ext}'
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      },
      {
        target: 'snap',
        arch: ['x64']
      },
      {
        target: 'tar.gz',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.png',
    category: 'AudioVideo',
    synopsis: 'Comprehensive YouTube Playlist Management',
    description: 'A powerful cross-platform desktop application for managing YouTube playlists with advanced downloading, conversion, and organization capabilities.',
    desktop: {
      'StartupWMClass': 'YouTube Playlist Manager',
      'MimeType': 'x-scheme-handler/ytplaylist',
      'Keywords': 'youtube;playlist;downloader;video;audio;media;manager'
    },
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  
  // Debian package
  deb: {
    packageCategory: 'video',
    priority: 'optional',
    depends: [
      'gconf2',
      'gconf-service',
      'libnotify4',
      'libappindicator1',
      'libxtst6',
      'libnss3',
      'libxss1',
      'libasound2'
    ],
    recommends: [
      'ffmpeg',
      'python3'
    ],
    maintainer: 'YouTube Playlist Manager <support@ytplaylistmanager.com>',
    vendor: 'YouTube Playlist Manager',
    fpm: [
      '--deb-compression=xz'
    ]
  },
  
  // RPM package
  rpm: {
    packageCategory: 'Applications/Multimedia',
    vendor: 'YouTube Playlist Manager',
    license: 'MIT',
    depends: [
      'libnotify',
      'libappindicator',
      'libXtst',
      'nss',
      'libXScrnSaver',
      'alsa-lib'
    ],
    fpm: [
      '--rpm-compression=xz'
    ]
  },
  
  // Snap package
  snap: {
    grade: 'stable',
    confinement: 'strict',
    base: 'core20',
    plugs: [
      'default',
      'audio-playback',
      'audio-record',
      'desktop',
      'desktop-legacy',
      'home',
      'network',
      'network-bind',
      'removable-media',
      'unity7',
      'wayland',
      'x11'
    ],
    environment: {
      DISABLE_WAYLAND: '1'
    }
  },
  
  // AppImage
  appImage: {
    license: 'assets/legal/EULA.txt',
    category: 'AudioVideo'
  },
  
  // Protocol handlers
  protocols: [
    {
      name: 'YouTube Playlist Manager Protocol',
      schemes: ['ytplaylist']
    }
  ],
  
  // File associations
  fileAssociations: [
    {
      ext: 'ytpm',
      name: 'YouTube Playlist Manager File',
      description: 'YouTube Playlist Manager playlist file',
      icon: 'assets/icon.png'
    }
  ]
};
