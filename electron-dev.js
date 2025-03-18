// Set up IPC handlers for transaction operations
function setupTransactionHandlers() {
  // Get all transactions
  ipcMain.handle('transactions:getAll', () => {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC');
    return stmt.all();
  });
  
  // Get transaction by ID
  ipcMain.handle('transactions:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
    return stmt.get(id);
  });
  
  // Get transactions by account ID
  ipcMain.handle('transactions:getByAccountId', (_, accountId) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC');
    return stmt.all(accountId);
  });
  
  // Get transactions by date range
  ipcMain.handle('transactions:getByDateRange', (_, startDate, endDate) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC');
    return stmt.all(startDate, endDate);
  });
  
  // Get recent transactions
  ipcMain.handle('transactions:getRecent', (_, limit) => {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC, transaction_id DESC LIMIT ?');
    return stmt.all(limit);
  });
  
  // Search transactions by description
  ipcMain.handle('transactions:searchByDescription', (_, term) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE description LIKE ? ORDER BY date DESC');
    return stmt.all(`%${term}%`);
  });
  
  // Create new transaction
  ipcMain.handle('transactions:create', (_, transaction) => {
    const stmt = db.prepare(`
      INSERT INTO transactions (
        account_id, date, amount, description, category_id, 
        transaction_type, status, payee_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      transaction.account_id,
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.category_id,
      transaction.transaction_type,
      transaction.status,
      transaction.payee_id
    );
    
    // If it's an expense or income, update account balance
    if (transaction.transaction_type !== 'transfer') {
      const updateBalance = db.prepare(`
        UPDATE accounts 
        SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `);
      
      updateBalance.run(transaction.amount, transaction.account_id);
    }
    
    return { id: result.lastInsertRowid, success: true };
  });
  
  // Update transaction
  ipcMain.handle('transactions:update', (_, id, transaction) => {
    // First, get the old transaction to calculate balance difference
    const getOldTransaction = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
    const oldTransaction = getOldTransaction.get(id);
    
    // Update the transaction
    const stmt = db.prepare(`
      UPDATE transactions 
      SET account_id = ?, date = ?, amount = ?, description = ?, 
          category_id = ?, transaction_type = ?, status = ?, payee_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ?
    `);
    
    const result = stmt.run(
      transaction.account_id,
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.category_id,
      transaction.transaction_type,
      transaction.status,
      transaction.payee_id,
      id
    );
    
    // If the amount changed or account changed, update account balance(s)
    if (oldTransaction && 
        (oldTransaction.amount !== transaction.amount || 
         oldTransaction.account_id !== transaction.account_id) &&
        transaction.transaction_type !== 'transfer') {
      
      // If account changed, reverse effect on old account
      if (oldTransaction.account_id !== transaction.account_id) {
        const updateOldAccount = db.prepare(`
          UPDATE accounts 
          SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP
          WHERE account_id = ?
        `);
        
        updateOldAccount.run(oldTransaction.amount, oldTransaction.account_id);
      }
      
      // Update new/current account
      let amountDiff = transaction.amount;
      if (oldTransaction.account_id === transaction.account_id) {
        amountDiff = transaction.amount - oldTransaction.amount;
      }
      
      const updateAccount = db.prepare(`
        UPDATE accounts 
        SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `);
      
      updateAccount.run(amountDiff, transaction.account_id);
    }
    
    return { success: result.changes > 0 };
  });
  
  // Delete transaction
  ipcMain.handle('transactions:delete', (_, id) => {
    // First, get the transaction to reverse its effect on the account balance
    const getTransaction = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
    const transaction = getTransaction.get(id);
    
    // Delete the transaction
    const stmt = db.prepare('DELETE FROM transactions WHERE transaction_id = ?');
    const result = stmt.run(id);
    
    // If it was an expense or income, update account balance to reverse the effect
    if (transaction && transaction.transaction_type !== 'transfer') {
      const updateBalance = db.prepare(`
        UPDATE accounts 
        SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `);
      
      updateBalance.run(transaction.amount, transaction.account_id);
    }
    
    return { success: result.changes > 0 };
  });
  
  // Get transactions by category
  ipcMain.handle('transactions:getByCategory', (_, categoryId) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE category_id = ? ORDER BY date DESC');
    return stmt.all(categoryId);
  });
  
  // Get transactions by type
  ipcMain.handle('transactions:getByType', (_, type) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE transaction_type = ? ORDER BY date DESC');
    return stmt.all(type);
  });
  
  // Get transactions by status
  ipcMain.handle('transactions:getByStatus', (_, status) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE status = ? ORDER BY date DESC');
    return stmt.all(status);
  });
  
  console.log('Transaction IPC handlers registered');
}
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
  
  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER,
      transaction_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payee_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts (account_id)
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      parent_category_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add default categories if none exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const defaultCategories = [
      { name: 'Food & Dining', type: 'expense' },
      { name: 'Transportation', type: 'expense' },
      { name: 'Utilities', type: 'expense' },
      { name: 'Housing', type: 'expense' },
      { name: 'Entertainment', type: 'expense' },
      { name: 'Income', type: 'income' },
      { name: 'Investments', type: 'transfer' },
      { name: 'Transfers', type: 'transfer' },
      { name: 'Other', type: 'expense' }
    ];
    
    const insertCategory = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    for (const category of defaultCategories) {
      insertCategory.run(category.name, category.type);
    }
    console.log('Default categories created');
  }
  
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
  setupTransactionHandlers();
  
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
