const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

// Function to create the main application window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js') // Optional preload script
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add icon if available
    title: 'مشاركة الكتب الإلكترونية',
    show: false, // Don't show until ready
    backgroundColor: '#667eea'
  });

  // Load the app
  mainWindow.loadURL('http://localhost:3000');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Function to start the Express server
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');

  serverProcess = spawn('C:\\Program Files\\nodejs\\node.exe', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  // Wait a bit for server to start
  setTimeout(() => {
    createWindow();
  }, 2000);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  startServer();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }

  // On macOS it is common for applications to stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Menu customization (optional)
const template = [
  {
    label: 'ملف',
    submenu: [
      {
        label: 'إعادة تحميل',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          mainWindow.reload();
        }
      },
      {
        label: 'فتح أدوات المطور',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: () => {
          mainWindow.webContents.openDevTools();
        }
      },
      { type: 'separator' },
      {
        label: 'خروج',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'عرض',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'مساعدة',
    submenu: [
      {
        label: 'حول التطبيق',
        click: () => {
          require('electron').dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'حول التطبيق',
            message: 'مشاركة الكتب الإلكترونية',
            detail: 'تطبيق احترافي لمشاركة الكتب الإلكترونية\nالإصدار 1.0.0'
          });
        }
      }
    ]
  }
];

// Set the menu
Menu.setApplicationMenu(Menu.buildFromTemplate(template));
