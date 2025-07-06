const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

console.log('Starting debug Electron...');

// Disable hardware acceleration for Linux compatibility
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  console.log('App ready, creating debug window...');
  
  // Create the browser window with explicit visibility settings
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    title: 'YouTube Playlist Manager - Debug',
    icon: null,
    // Force window to be focusable and visible
    skipTaskbar: false,
    alwaysOnTop: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    hasShadow: true,
    opacity: 1.0
  });

  console.log('Window created, setting up events...');

  // Log window events
  mainWindow.on('ready-to-show', () => {
    console.log('Window ready-to-show event fired');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      mainWindow.setAlwaysOnTop(false);
    }, 2000);
    console.log('Window shown and focused');
  });

  mainWindow.on('show', () => {
    console.log('Window show event fired');
  });

  mainWindow.on('focus', () => {
    console.log('Window focus event fired');
  });

  mainWindow.on('blur', () => {
    console.log('Window blur event fired');
  });

  mainWindow.on('closed', () => {
    console.log('Window closed event fired');
  });

  // Load a simple HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>YouTube Playlist Manager - Debug</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background: #f0f0f0;
                text-align: center;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 600px;
                margin: 0 auto;
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
            }
            .status {
                background: #4CAF50;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin: 20px 0;
            }
            button {
                background: #2196F3;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
            }
            button:hover {
                background: #0b7dda;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎵 YouTube Playlist Manager</h1>
            <div class="status">✅ Debug Window Successfully Displayed!</div>
            <p>If you can see this window, then Electron is working properly on your Linux Mint system.</p>
            <button onclick="testAlert()">Test Alert</button>
            <button onclick="window.close()">Close Window</button>
        </div>
        <script>
            function testAlert() {
                alert('Electron is working! The main app should work too.');
            }
            console.log('Debug window content loaded successfully');
        </script>
    </body>
    </html>
  `;

  console.log('Loading HTML content...');
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Force show after a delay
  setTimeout(() => {
    console.log('Force showing window after delay...');
    mainWindow.show();
    mainWindow.moveTop();
    mainWindow.focus();
    
    // Show system dialog as backup
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Debug Test',
      message: 'YouTube Playlist Manager Debug Window',
      detail: 'If you can see this dialog, Electron is working on your system.',
      buttons: ['OK']
    }).then(() => {
      console.log('Dialog shown successfully');
    });
  }, 2000);
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  app.quit();
});

app.on('activate', () => {
  console.log('App activate event fired');
});

console.log('Electron app setup complete, waiting for ready event...');
