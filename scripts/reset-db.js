// Database reset script
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Get user data path without using Electron
function getUserDataPath() {
  const appName = 'personal-finance-manager';
  
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA, appName);
  } else if (process.platform === 'darwin') {
    return path.join(process.env.HOME, 'Library', 'Application Support', appName);
  } else {
    return path.join(process.env.HOME, '.config', appName);
  }
}

const dbPath = path.join(getUserDataPath(), 'finance_manager_dev.db');

console.log(`Database path: ${dbPath}`);

// Make sure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created directory: ${dbDir}`);
}

// Delete the database file if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Database file deleted successfully');
} else {
  console.log('Database file does not exist, creating new one');
}

// Create a new database file
const db = new Database(dbPath);

// Initialize schema
console.log('Creating new database schema...');

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

// Insert some sample data
console.log('Inserting sample data...');

const sampleAccounts = [
  {
    name: 'Checking Account',
    type: 'checking',
    opening_balance: 1000,
    current_balance: 1250.75,
    currency: 'USD',
    active: 1
  },
  {
    name: 'Savings Account',
    type: 'savings',
    opening_balance: 5000,
    current_balance: 5123.45,
    currency: 'USD',
    active: 1
  },
  {
    name: 'Credit Card',
    type: 'credit_card',
    opening_balance: 0,
    current_balance: -450.28,
    currency: 'USD',
    active: 1
  }
];

const insertStmt = db.prepare(`
  INSERT INTO accounts (name, type, opening_balance, current_balance, currency, active)
  VALUES (?, ?, ?, ?, ?, ?)
`);

sampleAccounts.forEach(account => {
  insertStmt.run(
    account.name,
    account.type,
    account.opening_balance,
    account.current_balance,
    account.currency,
    account.active
  );
});

// Close the database
db.close();

console.log('Database reset complete');
