import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseManager } from '../src/data-storage/database/DatabaseManager';
import { setupAccountHandlers } from './ipc/accountHandlers';
import { setupTransactionHandlers } from './ipc/transactionHandlers';
import { setupCategoryHandlers } from './ipc/categoryHandlers';
import { setupPayeeHandlers } from './ipc/payeeHandlers';
import { setupBudgetHandlers } from './ipc/budgetHandlers';
import { setupBillHandlers } from './ipc/billHandlers';
import { setupLoanHandlers } from './ipc/loanHandlers';
import { setupInterestHandlers } from './ipc/interestHandlers';
import { initializeAIHandlers, cleanupAIServices } from './ipc/aiHandlers';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Initialize database
  try {
    console.log('Starting database initialization...');
    await DatabaseManager.getInstance().initialize();
    console.log('Database initialized successfully');
    
    // Set up IPC handlers
    console.log('Setting up IPC handlers...');
    setupAccountHandlers();
    console.log('✓ Account handlers set up');
    setupTransactionHandlers();
    console.log('✓ Transaction handlers set up');
    setupCategoryHandlers();
    console.log('✓ Category handlers set up');
    setupPayeeHandlers();
    console.log('✓ Payee handlers set up');
    setupBudgetHandlers();
    console.log('✓ Budget handlers set up');
    setupBillHandlers();
    console.log('✓ Bill handlers set up');
    setupLoanHandlers();
    console.log('✓ Loan handlers set up');
    setupInterestHandlers();
    console.log('✓ Interest handlers set up');
    initializeAIHandlers();
    console.log('✓ AI handlers set up');
    
    console.log('All IPC handlers initialized successfully');
  } catch (error) {
    console.error('Initialization failed:', error);
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../src/assets/images/logo.png'),
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
    // Cleanup AI services
    cleanupAIServices();
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
