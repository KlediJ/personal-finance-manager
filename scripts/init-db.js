// Database initialization script
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

const dbPath = path.join(getUserDataPath(), 'database', 'finance_manager.db');

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

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

// Categories table
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Payees table
db.exec(`
  CREATE TABLE IF NOT EXISTS payees (
    payee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_category_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_category_id) REFERENCES categories (category_id)
  )
`);

// Payee details table
db.exec(`
  CREATE TABLE IF NOT EXISTS payee_details (
    payee_id INTEGER PRIMARY KEY,
    business_type TEXT,
    website TEXT,
    phone TEXT,
    address TEXT,
    auto_categorization_rules TEXT,
    payment_methods TEXT,
    typical_amount_range TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payee_id) REFERENCES payees (payee_id) ON DELETE CASCADE
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
    payee_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts (account_id),
    FOREIGN KEY (category_id) REFERENCES categories (category_id),
    FOREIGN KEY (payee_id) REFERENCES payees (payee_id)
  )
`);

// Budgets table
db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    amount REAL NOT NULL,
    period TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
  )
`);

// Enhanced financial tracking tables
db.exec(`
  CREATE TABLE IF NOT EXISTS recurring_bills (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    payee_id INTEGER,
    category_id INTEGER,
    account_id INTEGER,
    amount REAL NOT NULL,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    auto_pay INTEGER NOT NULL DEFAULT 0,
    reminder_days INTEGER NOT NULL DEFAULT 3,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payee_id) REFERENCES payees (payee_id),
    FOREIGN KEY (category_id) REFERENCES categories (category_id),
    FOREIGN KEY (account_id) REFERENCES accounts (account_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS loan_details (
    loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    loan_type TEXT NOT NULL,
    original_amount REAL NOT NULL,
    current_balance REAL NOT NULL,
    interest_rate REAL NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment REAL NOT NULL,
    start_date TEXT NOT NULL,
    payee_id INTEGER,
    account_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payee_id) REFERENCES payees (payee_id),
    FOREIGN KEY (account_id) REFERENCES accounts (account_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS interest_expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER,
    transaction_id INTEGER,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_details (loan_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
  )
`);

// Insert sample data
console.log('Inserting sample data...');

// Sample accounts
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

const insertAccountStmt = db.prepare(`
  INSERT INTO accounts (name, type, opening_balance, current_balance, currency, active)
  VALUES (?, ?, ?, ?, ?, ?)
`);

sampleAccounts.forEach(account => {
  insertAccountStmt.run(
    account.name,
    account.type,
    account.opening_balance,
    account.current_balance,
    account.currency,
    account.active
  );
});

// Sample categories
const sampleCategories = [
  { name: 'Food & Dining', type: 'expense', description: 'Restaurants, groceries, etc.' },
  { name: 'Transportation', type: 'expense', description: 'Gas, public transit, etc.' },
  { name: 'Shopping', type: 'expense', description: 'Clothing, electronics, etc.' },
  { name: 'Bills & Utilities', type: 'expense', description: 'Electricity, water, internet, etc.' },
  { name: 'Entertainment', type: 'expense', description: 'Movies, games, hobbies' },
  { name: 'Health & Fitness', type: 'expense', description: 'Medical, gym, etc.' },
  { name: 'Travel', type: 'expense', description: 'Vacation, business trips' },
  { name: 'Education', type: 'expense', description: 'Books, courses, etc.' },
  { name: 'Salary', type: 'income', description: 'Monthly salary' },
  { name: 'Freelance', type: 'income', description: 'Freelance work' },
  { name: 'Investment', type: 'income', description: 'Dividends, interest' },
  { name: 'Other Income', type: 'income', description: 'Miscellaneous income' }
];

const insertCategoryStmt = db.prepare(`
  INSERT INTO categories (name, type, description)
  VALUES (?, ?, ?)
`);

sampleCategories.forEach(category => {
  insertCategoryStmt.run(category.name, category.type, category.description);
});

// Close the database
db.close();

console.log('Database initialization complete');
console.log(`Database created at: ${dbPath}`);