const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Starting YouTube Playlist Manager with debugging...');

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
    show: false,
    title: 'YouTube Playlist Manager',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true
    }
  });

  // Prevent the window from closing automatically
  mainWindow.on('close', (event) => {
    console.log('Window close event intercepted');
    event.preventDefault();
    setTimeout(() => {
      console.log('Allowing window to close after 5 seconds...');
      mainWindow.destroy();
    }, 5000);
  });

  console.log('Window created, loading content...');
  
  const htmlPath = path.join(__dirname, 'dist/renderer/index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath).then(() => {
    console.log('HTML loaded successfully');
  }).catch((err) => {
    console.error('Failed to load HTML:', err);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Content finished loading');
    mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed!');
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Renderer process became unresponsive!');
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show event fired');
    mainWindow.show();
    mainWindow.focus();
    console.log('Window shown and focused - DevTools should be open');
  });

  mainWindow.on('show', () => {
    console.log('Window show event fired');
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed, quitting...');
  app.quit();
});

console.log('Setup complete, waiting for app ready...');
