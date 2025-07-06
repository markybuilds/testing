const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Force show immediately
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'dist/renderer/index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath).then(() => {
    console.log('HTML loaded successfully');
    mainWindow.show();
    mainWindow.focus();
  }).catch((err) => {
    console.error('Failed to load HTML:', err);
    // Create a simple page if the main HTML fails
    mainWindow.loadURL('data:text/html,<h1>YouTube Playlist Manager Test</h1><p>App is running but main HTML failed to load</p>');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
