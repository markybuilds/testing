const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Starting simple YouTube Playlist Manager test...');

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
      contextIsolation: true
    }
  });

  console.log('Window created, loading content...');
  
  // Try to load the built HTML file
  const htmlPath = path.join(__dirname, 'dist/renderer/index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath).then(() => {
    console.log('HTML loaded successfully');
  }).catch((err) => {
    console.error('Failed to load HTML:', err);
    // Load a simple fallback
    mainWindow.loadURL('data:text/html,<h1>YouTube Playlist Manager</h1><p>Window test successful!</p>');
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show event fired');
    mainWindow.show();
    mainWindow.focus();
    console.log('Window shown and focused');
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
