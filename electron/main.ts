import { secureIpcMain as ipcMain } from './security/ipc';
import { app, BrowserWindow, dialog, session } from 'electron';
import * as path from 'path';
import { trustWindow, isTrustedDocument } from './security/ipc';
import { clearFileGrants } from './security/files';
import { DatabaseManager } from '../src/data-storage/database/DatabaseManager';
import { DatabaseConnection } from '../src/data-storage/database/DatabaseConnection';
import { setupAccountHandlers } from './ipc/accountHandlers';
import { setupTransactionHandlers } from './ipc/transactionHandlers';
import { setupCategoryHandlers } from './ipc/categoryHandlers';
import { setupPayeeHandlers } from './ipc/payeeHandlers';
import { setupBudgetHandlers } from './ipc/budgetHandlers';
import { setupBillHandlers } from './ipc/billHandlers';
import { setupLoanHandlers } from './ipc/loanHandlers';
import { setupInterestHandlers } from './ipc/interestHandlers';
import { setupImportHandlers } from './ipc/importHandlers';
import { initializeAIHandlers, cleanupAIServices } from './ipc/aiHandlers';

let mainWindow: BrowserWindow | null = null;
let databaseInitialized = false;
let handlersInitialized = false;
const development = !app.isPackaged && process.env.NODE_ENV === 'development';

async function initializeDatabase(): Promise<void> {
  try {
    // Ensure the database path is configured before any repositories touch it
    DatabaseConnection.initialize();
    await DatabaseManager.getInstance().initialize();
    databaseInitialized = true;
  } catch (error) {
    databaseInitialized = false;
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function createWindow() {
  try {
    await initializeDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database initialization error';
    dialog.showErrorBox(
      'Database Initialization Failed',
      `Libri could not start because the database failed to initialize.\n\n${message}`
    );
    app.quit();
    return;
  }

  try {
    if (!handlersInitialized) {
      setupAccountHandlers();
      setupTransactionHandlers();
      setupCategoryHandlers();
      setupPayeeHandlers();
      setupBudgetHandlers();
      setupBillHandlers();
      setupLoanHandlers();
      setupInterestHandlers();
      setupImportHandlers();
      initializeAIHandlers();
      handlersInitialized = true;
    }
  } catch (error) {
    console.error('IPC handler setup failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown IPC initialization error';
    dialog.showErrorBox(
      'Application Startup Failed',
      `Libri could not finish starting because the application services failed to initialize.\n\n${message}`
    );
    app.quit();
    return;
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    show: !(!app.isPackaged && process.env.LIBRI_SECURITY_TEST === '1'),
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../src/assets/images/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  trustWindow(mainWindow, indexPath, development);
  const contents = mainWindow.webContents;
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    if (!isTrustedDocument(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isTrustedDocument(url)) event.preventDefault();
  });
  contents.on('will-attach-webview', event => event.preventDefault());
  contents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) clearFileGrants(contents.id);
  });
  const senderId = contents.id;
  contents.on('destroyed', () => clearFileGrants(senderId));

  // In development mode, load from webpack dev server
  if (development) {
    mainWindow.loadURL('http://localhost:3002');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the bundled index.html from the app's dist folder.
    // app.getAppPath() points at the app.asar root when packaged.
    mainWindow.loadFile(indexPath);
  }

  // When window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Provide basic environment information to the renderer (used by Settings/EnvironmentIndicator)
ipcMain.handle('app:getEnvironment', () => {
  const environment = process.env.NODE_ENV || 'production';
  const userData = app.getPath('userData');
  const dbDirectory = path.join(userData, 'database');
  const dbPath = path.join(dbDirectory, 'finance_manager.db');

  return {
    environment,
    dbPath,
    version: app.getVersion(),
    appPath: app.getAppPath(),
    userData
  };
});

// When Electron has finished initialization
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on('will-download', event => event.preventDefault());
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src " +
      (development ? "'self' ws://localhost:3002" : "'none'") + "; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [policy] } });
  });
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, applications keep running until explicitly quit
  if (process.platform !== 'darwin') {
    // Cleanup AI services
    cleanupAIServices();
    // Close database connection
    if (databaseInitialized) {
      DatabaseManager.getInstance().shutdown();
      databaseInitialized = false;
    }
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});
