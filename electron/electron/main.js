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
const accountHandlers_1 = require("./ipc/accountHandlers");
const transactionHandlers_1 = require("./ipc/transactionHandlers");
const categoryHandlers_1 = require("./ipc/categoryHandlers");
const payeeHandlers_1 = require("./ipc/payeeHandlers");
const budgetHandlers_1 = require("./ipc/budgetHandlers");
const billHandlers_1 = require("./ipc/billHandlers");
const loanHandlers_1 = require("./ipc/loanHandlers");
const interestHandlers_1 = require("./ipc/interestHandlers");
const aiHandlers_1 = require("./ipc/aiHandlers");
let mainWindow = null;
async function createWindow() {
    // Initialize database
    try {
        console.log('Starting database initialization...');
        await DatabaseManager_1.DatabaseManager.getInstance().initialize();
        console.log('Database initialized successfully');
        // Set up IPC handlers
        console.log('Setting up IPC handlers...');
        (0, accountHandlers_1.setupAccountHandlers)();
        console.log('✓ Account handlers set up');
        (0, transactionHandlers_1.setupTransactionHandlers)();
        console.log('✓ Transaction handlers set up');
        (0, categoryHandlers_1.setupCategoryHandlers)();
        console.log('✓ Category handlers set up');
        (0, payeeHandlers_1.setupPayeeHandlers)();
        console.log('✓ Payee handlers set up');
        (0, budgetHandlers_1.setupBudgetHandlers)();
        console.log('✓ Budget handlers set up');
        (0, billHandlers_1.setupBillHandlers)();
        console.log('✓ Bill handlers set up');
        (0, loanHandlers_1.setupLoanHandlers)();
        console.log('✓ Loan handlers set up');
        (0, interestHandlers_1.setupInterestHandlers)();
        console.log('✓ Interest handlers set up');
        (0, aiHandlers_1.initializeAIHandlers)();
        console.log('✓ AI handlers set up');
        console.log('All IPC handlers initialized successfully');
    }
    catch (error) {
        console.error('Initialization failed:', error);
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
        // In production, load the bundled index.html
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }
    // When window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
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
        DatabaseManager_1.DatabaseManager.getInstance().shutdown();
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (mainWindow === null) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map