// Database-focused development script
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const Database = require('better-sqlite3');
const fs = require('fs');

// Database path
const dbPath = path.join(app.getPath('userData'), 'finance_manager_dev.db');

// Database connection
let db;

// Initialize database
function initDatabase() {
  console.log(`Initializing database at: ${dbPath}`);
  
  // Make sure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Open database connection
  db = new Database(dbPath, { verbose: console.log });
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize schema
  initSchema();
  
  return db;
}

// Create database schema
function initSchema() {
  // Accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database schema initialized');
}

// Set up IPC handlers for CRUD operations
function setupAccountHandlers() {
  // Get all accounts
  ipcMain.handle('accounts:getAll', () => {
    const stmt = db.prepare('SELECT * FROM accounts');
    return stmt.all();
  });
  
  // Get account by ID
  ipcMain.handle('accounts:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM accounts WHERE account_id = ?');
    return stmt.get(id);
  });
  
  // Create new account
  ipcMain.handle('accounts:create', (_, account) => {
    const stmt = db.prepare(`
      INSERT INTO accounts (name, type, opening_balance, current_balance, currency, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      account.name,
      account.type,
      account.opening_balance,
      account.current_balance || account.opening_balance,
      account.currency,
      account.active ? 1 : 0
    );
    
    return { id: result.lastInsertRowid, success: true };
  });
  
  // Update account
  ipcMain.handle('accounts:update', (_, id, account) => {
    const stmt = db.prepare(`
      UPDATE accounts 
      SET name = ?, type = ?, current_balance = ?, currency = ?, active = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `);
    
    const result = stmt.run(
      account.name,
      account.type,
      account.current_balance,
      account.currency,
      account.active ? 1 : 0,
      id
    );
    
    return { success: result.changes > 0 };
  });
  
  // Delete account
  ipcMain.handle('accounts:delete', (_, id) => {
    const stmt = db.prepare('DELETE FROM accounts WHERE account_id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  });
  
  // Get total balance
  ipcMain.handle('accounts:getTotalBalance', () => {
    const stmt = db.prepare('SELECT SUM(current_balance) as total FROM accounts WHERE active = 1');
    const result = stmt.get();
    return result?.total || 0;
  });
  
  console.log('Account IPC handlers registered');
}

let mainWindow;

function createWindow() {
  // Initialize database
  initDatabase();
  
  // Set up IPC handlers
  setupAccountHandlers();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3002');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close database connection
    if (db) db.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
