// Production main process
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const Database = require('better-sqlite3');
const fs = require('fs');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');

// Load environment configuration
const config = require('./config').production;

// Database path
const dbPath = path.join(app.getPath('userData'), config.dbName);

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
  db = new Database(dbPath);
  
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

    // Categories table (with icon column, like dev)
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'expense',
        parent_category_id INTEGER,
        icon TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure icon column exists on existing databases (idempotent)
    try {
      db.exec(`ALTER TABLE categories ADD COLUMN icon TEXT`);
    } catch (error) {
      // ignore if column already exists
    }
    
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

    // Loan details table
    db.exec(`
      CREATE TABLE IF NOT EXISTS loan_details (
        loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        loan_type TEXT NOT NULL,
        original_amount REAL NOT NULL,
        current_balance REAL NOT NULL,
        interest_rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        payment_amount REAL NOT NULL,
        payment_frequency TEXT NOT NULL DEFAULT 'monthly',
        start_date TEXT NOT NULL,
        maturity_date TEXT NOT NULL,
        escrow_amount REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id)
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
    try {
      // Check for related transactions before deleting to avoid FK violations
      const txCountRow = db
        .prepare('SELECT COUNT(*) as cnt FROM transactions WHERE account_id = ?')
        .get(id);
      const txCount = txCountRow ? txCountRow.cnt : 0;

      if (txCount > 0) {
        return {
          success: false,
          error: 'Account has related transactions and cannot be deleted. Please delete or reassign those transactions first.'
        };
      }

      const stmt = db.prepare('DELETE FROM accounts WHERE account_id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting account:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete account'
      };
    }
  });
  
  // Get total balance
  ipcMain.handle('accounts:getTotalBalance', () => {
    const stmt = db.prepare('SELECT SUM(current_balance) as total FROM accounts WHERE active = 1');
    const result = stmt.get();
    return result?.total || 0;
  });
  
  console.log('Account IPC handlers registered');
}

  // Set up IPC handlers for transaction operations
  function setupTransactionHandlers() {
  // Get all transactions
  ipcMain.handle('transactions:getAll', () => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      ORDER BY date DESC
    `);
    return stmt.all();
  });
  
  // Get transaction by ID
  ipcMain.handle('transactions:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
    return stmt.get(id);
  });
  
  // Get transactions by account ID
  ipcMain.handle('transactions:getByAccountId', (_, accountId) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.account_id = ? 
      ORDER BY date DESC
    `);
    return stmt.all(accountId);
  });
  
  // Get transactions by date range
  ipcMain.handle('transactions:getByDateRange', (_, startDate, endDate) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE date >= ? AND date <= ? 
      ORDER BY date DESC
    `);
    return stmt.all(startDate, endDate);
  });
  
  // Get recent transactions
  ipcMain.handle('transactions:getRecent', (_, limit) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      ORDER BY date DESC, transaction_id DESC LIMIT ?
    `);
      return stmt.all(limit);
    });
  
  // Search transactions by description
  ipcMain.handle('transactions:searchByDescription', (_, term) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE description LIKE ? ORDER BY date DESC');
      return stmt.all(`%${term}%`);
    });

  // Bulk delete transactions with balance adjustment (matches dev behavior)
  ipcMain.handle('transactions:bulkDelete', (_, ids) => {
    try {
      db.prepare('BEGIN TRANSACTION').run();
      
      let successCount = 0;
      const errors = [];
      
      for (const id of ids) {
        try {
          const getTransaction = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
          const transaction = getTransaction.get(id);
          
          if (!transaction) {
            errors.push({ id, error: 'Transaction not found' });
            continue;
          }
          
          const stmt = db.prepare('DELETE FROM transactions WHERE transaction_id = ?');
          const result = stmt.run(id);
          
          if (result.changes === 0) {
            errors.push({ id, error: 'Delete operation had no effect' });
            continue;
          }
          
          if (transaction.transaction_type !== 'transfer') {
            const updateBalance = db.prepare(`
              UPDATE accounts 
              SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP
              WHERE account_id = ?
            `);
            
            updateBalance.run(transaction.amount, transaction.account_id);
          }
          
          successCount++;
        } catch (err) {
          errors.push({ id, error: err.message });
        }
      }
      
      if (errors.length === 0) {
        db.prepare('COMMIT').run();
        return { success: true, count: successCount };
      }
      
      if (successCount === 0) {
        db.prepare('ROLLBACK').run();
        return { success: false, errors };
      }
      
      db.prepare('COMMIT').run();
      return { 
        partialSuccess: true, 
        count: successCount, 
        totalCount: ids.length,
        errors 
      };
      
    } catch (error) {
      try { db.prepare('ROLLBACK').run(); } catch (_) {}
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

    // Get monthly activity (matches dev behavior)
    ipcMain.handle('transactions:getMonthlyActivity', (_, month, accountId) => {
    try {
      const startDate = `${month}-01`;

      let query = `
        SELECT t.*, 
               a.name as account_name,
               c.name as category_name,
               p.name as payee_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.account_id
        LEFT JOIN categories c ON t.category_id = c.category_id
        LEFT JOIN payees p ON t.payee_id = p.payee_id
        WHERE t.date >= ?
          AND t.date < date(?, '+1 month')
      `;

      const params = [startDate, startDate];

      if (typeof accountId === 'number') {
        query += ' AND t.account_id = ?';
        params.push(accountId);
      }

      query += ' ORDER BY t.date ASC, t.transaction_id ASC';

      const stmt = db.prepare(query);
      const transactions = stmt.all(...params);

      const categoryTotals = {};
      const merchantTotals = {};

      for (const t of transactions) {
        const categoryKey = t.category_name || 'Uncategorized';
        const payeeKey = t.payee_name || 'Unlabeled';

        categoryTotals[categoryKey] = (categoryTotals[categoryKey] || 0) + t.amount;
        merchantTotals[payeeKey] = (merchantTotals[payeeKey] || 0) + t.amount;
      }

      const categorySummary = Object.entries(categoryTotals).map(([name, total]) => ({
        category_name: name,
        total_amount: total
      }));

      const merchantSummary = Object.entries(merchantTotals).map(([name, total]) => ({
        payee_name: name,
        total_amount: total
      }));

      return {
        success: true,
        transactions,
        categoryTotals: categorySummary,
        merchantTotals: merchantSummary
        };
      } catch (error) {
        console.error('Error getting monthly activity:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Auto-categorize uncategorized transactions for a month (history-based rules)
    ipcMain.handle('transactions:autoCategorizeMonth', async (_event, month, accountId) => {
      try {
        const startDate = `${month}-01`;

        let txQuery = `
          SELECT t.*, 
                 c.name as category_name,
                 p.name as payee_name,
                 p.default_category_id
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.category_id
          LEFT JOIN payees p ON t.payee_id = p.payee_id
          WHERE t.date >= ?
            AND t.date < date(?, '+1 month')
            AND (t.category_id IS NULL)
        `;

        const txParams = [startDate, startDate];

        if (typeof accountId === 'number') {
          txQuery += ' AND t.account_id = ?';
          txParams.push(accountId);
        }

        const txStmt = db.prepare(txQuery);
        const candidates = txStmt.all(...txParams);

        if (candidates.length === 0) {
          return {
            success: true,
            updatedCount: 0,
            totalConsidered: 0,
            message: 'No uncategorized transactions found for selected month/account.'
          };
        }

        // Categories for transfers and history lookups
        const availableCategories = db.prepare('SELECT * FROM categories').all();

        const updateStmt = db.prepare(`
          UPDATE transactions
          SET category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE transaction_id = ?
        `);

        // Helper: find most frequent category for a payee
        const getCategoryForPayee = (payeeId) => {
          if (!payeeId) return null;
          const row = db.prepare(`
            SELECT category_id, COUNT(*) as cnt
            FROM transactions
            WHERE payee_id = ? AND category_id IS NOT NULL
            GROUP BY category_id
            ORDER BY cnt DESC
            LIMIT 1
          `).get(payeeId);
          return row && row.category_id ? row.category_id : null;
        };

        // Helper: normalize description
        const normalizeDesc = (s) => (s || '').toString().trim().toLowerCase();

        // Helper: find category by exact / similar description
        const getCategoryForDescription = (description) => {
          const norm = normalizeDesc(description);
          if (!norm) return null;

          // Exact normalized description
          const exact = db.prepare(`
            SELECT category_id, COUNT(*) as cnt
            FROM transactions
            WHERE category_id IS NOT NULL
              AND LOWER(description) = LOWER(?)
            GROUP BY category_id
            ORDER BY cnt DESC
            LIMIT 1
          `).get(norm);
          if (exact && exact.category_id) return exact.category_id;

          // Fallback: partial match on description
          const like = db.prepare(`
            SELECT category_id, COUNT(*) as cnt
            FROM transactions
            WHERE category_id IS NOT NULL
              AND LOWER(description) LIKE '%' || ? || '%'
            GROUP BY category_id
            ORDER BY cnt DESC
            LIMIT 1
          `).get(norm);
          return like && like.category_id ? like.category_id : null;
        };

        db.prepare('BEGIN TRANSACTION').run();

        let updatedCount = 0;
        let totalConsidered = 0;

        for (const tx of candidates) {
          totalConsidered++;

          let chosenCategoryId = null;

          // 1) Transfers: try a transfer category
          if (tx.transaction_type === 'transfer') {
            const transferCategory = availableCategories.find(
              c => c.type === 'transfer' && c.name.toLowerCase().includes('transfer')
            );
            if (transferCategory) {
              chosenCategoryId = transferCategory.category_id;
            }
          } else {
            // 2) Non-transfer: start with payee default if present
            if (tx.default_category_id) {
              chosenCategoryId = tx.default_category_id;
            }

            // 3) If no default, use historical majority for this payee
            if (!chosenCategoryId && tx.payee_id) {
              chosenCategoryId = getCategoryForPayee(tx.payee_id);
            }

            // 4) If still none, use description-based history
            if (!chosenCategoryId && tx.description) {
              chosenCategoryId = getCategoryForDescription(tx.description);
            }
          }

          if (chosenCategoryId) {
            const updateResult = updateStmt.run(
              chosenCategoryId,
              tx.transaction_id
            );
            if (updateResult.changes > 0) {
              updatedCount++;
            }
          }
        }

        db.prepare('COMMIT').run();

        return {
          success: true,
          updatedCount,
          totalConsidered,
          message: updatedCount > 0
            ? `Auto-categorized ${updatedCount} of ${totalConsidered} uncategorized transactions.`
            : 'No suitable categories found for uncategorized transactions.'
        };
      } catch (error) {
        try { db.prepare('ROLLBACK').run(); } catch (_) {}
        console.error('Error during auto-categorization:', error);
        return {
          success: false,
          updatedCount: 0,
          totalConsidered: 0,
          error: error.message || 'Auto-categorization failed'
        };
      }
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

// Set up IPC handlers for category operations
function setupCategoryHandlers() {
  // Get all categories
  ipcMain.handle('categories:getAll', () => {
    const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
    return stmt.all();
  });
  
  // Get category by ID
  ipcMain.handle('categories:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM categories WHERE category_id = ?');
    return stmt.get(id);
  });
  
  // Get categories by type
  ipcMain.handle('categories:getByType', (_, type) => {
    const stmt = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name');
    return stmt.all(type);
  });
  
  // Get parent categories
  ipcMain.handle('categories:getParents', () => {
    const stmt = db.prepare('SELECT * FROM categories WHERE parent_category_id IS NULL ORDER BY name');
    return stmt.all();
  });
  
  // Get subcategories
  ipcMain.handle('categories:getSubcategories', (_, parentId) => {
    const stmt = db.prepare('SELECT * FROM categories WHERE parent_category_id = ? ORDER BY name');
    return stmt.all(parentId);
  });
  
  // Get category hierarchy
  ipcMain.handle('categories:getHierarchy', () => {
    // Get all categories
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    
    // Group by parent
    const result = {};
    const parents = categories.filter(c => c.parent_category_id === null);
    
    for (const parent of parents) {
      const subcategories = categories.filter(c => c.parent_category_id === parent.category_id);
      result[parent.category_id] = {
        category: parent,
        subcategories
      };
    }
    
    return result;
  });
  
  // Create category
  ipcMain.handle('categories:create', (_, category) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO categories (name, type, parent_category_id, icon)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        category.name,
        category.type,
        category.parent_category_id || null,
        category.icon || null
      );
      
      return { id: result.lastInsertRowid, success: true };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Update category
  ipcMain.handle('categories:update', (_, id, category) => {
    try {
      const stmt = db.prepare(`
        UPDATE categories
        SET name = ?, type = ?, parent_category_id = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
        WHERE category_id = ?
      `);
      
      const result = stmt.run(
        category.name,
        category.type,
        category.parent_category_id || null,
        category.icon || null,
        id
      );
      
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Delete category
  ipcMain.handle('categories:delete', (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM categories WHERE category_id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('Category IPC handlers registered');
}

// Set up IPC handlers for budget operations
function setupBudgetHandlers() {
  // Create budgets table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (category_id)
    )
  `);

  // Get all budgets
  ipcMain.handle('budgets:getAll', () => {
    const stmt = db.prepare('SELECT * FROM budgets');
    return stmt.all();
  });

  // Get all budgets with category information
  ipcMain.handle('budgets:getAllWithCategories', () => {
    console.log('Handling IPC call: budgets:getAllWithCategories');
    const stmt = db.prepare(`
      SELECT b.*, c.name as category_name, c.type as category_type, c.icon as category_icon
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
    `);
    const result = stmt.all();
    console.log('Result from getAllWithCategories:', result ? `${result.length} budgets found` : 'No results');
    return result;
  });

  // Get budget by ID
  ipcMain.handle('budgets:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM budgets WHERE budget_id = ?');
    return stmt.get(id);
  });

  // Get budgets by period
  ipcMain.handle('budgets:getByPeriod', (_, period) => {
    const stmt = db.prepare('SELECT * FROM budgets WHERE period = ?');
    return stmt.all(period);
  });

  // Get budgets by date range
  ipcMain.handle('budgets:getByDateRange', (_, startDate, endDate) => {
    const stmt = db.prepare(`
      SELECT * FROM budgets
      WHERE 
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
    `);
    return stmt.all(endDate, startDate, startDate, endDate, startDate, endDate);
  });

  // Get budgets by category
  ipcMain.handle('budgets:getByCategory', (_, categoryId) => {
    const stmt = db.prepare('SELECT * FROM budgets WHERE category_id = ?');
    return stmt.all(categoryId);
  });

  // Get current active budgets
  ipcMain.handle('budgets:getCurrentBudgets', () => {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare('SELECT * FROM budgets WHERE start_date <= ? AND end_date >= ?');
    return stmt.all(today, today);
  });

  // Get current active budgets with category information
  ipcMain.handle('budgets:getCurrentBudgetsWithCategories', () => {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT b.*, c.name as category_name, c.type as category_type, c.icon as category_icon
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.start_date <= ? AND b.end_date >= ?
    `);
    return stmt.all(today, today);
  });

  // Get budget progress
  ipcMain.handle('budgets:getBudgetProgress', (_, date) => {
    // Default to today if no date provided
    const today = date || new Date().toISOString().split('T')[0];
    
    // Get the first day of the month for the given date
    const month = today.substring(0, 7);
    const startOfMonth = `${month}-01`;
    
    // Get the last day of the month
    const year = parseInt(month.split('-')[0]);
    const monthNumber = parseInt(month.split('-')[1]);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const endOfMonth = `${month}-${lastDay}`;
    
    const stmt = db.prepare(`
      SELECT 
        b.budget_id, 
        b.category_id, 
        b.amount as budget_amount, 
        c.name as category_name,
        c.type as category_type,
        c.icon as category_icon,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions
          WHERE category_id = b.category_id
          AND date >= ?
          AND date <= ?
        ) as spent_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.period = 'monthly'
      AND b.start_date <= ?
      AND b.end_date >= ?
    `);
    
    const rows = stmt.all(startOfMonth, endOfMonth, today, today);
    
    return rows.map((row) => {
      // For expense categories, the spent amount is typically negative
      // We take the absolute value for easier comparison with budget
      const spent = row.category_type === 'expense' 
        ? Math.abs(row.spent_amount) 
        : row.spent_amount;
        
      return {
        budget_id: row.budget_id,
        category_id: row.category_id,
        category_name: row.category_name,
        category_type: row.category_type,
        category_icon: row.category_icon,
        budget_amount: row.budget_amount,
        spent_amount: spent,
        remaining_amount: row.budget_amount - spent,
        percentage: (spent / row.budget_amount) * 100
      };
    });
  });

  // Create budget
  ipcMain.handle('budgets:create', (_, budget) => {
    const stmt = db.prepare(`
      INSERT INTO budgets (category_id, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      budget.category_id,
      budget.amount,
      budget.period,
      budget.start_date,
      budget.end_date
    );
    
    return { id: result.lastInsertRowid, success: true };
  });

  // Update budget
  ipcMain.handle('budgets:update', (_, id, budget) => {
    const stmt = db.prepare(`
      UPDATE budgets
      SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE budget_id = ?
    `);
    
    const result = stmt.run(
      budget.category_id,
      budget.amount,
      budget.period,
      budget.start_date,
      budget.end_date,
      id
    );
    
    return { success: result.changes > 0 };
  });

  // Delete budget
  ipcMain.handle('budgets:delete', (_, id) => {
    const stmt = db.prepare('DELETE FROM budgets WHERE budget_id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  });
  
  console.log('Budget IPC handlers registered');
}

// Set up payee-related IPC handlers (subset needed for prod UI)
function setupPayeeHandlers() {
  // Get all payees with basic details and transaction count
  ipcMain.handle('payees:getAll', () => {
    const stmt = db.prepare(`
      SELECT p.*, 
             pd.business_type, pd.website, pd.phone, pd.address,
             pd.auto_categorization_rules, pd.payment_methods, pd.typical_amount_range,
             COUNT(t.transaction_id) as transaction_count
      FROM payees p
      LEFT JOIN payee_details pd ON p.payee_id = pd.payee_id
      LEFT JOIN transactions t ON p.payee_id = t.payee_id
      GROUP BY p.payee_id
      ORDER BY p.name ASC
    `);
    const rows = stmt.all();
    
    return rows.map(row => ({
      payee_id: row.payee_id,
      name: row.name,
      default_category_id: row.default_category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      transaction_count: row.transaction_count || 0,
      details: row.business_type ? {
        payee_id: row.payee_id,
        business_type: row.business_type,
        website: row.website,
        phone: row.phone,
        address: row.address,
        auto_categorization_rules: row.auto_categorization_rules,
        payment_methods: row.payment_methods,
        typical_amount_range: row.typical_amount_range
      } : undefined
    }));
  });

  // Create new payee
  ipcMain.handle('payees:create', (_, payee) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(payee.name, payee.default_category_id || null);
      const payeeId = result.lastInsertRowid;
      
      if (payee.details) {
        const detailsStmt = db.prepare(`
          INSERT INTO payee_details (
            payee_id, business_type, website, phone, address,
            auto_categorization_rules, payment_methods, typical_amount_range
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        detailsStmt.run(
          payeeId,
          payee.details.business_type,
          payee.details.website,
          payee.details.phone,
          payee.details.address,
          payee.details.auto_categorization_rules,
          payee.details.payment_methods,
          payee.details.typical_amount_range
        );
      }
      
      return { id: payeeId, success: true };
    } catch (error) {
      console.error('Error creating payee:', error);
      return { success: false, error: error.message };
    }
  });

  // Create payee if it doesn't exist (case-insensitive)
  ipcMain.handle('payees:createIfNotExists', (_, payee) => {
    try {
      const existing = db.prepare('SELECT payee_id FROM payees WHERE LOWER(name) = LOWER(?)').get(payee.name);
  
      if (existing) {
        return { id: existing.payee_id, created: false, success: true };
      }
  
      const stmt = db.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(payee.name, payee.default_category_id || null);
      const payeeId = result.lastInsertRowid;
  
      if (payee.details) {
        const detailsStmt = db.prepare(`
          INSERT INTO payee_details (
            payee_id, business_type, website, phone, address,
            auto_categorization_rules, payment_methods, typical_amount_range
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        detailsStmt.run(
          payeeId,
          payee.details.business_type,
          payee.details.website,
          payee.details.phone,
          payee.details.address,
          payee.details.auto_categorization_rules,
          payee.details.payment_methods,
          payee.details.typical_amount_range
        );
      }
  
      return { id: payeeId, created: true, success: true };
    } catch (error) {
      console.error('Error creating payee if not exists:', error);
      return { success: false, error: error.message };
    }
  });
}

// Set up loan-related IPC handlers (subset needed for Loans page)
function setupLoansHandlers() {
  ipcMain.handle('loans:getAll', () => {
    const stmt = db.prepare(`
      SELECT l.*, 
             a.name as account_name
      FROM loan_details l
      LEFT JOIN accounts a ON l.account_id = a.account_id
      ORDER BY l.loan_type ASC, l.loan_id ASC
    `);
    return stmt.all();
  });
}

// Set up import/export handlers
function setupImportExportHandlers() {
  // File dialogs for import/export
  ipcMain.handle('import:showFileDialog', async (_, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File to Import',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    });
    
    if (canceled || filePaths.length === 0) {
      return { canceled: true };
    }
    
    return { canceled: false, filePath: filePaths[0] };
  });
  
  ipcMain.handle('export:showSaveDialog', async (_, options) => {
    const { format } = options || {};
    const filters = [];
    
    if (!format || format === 'csv') {
      filters.push({ name: 'CSV Files', extensions: ['csv'] });
    }
    
    if (!format || format === 'excel') {
      filters.push({ name: 'Excel Files', extensions: ['xlsx'] });
    }
    
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Export File',
      filters,
      properties: ['createDirectory']
    });
    
    if (canceled || !filePath) {
      return { canceled: true };
    }
    
    return { canceled: false, filePath };
  });

  // CSV import
  ipcMain.handle('import:parseCSV', async (_, filePath) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          // Try to handle different delimiters in case the CSV isn't standard
          delimitersToGuess: [',', '\t', ';', '|'],
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              // Filter out non-critical errors
              const criticalErrors = results.errors.filter(e => 
                e.type !== 'FieldMismatch' && e.code !== 'TooFewFields' && e.code !== 'TooManyFields'
              );
              
              if (criticalErrors.length > 0) {
                reject({ success: false, errors: criticalErrors });
              } else {
                resolve({
                  success: true,
                  data: results.data,
                  meta: results.meta
                });
              }
            } else {
              resolve({
                success: true,
                data: results.data,
                meta: results.meta
              });
            }
          },
          error: (error) => {
            reject({ success: false, error });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  // Excel import
  ipcMain.handle('import:parseExcel', async (_, filePath) => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Try to determine if it's an xls (legacy) or xlsx file
      const isXls = filePath.toLowerCase().endsWith('.xls');
      
      // Read the file with appropriate method
      if (isXls) {
        await workbook.xlsx.readFile(filePath); // ExcelJS will try to handle old formats too
      } else {
        await workbook.xlsx.readFile(filePath);
      }
      
      const result = {
        success: true,
        sheets: []
      };
      
      workbook.eachSheet((worksheet, sheetId) => {
        const sheetData = [];
        const headers = [];
        
        // Skip empty worksheets
        if (worksheet.rowCount < 1) {
          return;
        }
        
        // Get headers from the first row
        const headerRow = worksheet.getRow(1);
        let hasValidHeaders = false;
        
        headerRow.eachCell((cell, colNumber) => {
          // Try to get cell value, handling formula cells and other types
          let headerValue;
          
          if (cell.formula) {
            headerValue = cell.result || cell.value;
          } else {
            headerValue = cell.value;
          }
          
          // Convert to string if possible
          if (headerValue !== null && headerValue !== undefined) {
            if (typeof headerValue === 'object' && headerValue.text) {
              headerValue = headerValue.text;
            } else if (typeof headerValue !== 'string') {
              headerValue = String(headerValue);
            }
            
            hasValidHeaders = true;
          } else {
            headerValue = `Column${colNumber}`;
          }
          
          headers[colNumber - 1] = headerValue;
        });
        
        // If no valid headers were found, try to use second row as header
        // (sometimes first row is title or blank)
        if (!hasValidHeaders && worksheet.rowCount > 1) {
          const secondRow = worksheet.getRow(2);
          secondRow.eachCell((cell, colNumber) => {
            let headerValue = cell.value;
            if (headerValue !== null && headerValue !== undefined) {
              if (typeof headerValue === 'object' && headerValue.text) {
                headerValue = headerValue.text;
              } else if (typeof headerValue !== 'string') {
                headerValue = String(headerValue);
              }
              headers[colNumber - 1] = headerValue;
              hasValidHeaders = true;
            }
          });
        }
        
        // Process each row
        const startRow = hasValidHeaders ? 2 : 1;
        
        for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          const rowData = {};
          let hasData = false;
          
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              // Process cell value based on type
              let cellValue;
              
              if (cell.formula) {
                cellValue = cell.result || cell.value;
              } else if (cell.type === 4) { // Boolean type
                cellValue = cell.value;
              } else if (cell.type === 3) { // String type
                cellValue = cell.value;
              } else if (cell.type === 2) { // Number type
                cellValue = cell.value;
              } else if (cell.type === 7) { // Date type
                cellValue = cell.value;
              } else {
                cellValue = cell.value;
              }
              
              rowData[header] = cellValue;
              hasData = true;
            }
          });
          
          // Only add row if it has data
          if (hasData) {
            sheetData.push(rowData);
          }
        }
        
        result.sheets.push({
          name: worksheet.name,
          headers,
          data: sheetData
        });
      });
      
      // Make sure we found at least one sheet with data
      if (result.sheets.length === 0) {
        return { success: false, error: 'No data found in Excel file' };
      }
      
      return result;
    } catch (error) {
      console.error('Excel parsing error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Validate transaction data
  ipcMain.handle('import:validateTransactions', async (_, data, mappings) => {
    try {
      const validatedData = [];
      const errors = [];
      
      // Get accounts for validation
      const accountsStmt = db.prepare('SELECT * FROM accounts');
      const accounts = accountsStmt.all();
      
      // Get categories for validation
      const categoriesStmt = db.prepare('SELECT * FROM categories');
      const categories = categoriesStmt.all();
      
      // Process each row
      data.forEach((row, index) => {
        const transaction = {};
        let hasErrors = false;
        const rowErrors = {};
        
        // Map and validate fields
        
        // 1. Account ID handling
        if (mappings.account_id) {
          // Check if mapping is a direct account ID (fixed account for all rows)
          if (!isNaN(Number(mappings.account_id))) {
            const accountId = Number(mappings.account_id);
            const account = accounts.find(a => a.account_id === accountId);
            if (account) {
              transaction.account_id = accountId;
            } else {
              rowErrors.account_id = `Account ID ${accountId} does not exist`;
              hasErrors = true;
            }
          }
          // If mapping points to a CSV column
          else if (row[mappings.account_id] !== undefined) {
            // Try to match by ID first
            if (!isNaN(Number(row[mappings.account_id]))) {
              const accountId = Number(row[mappings.account_id]);
              const account = accounts.find(a => a.account_id === accountId);
              if (account) {
                transaction.account_id = accountId;
              } else {
                // If no match by ID, try to match by name
                const accountByName = accounts.find(a => 
                  a.name.toLowerCase() === String(row[mappings.account_id]).toLowerCase()
                );
                if (accountByName) {
                  transaction.account_id = accountByName.account_id;
                } else {
                  rowErrors.account_id = `Account '${row[mappings.account_id]}' not found`;
                  hasErrors = true;
                }
              }
            } else {
              // Try to match by name
              const accountByName = accounts.find(a => 
                a.name.toLowerCase() === String(row[mappings.account_id]).toLowerCase()
              );
              if (accountByName) {
                transaction.account_id = accountByName.account_id;
              } else {
                rowErrors.account_id = `Account '${row[mappings.account_id]}' not found`;
                hasErrors = true;
              }
            }
          } else {
            rowErrors.account_id = 'Account column is empty';
            hasErrors = true;
          }
        } else {
          // If no account mapping, use the first active account
          const defaultAccount = accounts.find(a => a.active === 1);
          if (defaultAccount) {
            transaction.account_id = defaultAccount.account_id;
          } else if (accounts.length > 0) {
            transaction.account_id = accounts[0].account_id;
          } else {
            rowErrors.account_id = 'No accounts available';
            hasErrors = true;
          }
        }
        
        // 2. Date validation
        if (mappings.date && row[mappings.date] !== undefined) {
          try {
            let dateValue;
            
            // Handle different date formats
            if (row[mappings.date] instanceof Date) {
              dateValue = row[mappings.date];
            } else if (typeof row[mappings.date] === 'string') {
              // Try various date formats
              if (row[mappings.date].match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format
                dateValue = new Date(row[mappings.date]);
              } else if (row[mappings.date].match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
                // MM/DD/YYYY or DD/MM/YYYY format - trying to be smart about it
                const parts = row[mappings.date].split(/[\/\-]/);
                if (parts.length === 3) {
                  if (parseInt(parts[0]) > 12) { // Day is greater than 12, must be DD/MM/YYYY
                    dateValue = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  } else {
                    // US format MM/DD/YYYY
                    dateValue = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                  }
                } else {
                  dateValue = new Date(row[mappings.date]);
                }
              } else {
                // Let JavaScript try to parse it
                dateValue = new Date(row[mappings.date]);
              }
            } else if (typeof row[mappings.date] === 'number') {
              // Excel date number (days since 1900)
              if (row[mappings.date] > 10000) { // Arbitrary cutoff for Excel dates
                // Excel date serial to JS date (adjusted for Excel date bug)
                const excelEpoch = new Date(1899, 11, 30);
                dateValue = new Date(excelEpoch.getTime() + (row[mappings.date] * 24 * 60 * 60 * 1000));
              } else {
                // Unix timestamp (seconds since 1970)
                dateValue = new Date(row[mappings.date] * 1000);
              }
            } else {
              throw new Error('Unsupported date format');
            }
            
            if (isNaN(dateValue.getTime())) {
              rowErrors.date = 'Invalid date format';
              hasErrors = true;
            } else {
              // Format as YYYY-MM-DD for SQLite
              transaction.date = dateValue.toISOString().split('T')[0];
            }
          } catch (e) {
            rowErrors.date = `Invalid date format: ${e.message}`;
            hasErrors = true;
          }
        } else {
          rowErrors.date = 'Date is required';
          hasErrors = true;
        }
        
        // 3. Amount validation
        if (mappings.amount && row[mappings.amount] !== undefined) {
          let amountValue = row[mappings.amount];
          
          // Handle amount as string with currency symbols or thousand separators
          if (typeof amountValue === 'string') {
            // Remove currency symbols, spaces, and thousand separators
            amountValue = amountValue.replace(/[^0-9.\-,]/g, '')
                                    .replace(/,/g, '.'); // Handle European decimal comma
          }
          
          const amount = Number(amountValue);
          
          if (isNaN(amount)) {
            rowErrors.amount = 'Amount must be a number';
            hasErrors = true;
          } else {
            transaction.amount = amount;
          }
        } else {
          rowErrors.amount = 'Amount is required';
          hasErrors = true;
        }
        
        // 4. Transaction type handling
        if (mappings.transaction_type && row[mappings.transaction_type] !== undefined) {
          const rawType = String(row[mappings.transaction_type]).toLowerCase();
          
          // Map common variations to standard types
          if (['income', 'deposit', 'credit', 'revenue', 'in', 'inflow', '+'].includes(rawType)) {
            transaction.transaction_type = 'income';
          } else if (['expense', 'payment', 'debit', 'charge', 'out', 'withdrawal', 'outflow', '-'].includes(rawType)) {
            transaction.transaction_type = 'expense';
          } else if (['transfer', 'move', 'between', 'internal'].includes(rawType)) {
            transaction.transaction_type = 'transfer';
          } else {
            // Try to infer from amount sign
            if (transaction.amount !== undefined) {
              transaction.transaction_type = transaction.amount >= 0 ? 'income' : 'expense';
            } else {
              transaction.transaction_type = 'expense'; // Default
            }
          }
        } else {
          // Infer from amount if available
          if (transaction.amount !== undefined) {
            transaction.transaction_type = transaction.amount >= 0 ? 'income' : 'expense';
            
            // For expenses, make amount negative if it's not already
            if (transaction.transaction_type === 'expense' && transaction.amount > 0) {
              transaction.amount = -Math.abs(transaction.amount);
            }
          } else {
            transaction.transaction_type = 'expense'; // Default
          }
        }
        
        // 5. Optional fields
        // Description
        if (mappings.description && row[mappings.description] !== undefined) {
          transaction.description = String(row[mappings.description] || '');
        }
        
        // Category ID - try to match by name if provided
        if (mappings.category_id && row[mappings.category_id] !== undefined) {
          if (!isNaN(Number(row[mappings.category_id]))) {
            // Try to match by ID
            const categoryId = Number(row[mappings.category_id]);
            const category = categories.find(c => c.category_id === categoryId);
            if (category) {
              transaction.category_id = categoryId;
            } else {
              transaction.category_id = null;
            }
          } else {
            // Try to match by name
            const categoryName = String(row[mappings.category_id]).toLowerCase();
            const category = categories.find(c => 
              c.name.toLowerCase() === categoryName
            );
            if (category) {
              transaction.category_id = category.category_id;
            } else {
              // Try to find a partial match
              const partialMatch = categories.find(c => 
                c.name.toLowerCase().includes(categoryName) || 
                categoryName.includes(c.name.toLowerCase())
              );
              transaction.category_id = partialMatch ? partialMatch.category_id : null;
            }
          }
        }
        
        // Status
        if (mappings.status && row[mappings.status] !== undefined) {
          const rawStatus = String(row[mappings.status]).toLowerCase();
          
          if (['pending', 'p', 'uncleared', 'uncategorized'].includes(rawStatus)) {
            transaction.status = 'pending';
          } else if (['cleared', 'c', 'processed', 'complete', 'completed', 'done'].includes(rawStatus)) {
            transaction.status = 'cleared';
          } else if (['reconciled', 'r', 'verified', 'confirmed', 'matched'].includes(rawStatus)) {
            transaction.status = 'reconciled';
          } else {
            transaction.status = 'pending'; // Default if invalid
          }
        } else {
          transaction.status = 'pending'; // Default if not specified
        }
        
        if (mappings.payee_id && row[mappings.payee_id]) {
          transaction.payee_id = Number(row[mappings.payee_id]) || null;
        }
        
        // Add created_at and updated_at timestamps
        const now = new Date().toISOString();
        transaction.created_at = now;
        transaction.updated_at = now;
        
        // Add validated row or errors
        if (hasErrors) {
          errors.push({ row: index + 1, errors: rowErrors });
        } else {
          validatedData.push(transaction);
        }
      });
      
      return {
        success: errors.length === 0 || validatedData.length > 0,
        validTransactions: validatedData,
        errors: errors,
        stats: {
          total: data.length,
          valid: validatedData.length,
          invalid: errors.length
        }
      };
    } catch (error) {
      console.error('Validation error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Import transactions to database
  ipcMain.handle('import:saveTransactions', (_, transactions) => {
    try {
      // Start a transaction to ensure all-or-nothing operation
      db.prepare('BEGIN TRANSACTION').run();
      
      const insertStmt = db.prepare(`
        INSERT INTO transactions (
          account_id, date, amount, description, category_id, 
          transaction_type, status, payee_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const updateBalanceStmt = db.prepare(`
        UPDATE accounts 
        SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `);
      
      const results = [];
      
      for (const transaction of transactions) {
        // Insert the transaction
        const result = insertStmt.run(
          transaction.account_id,
          transaction.date,
          transaction.amount,
          transaction.description || null,
          transaction.category_id || null,
          transaction.transaction_type,
          transaction.status || 'pending',
          transaction.payee_id || null
        );
        
        // If it's an expense or income, update account balance
        if (transaction.transaction_type !== 'transfer') {
          updateBalanceStmt.run(transaction.amount, transaction.account_id);
        }
        
        results.push({
          id: result.lastInsertRowid,
          success: true
        });
      }
      
      // Commit the transaction
      db.prepare('COMMIT').run();
      
      return {
        success: true,
        count: results.length,
        results
      };
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      return { success: false, error: error.message };
    }
  });
  
  console.log('Import/Export IPC handlers registered');
}

let mainWindow;

function createWindow() {
  // Initialize database
  initDatabase();

  // Initialize AI handlers using the shared TypeScript AI module (same as dev)
  try {
    const { initializeAIHandlers } = require('./electron/electron/ipc/aiHandlers.js');
    initializeAIHandlers(db);
    console.log('AI handlers initialized for production (rule-based)');
  } catch (error) {
    console.error('Error initializing AI handlers in production:', error);
  }
  
  // Set up IPC handlers
  setupAccountHandlers();
  setupTransactionHandlers();
  setupCategoryHandlers();
  setupBudgetHandlers();
  setupPayeeHandlers();
  setupLoansHandlers();
  setupImportExportHandlers();
  
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Use compiled TS preload, same as dev
        preload: path.join(__dirname, 'electron', 'electron', 'preload.js')
      }
    });

  // Load from dist directory for production
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // Only show DevTools in development mode
  if (config.showDevTools) {
    mainWindow.webContents.openDevTools();
  }
  
  // Add environment indicator to window title
  mainWindow.setTitle('Personal Finance Manager (Production)');
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

// IPC handler to provide environment information to the renderer
ipcMain.handle('app:getEnvironment', () => {
  return {
    environment: 'production',
    dbPath: dbPath,
    version: app.getVersion(),
    appPath: app.getAppPath(),
    userData: app.getPath('userData')
  };
});
