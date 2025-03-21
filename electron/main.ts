import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseManager } from '../src/data-storage/database/DatabaseManager';
import { setupAccountHandlers } from './ipc/accountHandlers';
import { setupTransactionHandlers } from './ipc/transactionHandlers';
import { setupCategoryHandlers } from './ipc/categoryHandlers';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Initialize database
  try {
    await DatabaseManager.getInstance().initialize();
    // Set up IPC handlers
    setupAccountHandlers();
    setupTransactionHandlers();
    setupCategoryHandlers();
  } catch (error) {
    console.error('Initialization failed:', error);
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In development mode, load from webpack dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the bundled index.html
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  // When window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// When Electron has finished initialization
app.whenReady().then(() => {
  // Create window
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, applications keep running until explicitly quit
  if (process.platform !== 'darwin') {
    // Close database connection
    DatabaseManager.getInstance().shutdown();
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});
