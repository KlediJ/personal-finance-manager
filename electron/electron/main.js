"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const DatabaseManager_1 = require("../src/data-storage/database/DatabaseManager");
const DatabaseConnection_1 = require("../src/data-storage/database/DatabaseConnection");
const accountHandlers_1 = require("./ipc/accountHandlers");
const transactionHandlers_1 = require("./ipc/transactionHandlers");
const categoryHandlers_1 = require("./ipc/categoryHandlers");
const payeeHandlers_1 = require("./ipc/payeeHandlers");
const budgetHandlers_1 = require("./ipc/budgetHandlers");
const billHandlers_1 = require("./ipc/billHandlers");
const loanHandlers_1 = require("./ipc/loanHandlers");
const interestHandlers_1 = require("./ipc/interestHandlers");
const importHandlers_1 = require("./ipc/importHandlers");
const aiHandlers_1 = require("./ipc/aiHandlers");
let mainWindow = null;
let databaseInitialized = false;
async function initializeDatabase() {
    try {
        // Ensure the database path is configured before any repositories touch it
        DatabaseConnection_1.DatabaseConnection.initialize();
        await DatabaseManager_1.DatabaseManager.getInstance().initialize();
        databaseInitialized = true;
    }
    catch (error) {
        databaseInitialized = false;
        console.error('Database initialization failed:', error);
        throw error;
    }
}
async function createWindow() {
    try {
        await initializeDatabase();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown database initialization error';
        electron_1.dialog.showErrorBox('Database Initialization Failed', `Libri could not start because the database failed to initialize.\n\n${message}`);
        electron_1.app.quit();
        return;
    }
    try {
        (0, accountHandlers_1.setupAccountHandlers)();
        (0, transactionHandlers_1.setupTransactionHandlers)();
        (0, categoryHandlers_1.setupCategoryHandlers)();
        (0, payeeHandlers_1.setupPayeeHandlers)();
        (0, budgetHandlers_1.setupBudgetHandlers)();
        (0, billHandlers_1.setupBillHandlers)();
        (0, loanHandlers_1.setupLoanHandlers)();
        (0, interestHandlers_1.setupInterestHandlers)();
        (0, importHandlers_1.setupImportHandlers)();
        (0, aiHandlers_1.initializeAIHandlers)();
    }
    catch (error) {
        console.error('IPC handler setup failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown IPC initialization error';
        electron_1.dialog.showErrorBox('Application Startup Failed', `Libri could not finish starting because the application services failed to initialize.\n\n${message}`);
        electron_1.app.quit();
        return;
    }
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        // In production, load the bundled index.html from the app's dist folder.
        // app.getAppPath() points at the app.asar root when packaged.
        const indexPath = path.join(electron_1.app.getAppPath(), 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    }
    // When window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Provide basic environment information to the renderer (used by Settings/EnvironmentIndicator)
electron_1.ipcMain.handle('app:getEnvironment', () => {
    const environment = process.env.NODE_ENV || 'production';
    const userData = electron_1.app.getPath('userData');
    const dbDirectory = path.join(userData, 'database');
    const dbPath = path.join(dbDirectory, 'finance_manager.db');
    return {
        environment,
        dbPath,
        version: electron_1.app.getVersion(),
        appPath: electron_1.app.getAppPath(),
        userData
    };
});
// When Electron has finished initialization
electron_1.app.whenReady().then(() => {
    // Create window
    createWindow();
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // On macOS, applications keep running until explicitly quit
    if (process.platform !== 'darwin') {
        // Cleanup AI services
        (0, aiHandlers_1.cleanupAIServices)();
        // Close database connection
        if (databaseInitialized) {
            DatabaseManager_1.DatabaseManager.getInstance().shutdown();
            databaseInitialized = false;
        }
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (mainWindow === null) {
        createWindow();
    }
});
