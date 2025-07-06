import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { setupDatabaseIPC } from './database/ipc-handlers';
import { YouTubeIpcHandlers } from './ipc/youtube-handlers';
import { DownloadIpcHandlers } from './ipc/download-handlers';
import { ExportIpcHandlers } from './ipc/export-handlers';
import ComponentUpdateHandler from './update-handlers';
import DuplicateDetectionHandler from './duplicate-detection';

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: require('electron'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    // electron-reload not available in production
  }
}

let mainWindow: BrowserWindow | null = null;
let componentUpdateHandler: ComponentUpdateHandler | null = null;
let duplicateDetectionHandler: DuplicateDetectionHandler | null = null;

const isDevelopment = process.env.NODE_ENV === 'development';

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    icon: join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: !isDevelopment
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      if (isDevelopment) {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure user data directory exists
function ensureUserDataDirectory(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'database');
  const downloadsPath = join(userDataPath, 'downloads');
  
  if (!existsSync(dbPath)) {
    mkdirSync(dbPath, { recursive: true });
  }
  
  if (!existsSync(downloadsPath)) {
    mkdirSync(downloadsPath, { recursive: true });
  }
}

// App event listeners
app.whenReady().then(() => {
  ensureUserDataDirectory();
  setupDatabaseIPC(); // Initialize database IPC handlers
  new YouTubeIpcHandlers(); // Initialize YouTube IPC handlers
  new DownloadIpcHandlers(); // Initialize download IPC handlers
  new ExportIpcHandlers(); // Initialize export IPC handlers
  componentUpdateHandler = new ComponentUpdateHandler(); // Initialize component update handlers
  duplicateDetectionHandler = new DuplicateDetectionHandler(); // Initialize duplicate detection handlers
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup operations before quitting
  if (componentUpdateHandler) {
    await componentUpdateHandler.cleanup();
  }
  
  if (duplicateDetectionHandler) {
    await duplicateDetectionHandler.cleanup();
  }
  
  if (mainWindow) {
    mainWindow.removeAllListeners('closed');
    mainWindow.close();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents: any) => {
  contents.on('new-window', (navigationEvent: any) => {
    navigationEvent.preventDefault();
  });
});

// Basic IPC handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getUserDataPath', () => {
  return app.getPath('userData');
});

export { mainWindow };
