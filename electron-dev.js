// Helper to extract a basic payee name from a description
function extractPayeeName(description) {
  if (!description || !description.trim()) {
    return null;
  }

  const desc = description.trim().toUpperCase();

  // Try a few common patterns first
  const patterns = [
    /PURCHASE\s+AUTHORIZED\s+ON\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
    /DEBIT\s+CARD\s+PURCHASE\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
    /AUTOMATIC\s+PAYMENT\s+AUTHORIZED\s+ON\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
    /ONLINE\s+PAYMENT\s+TO\s+(.+?)$/,
    /PAYMENT\s+TO\s+(.+?)$/,
    /^([A-Z0-9\s&'-]+?)(?:\s+[A-Z]{2}\s+\d{5})?(?:\s+CARD\s+\d+)?$/,
  ];

  function cleanName(raw) {
    let cleaned = raw.trim();

    const removePatterns = [
      /^\d{6}\s+/,                // Leading codes like "250929"
      /\s+CARD\s+\d+.*$/i,
      /\s+S\d{6,}.*$/i,           // Trailing S-codes
      /\s+\d{4,}.*$/,             // Long numbers at end
      /\s+[A-Z]{2}\s+\d{5}.*$/,   // State/zip
      /\s+PURCHASE.*$/i,
      /\s+PAYMENT.*$/i,
      /\s+DEPOSIT.*$/i,
      /\s+WITHDRAWAL.*$/i,
      /\s+TRANSFER.*$/i,
      /\s+AUTHORIZED.*$/i,
      /\s+TRANSACTION.*$/i,
      /\s+#\d+.*$/,
    ];

    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/[*#]+/g, '')
      .replace(/^\W+|\W+$/g, '')
      .trim();

    // Title case
    cleaned = cleaned.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    return cleaned;
  }

  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match && match[1]) {
      const name = cleanName(match[1]);
      if (name && name.length >= 3 && !/^\d+$/.test(name)) {
        return name;
      }
    }
  }

  const cleaned = cleanName(desc);
  if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

// Rule-based transaction categorization service (compiled JS version)
let ruleCategorizationService = null;
function getRuleCategorizationService() {
  if (!ruleCategorizationService) {
    try {
      const { TransactionCategorizationService } = require('./electron/src/data-processing/ai/TransactionCategorizationService');
      ruleCategorizationService = new TransactionCategorizationService();
      console.log('Rule-based TransactionCategorizationService initialized for auto-categorization');
    } catch (error) {
      console.error('Failed to initialize TransactionCategorizationService for auto-categorization:', error);
      ruleCategorizationService = null;
    }
  }
  return ruleCategorizationService;
}

// Helper to read dominant learned category for a payee/description from feedback table
function getLearnedCategoryForPayeeDev(payeeId, payeeName, description) {
  try {
    // Prefer payee_id when available
    if (payeeId) {
      const row = db.prepare(`
        SELECT category_id, category_name, COUNT(*) as count
        FROM ai_categorization_feedback
        WHERE payee_id = ?
        GROUP BY category_id, category_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `).get(payeeId);

      if (row && row.category_id) {
        return { category_id: row.category_id, category_name: row.category_name };
      }
    }

    const normalizedName = (payeeName || '').trim().toLowerCase();
    if (!normalizedName) return null;

    const rowByName = db.prepare(`
      SELECT category_id, category_name, COUNT(*) as count
      FROM ai_categorization_feedback
      WHERE LOWER(payee_name) = ?
      GROUP BY category_id, category_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `).get(normalizedName);

    if (rowByName && rowByName.category_id) {
      return { category_id: rowByName.category_id, category_name: rowByName.category_name };
    }

    const normalizedDesc = (description || '').trim().toLowerCase();
    if (!normalizedDesc) return null;

    const rowByDesc = db.prepare(`
      SELECT category_id, category_name, COUNT(*) as count
      FROM ai_categorization_feedback
      WHERE LOWER(description) = ?
      GROUP BY category_id, category_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `).get(normalizedDesc);

    if (rowByDesc && rowByDesc.category_id) {
      return { category_id: rowByDesc.category_id, category_name: rowByDesc.category_name };
    }
  } catch (error) {
    console.error('Error reading learned category for payee (dev):', error);
  }

  return null;
}

// Set up IPC handlers for transaction operations
function setupTransactionHandlers() {
  // Debug: get live categories snapshot
  ipcMain.handle('debug:getCategories', () => {
    const stmt = db.prepare(`
      SELECT 
        category_id,
        name,
        type,
        parent_category_id
      FROM categories
      ORDER BY type, name, category_id
    `);
    return stmt.all();
  });

  // Debug: migrate categories to canonical taxonomy (idempotent)
  ipcMain.handle('debug:migrateCategories', () => {
    try {
      db.prepare('BEGIN TRANSACTION').run();

      const changes = {
        renamed: [],
        inserted: []
      };

      // 1) Rename "Utilities" -> "Bills & Utilities" if present
      const existingUtilities = db
        .prepare(`SELECT category_id, name FROM categories WHERE name = 'Utilities'`)
        .get();

      if (existingUtilities) {
        db.prepare(`
          UPDATE categories
          SET name = 'Bills & Utilities', updated_at = CURRENT_TIMESTAMP
          WHERE category_id = ?
        `).run(existingUtilities.category_id);

        changes.renamed.push({
          from: existingUtilities.name,
          to: 'Bills & Utilities',
          id: existingUtilities.category_id
        });
      }

      // 2) Ensure core expense categories exist
      const ensureCategory = (name, type) => {
        const existing = db
          .prepare(`SELECT category_id, name FROM categories WHERE LOWER(name) = LOWER(?)`)
          .get(name);

        if (existing) {
          return existing.category_id;
        }

        const result = db
          .prepare(`
            INSERT INTO categories (name, type, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
          .run(name, type);

        changes.inserted.push({
          name,
          type,
          id: result.lastInsertRowid
        });

        return result.lastInsertRowid;
      };

      // Shopping & Retail
      ensureCategory('Shopping', 'expense');

      // Health & Medical / Fitness
      ensureCategory('Health & Fitness', 'expense');

      // Alcohol & Bars
      ensureCategory('Alcohol & Bars', 'expense');

      // Fees & Charges
      ensureCategory('Fees & Charges', 'expense');

      db.prepare('COMMIT').run();

      return {
        success: true,
        changes
      };
    } catch (error) {
      try {
        db.prepare('ROLLBACK').run();
      } catch (_) {
        // ignore rollback errors
      }
      console.error('Error in debug:migrateCategories:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Debug: seed ai_categorization_feedback from WF labeled CSV (dev only)
  ipcMain.handle('debug:seedFeedbackFromWF', () => {
    try {
      const fs = require('fs');
      const path = require('path');
      const Papa = require('papaparse');

      const csvPath = path.join(__dirname, 'docs', 'WF_Checking_092025_raw.csv');
      if (!fs.existsSync(csvPath)) {
        return {
          success: false,
          error: `Labeled CSV not found at ${csvPath}`
        };
      }

      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
      });

      const rows = parsed.data;

      db.prepare(`
        CREATE TABLE IF NOT EXISTS ai_categorization_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER,
          payee_id INTEGER,
          payee_name TEXT,
          category_id INTEGER,
          category_name TEXT,
          description TEXT,
          amount REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      const categories = db.prepare('SELECT * FROM categories').all();
      const categoryByName = new Map();
      for (const c of categories) {
        categoryByName.set(c.name.toLowerCase(), c);
      }

      const findOrCreatePayee = db.prepare(`
        INSERT INTO payees (name, default_category_id, created_at, updated_at)
        SELECT ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM payees WHERE LOWER(name) = LOWER(?));
      `);

      const selectPayee = db.prepare(`
        SELECT * FROM payees WHERE LOWER(name) = LOWER(?) LIMIT 1;
      `);

      const insertFeedback = db.prepare(`
        INSERT INTO ai_categorization_feedback (
          transaction_id,
          payee_id,
          payee_name,
          category_id,
          category_name,
          description,
          amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let inserted = 0;
      let skippedNoCategory = 0;

      db.prepare('BEGIN TRANSACTION').run();

      for (const row of rows) {
        const payeeLabel = (row.payee_label || '').trim();
        const categoryLabel = (row.category_name_label || '').trim();
        const description = row.description_raw || '';
        const amount = row.amount != null ? Number(row.amount) : null;

        if (!payeeLabel || !categoryLabel) {
          continue;
        }

        const category = categoryByName.get(categoryLabel.toLowerCase());
        if (!category) {
          skippedNoCategory++;
          continue;
        }

        // Ensure payee exists
        findOrCreatePayee.run(payeeLabel, payeeLabel);
        const payee = selectPayee.get(payeeLabel);

        insertFeedback.run(
          null,
          payee ? payee.payee_id : null,
          payeeLabel,
          category.category_id,
          category.name,
          description,
          amount
        );

        inserted++;
      }

      db.prepare('COMMIT').run();

      return {
        success: true,
        inserted,
        skippedNoCategory
      };
    } catch (error) {
      try {
        db.prepare('ROLLBACK').run();
      } catch (_) {
        // ignore
      }
      console.error('Error in debug:seedFeedbackFromWF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get all transactions
  ipcMain.handle('transactions:getAll', () => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      ORDER BY date DESC
    `);
    const results = stmt.all();
    
    // Debug: Log first few transactions to see what's being returned
    console.log('=== TRANSACTION DEBUG ===');
    console.log('Total transactions:', results.length);
    
    // Check payees table
    const payeeCount = db.prepare('SELECT COUNT(*) as count FROM payees').get();
    console.log('Total payees in database:', payeeCount.count);
    
    if (payeeCount.count > 0) {
      const samplePayees = db.prepare('SELECT * FROM payees LIMIT 3').all();
      console.log('Sample payees:', samplePayees.map(p => ({ id: p.payee_id, name: p.name })));
    }
    
    if (results.length > 0) {
      console.log('Sample transaction:', {
        id: results[0].transaction_id,
        description: results[0].description,
        payee_id: results[0].payee_id,
        payee_name: results[0].payee_name
      });
      
      // Count how many have payees
      const withPayees = results.filter(t => t.payee_name).length;
      console.log('Transactions with payees:', withPayees);
      
      // Check if any transactions have payee_id but no payee_name
      const brokenJoins = results.filter(t => t.payee_id && !t.payee_name).length;
      if (brokenJoins > 0) {
        console.log('WARNING: Transactions with payee_id but no payee_name:', brokenJoins);
      }
    }
    
    return results;
  });
  
  // Get transaction by ID
  ipcMain.handle('transactions:getById', (_, id) => {
    const stmt = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
    return stmt.get(id);
  });
  
  // Get transactions by account ID
  ipcMain.handle('transactions:getByAccountId', (_, accountId) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.account_id = ? 
      ORDER BY date DESC
    `);
    return stmt.all(accountId);
  });
  
  // Get transactions by date range
  ipcMain.handle('transactions:getByDateRange', (_, startDate, endDate) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE date >= ? AND date <= ? 
      ORDER BY date DESC
    `);
    return stmt.all(startDate, endDate);
  });
  
  // Get recent transactions
  ipcMain.handle('transactions:getRecent', (_, limit) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      ORDER BY date DESC, transaction_id DESC LIMIT ?
    `);
    return stmt.all(limit);
  });
  
  // Search transactions by description
  ipcMain.handle('transactions:searchByDescription', (_, term) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.description LIKE ? 
      ORDER BY t.date DESC
    `);
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
  
  // Bulk delete transactions
  ipcMain.handle('transactions:bulkDelete', (_, ids) => {
    try {
      // Start a transaction to ensure all operations succeed or fail together
      db.prepare('BEGIN TRANSACTION').run();
      
      let successCount = 0;
      const errors = [];
      
      for (const id of ids) {
        try {
          // First, get the transaction to reverse its effect on the account balance
          const getTransaction = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?');
          const transaction = getTransaction.get(id);
          
          if (!transaction) {
            errors.push({ id, error: 'Transaction not found' });
            continue;
          }
          
          // Delete the transaction
          const stmt = db.prepare('DELETE FROM transactions WHERE transaction_id = ?');
          const result = stmt.run(id);
          
          if (result.changes === 0) {
            errors.push({ id, error: 'Delete operation had no effect' });
            continue;
          }
          
          // If it was an expense or income, update account balance to reverse the effect
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
      
      // If all transactions were processed successfully, commit the transaction
      if (errors.length === 0) {
        db.prepare('COMMIT').run();
        return { success: true, count: successCount };
      }
      
      // If there were any errors, rollback and return the errors
      if (successCount === 0) {
        db.prepare('ROLLBACK').run();
        return { success: false, errors };
      }
      
      // If some transactions were processed successfully, commit and return partial success
      db.prepare('COMMIT').run();
      return { 
        partialSuccess: true, 
        count: successCount, 
        totalCount: ids.length,
        errors 
      };
      
    } catch (error) {
      // Rollback on any unexpected error
      db.prepare('ROLLBACK').run();
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Get transactions by category
  ipcMain.handle('transactions:getByCategory', (_, categoryId) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.category_id = ? 
      ORDER BY t.date DESC
    `);
    return stmt.all(categoryId);
  });
  
  // Get transactions by type
  ipcMain.handle('transactions:getByType', (_, type) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.transaction_type = ? 
      ORDER BY t.date DESC
    `);
    return stmt.all(type);
  });
  
  // Get transactions by status
  ipcMain.handle('transactions:getByStatus', (_, status) => {
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.status = ? 
      ORDER BY t.date DESC
    `);
    return stmt.all(status);
  });

  // Get monthly activity with basic summaries
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

  // Auto-categorize uncategorized transactions for a given month using rule-based AI
  ipcMain.handle('transactions:autoCategorizeMonth', async (_, month, accountId) => {
    try {
      const categorizationService = getRuleCategorizationService();
      if (!categorizationService) {
        return {
          success: false,
          updatedCount: 0,
          totalConsidered: 0,
          message: 'Categorization service not available'
        };
      }

      const startDate = `${month}-01`;

      let txQuery = `
        SELECT t.*, 
               c.name as category_name,
               p.name as payee_name
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

      // Get categories and payees once for the AI service
      const availableCategories = db.prepare('SELECT * FROM categories').all();
      const existingPayees = db.prepare('SELECT * FROM payees').all();

      const updateStmt = db.prepare(`
        UPDATE transactions
        SET category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = ?
      `);

      db.prepare('BEGIN TRANSACTION').run();

      let updatedCount = 0;
      let totalConsidered = 0;

      for (const tx of candidates) {
        totalConsidered++;

        // Transfers: map to a transfer-type category (e.g. "Transfers") and skip AI
        if (tx.transaction_type === 'transfer') {
          const transferCategory = availableCategories.find(
            c => c.type === 'transfer' && c.name.toLowerCase().includes('transfer')
          );

          if (transferCategory) {
            const updateResult = updateStmt.run(
              transferCategory.category_id,
              tx.transaction_id
            );
            if (updateResult.changes > 0) {
              updatedCount++;
            }
          }
          continue;
        }

        // Income: map to an income-type category (e.g. "Income") and skip AI
        if (tx.transaction_type === 'income') {
          const incomeCategory = availableCategories.find(
            c => c.type === 'income'
          );

          if (incomeCategory) {
            const updateResult = updateStmt.run(
              incomeCategory.category_id,
              tx.transaction_id
            );
            if (updateResult.changes > 0) {
              updatedCount++;
            }
          }
          continue;
        }

        // Expense: use rule-based AI + learned feedback
        const transactionForAI = {
          transaction_id: tx.transaction_id,
          account_id: tx.account_id,
          date: tx.date,
          amount: tx.amount,
          description: tx.description || '',
          category_id: tx.category_id,
          transaction_type: tx.transaction_type || (tx.amount > 0 ? 'income' : 'expense'),
          status: tx.status || 'cleared',
          payee_id: tx.payee_id
        };

        const result = await categorizationService.processTransaction(
          transactionForAI,
          availableCategories,
          existingPayees
        );
        const topPrediction = result.categoryPredictions && result.categoryPredictions[0];
        let predictedCategory = topPrediction?.category;
        let predictedCategoryId = predictedCategory?.category_id;

        let categoryConfidence = topPrediction?.confidence ?? 0;

        const extractedPayeeName =
          (result.payeeExtraction && result.payeeExtraction.payee && result.payeeExtraction.payee.name) ||
          tx.payee_name ||
          null;
        const learned = getLearnedCategoryForPayeeDev(
          tx.payee_id,
          extractedPayeeName,
          transactionForAI.description
        );

        if (learned) {
          const learnedCategory = availableCategories.find(
            c => c.category_id === learned.category_id
          );
          if (learnedCategory) {
            predictedCategory = learnedCategory;
            predictedCategoryId = learnedCategory.category_id;
            categoryConfidence = 0.95;
          }
        }

        if (!predictedCategoryId || categoryConfidence < 0.7) {
          continue;
        }

        const updateResult = updateStmt.run(predictedCategoryId, tx.transaction_id);
        if (updateResult.changes > 0) {
          updatedCount++;
        }
      }

      db.prepare('COMMIT').run();

      return {
        success: true,
        updatedCount,
        totalConsidered,
        message: `Auto-categorized ${updatedCount} of ${totalConsidered} uncategorized transactions.`
      };
    } catch (error) {
      console.error('Error auto-categorizing month:', error);
      try { db.prepare('ROLLBACK').run(); } catch (_) {}
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Create transfer between accounts
  ipcMain.handle('transactions:createTransfer', (_, fromAccountId, toAccountId, amount, description, date) => {
    try {
      const transferDate = date || new Date().toISOString().split('T')[0];
      const transferAmount = Math.abs(amount);
      
      // Get account names for descriptions
      const fromAccount = db.prepare('SELECT name FROM accounts WHERE account_id = ?').get(fromAccountId);
      const toAccount = db.prepare('SELECT name FROM accounts WHERE account_id = ?').get(toAccountId);
      
      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }
      
      // Start transaction
      db.prepare('BEGIN').run();
      
      try {
        // Create "from" transaction (outgoing transfer)
        const fromTransactionStmt = db.prepare(`
          INSERT INTO transactions (account_id, date, amount, description, transaction_type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'transfer', 'cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        const fromTransactionId = fromTransactionStmt.run(
          fromAccountId,
          transferDate,
          -transferAmount,
          description || `Transfer to ${toAccount.name}`
        ).lastInsertRowid;
        
        // Create "to" transaction (incoming transfer)
        const toTransactionStmt = db.prepare(`
          INSERT INTO transactions (account_id, date, amount, description, transaction_type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'transfer', 'cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        const toTransactionId = toTransactionStmt.run(
          toAccountId,
          transferDate,
          transferAmount,
          description || `Transfer from ${fromAccount.name}`
        ).lastInsertRowid;
        
        // Update account balances
        const updateFromBalance = db.prepare(`
          UPDATE accounts 
          SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP
          WHERE account_id = ?
        `);
        
        const updateToBalance = db.prepare(`
          UPDATE accounts 
          SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE account_id = ?
        `);
        
        updateFromBalance.run(transferAmount, fromAccountId);
        updateToBalance.run(transferAmount, toAccountId);
        
        // Commit transaction
        db.prepare('COMMIT').run();
        
        return { fromTransactionId, toTransactionId, success: true };
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  });
  
  // Bulk assign payee to transactions
  ipcMain.handle('transactions:bulkAssignPayee', (_, transactionIds, payeeId) => {
    try {
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw new Error('No transaction IDs provided');
      }
      
      db.prepare('BEGIN').run();
      
      const updateStmt = db.prepare(`
        UPDATE transactions 
        SET payee_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE transaction_id = ?
      `);
      
      let updatedCount = 0;
      for (const transactionId of transactionIds) {
        const result = updateStmt.run(payeeId, transactionId);
        if (result.changes > 0) {
          updatedCount++;
        }
      }
      
      db.prepare('COMMIT').run();
      
      return { success: true, count: updatedCount };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('Error in bulk payee assignment:', error);
      throw error;
    }
  });
  
  // Auto-assign payees based on description patterns
  ipcMain.handle('transactions:autoAssignPayees', () => {
    try {
      const payeePatterns = [
        { pattern: /starbucks/i, name: 'Starbucks' },
        { pattern: /walmart/i, name: 'Walmart' },
        { pattern: /target/i, name: 'Target' },
        { pattern: /amazon/i, name: 'Amazon' },
        { pattern: /mcdonalds/i, name: "McDonald's" },
        { pattern: /costco/i, name: 'Costco' },
        { pattern: /labonne/i, name: "LaBonne's Markets" },
        { pattern: /dunkin/i, name: 'Dunkin' },
        { pattern: /shell/i, name: 'Shell' },
        { pattern: /exxon/i, name: 'Exxon' }
      ];
      
      function getOrCreatePayee(name) {
        const existing = db.prepare('SELECT payee_id FROM payees WHERE name = ?').get(name);
        if (existing) return existing.payee_id;
        
        const result = db.prepare(`
          INSERT INTO payees (name, created_at, updated_at)
          VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(name);
        return result.lastInsertRowid;
      }
      
      // Get transactions without payees
      const transactions = db.prepare(`
        SELECT transaction_id, description 
        FROM transactions 
        WHERE payee_id IS NULL 
        AND transaction_type != 'transfer'
        AND description IS NOT NULL
      `).all();
      
      db.prepare('BEGIN').run();
      
      let assignedCount = 0;
      const updateStmt = db.prepare(`
        UPDATE transactions 
        SET payee_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE transaction_id = ?
      `);
      
      for (const transaction of transactions) {
        for (const { pattern, name } of payeePatterns) {
          if (pattern.test(transaction.description)) {
            const payeeId = getOrCreatePayee(name);
            updateStmt.run(payeeId, transaction.transaction_id);
            assignedCount++;
            break;
          }
        }
      }
      
      db.prepare('COMMIT').run();
      
      return { success: true, count: assignedCount };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('Error in auto-assign payees:', error);
      throw error;
    }
  });

  // Backfill payees from transaction descriptions
  ipcMain.handle('transactions:backfillPayees', () => {
    try {
      // Get all transactions without payees
      const transactions = db.prepare(`
        SELECT transaction_id, description
        FROM transactions
        WHERE payee_id IS NULL
        AND description IS NOT NULL
        AND transaction_type != 'transfer'
      `).all();

      console.log(`Found ${transactions.length} transactions without payees`);

      if (transactions.length === 0) {
        return { success: true, processed: 0, linked: 0, created: 0 };
      }

      db.prepare('BEGIN').run();

      let linkedCount = 0;
      let createdCount = 0;

      const updateStmt = db.prepare(`
        UPDATE transactions
        SET payee_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = ?
      `);

      for (const transaction of transactions) {
        const desc = transaction.description.toUpperCase();

        // Extract payee name from common patterns
        let payeeName = null;

        // Pattern 1: "PURCHASE AUTHORIZED ON MM/DD PAYEE_NAME CARD"
        let match = desc.match(/PURCHASE AUTHORIZED ON \d{2}\/\d{2}\s+([A-Z0-9\s&'-]+?)(?:\s+CARD|\s+\d|$)/);
        if (match) {
          payeeName = match[1].trim();
        }

        // Pattern 2: "RECURRING PAYMENT AUTHORIZED ON MM/DD PAYEE_NAME"
        if (!payeeName) {
          match = desc.match(/RECURRING PAYMENT AUTHORIZED ON \d{2}\/\d{2}\s+([A-Z0-9\s&'-]+?)(?:\s+\d|$)/);
          if (match) {
            payeeName = match[1].trim();
          }
        }

        // Pattern 3: "PAYEE_NAME WEB_PAY" or "PAYEE_NAME ONLINE PMT"
        if (!payeeName) {
          match = desc.match(/^([A-Z][A-Z0-9\s&'-]+?)\s+(?:WEB_PAY|ONLINE PMT|AUTOPAY)/);
          if (match) {
            payeeName = match[1].trim();
          }
        }

        // Pattern 4: "PAYPAL INST XFER YYMMDD PAYEE_NAME"
        if (!payeeName) {
          match = desc.match(/PAYPAL INST XFER \d+\s+([A-Z0-9\s&'-]+?)(?:\s+\d|$)/);
          if (match) {
            payeeName = match[1].trim();
          }
        }

        // Pattern 5: Generic - first meaningful word group
        if (!payeeName && desc.length > 5) {
          match = desc.match(/^([A-Z][A-Z0-9\s&'-]{2,30}?)(?:\s+\d|\s+CARD|$)/);
          if (match) {
            payeeName = match[1].trim();
          }
        }

        if (payeeName && payeeName.length >= 3) {
          // Normalize payee name
          payeeName = payeeName
            .split(/\s+/)
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Check if payee exists (case-insensitive)
          let existing = db.prepare('SELECT payee_id FROM payees WHERE LOWER(name) = LOWER(?)').get(payeeName);

          let payeeId;
          if (existing) {
            payeeId = existing.payee_id;
            linkedCount++;
          } else {
            // Create new payee
            const result = db.prepare(`
              INSERT INTO payees (name, created_at, updated_at)
              VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(payeeName);
            payeeId = result.lastInsertRowid;
            createdCount++;
          }

          // Link transaction to payee
          updateStmt.run(payeeId, transaction.transaction_id);
        }
      }

      db.prepare('COMMIT').run();

      console.log(`Backfill complete: ${linkedCount} linked to existing, ${createdCount} new payees created`);

      return {
        success: true,
        processed: transactions.length,
        linked: linkedCount,
        created: createdCount
      };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('Error in backfill payees:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Transaction IPC handlers registered');
}
// Database-focused development script
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const Database = require('better-sqlite3');
const fs = require('fs');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');

// Load environment configuration
const config = require('./config').development;

// Add a flag to log verbose output during development
const VERBOSE = true;

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

  // Account details table for extended information (e.g., credit limits)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_details (
      account_id INTEGER PRIMARY KEY,
      credit_limit REAL,
      interest_rate REAL,
      statement_date INTEGER,
      due_date INTEGER,
      minimum_payment REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts (account_id) ON DELETE CASCADE
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
      icon TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure icon column exists on existing databases
  try {
    db.exec(`ALTER TABLE categories ADD COLUMN icon TEXT`);
  } catch (error) {
    // Ignore error if column already exists
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

  // Recurring bills table
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

  // Get extended account details (e.g., credit limit) from account_details
  ipcMain.handle('accounts:getDetails', (_, accountId) => {
    try {
      const stmt = db.prepare('SELECT * FROM account_details WHERE account_id = ?');
      const row = stmt.get(accountId);
      return row || null;
    } catch (error) {
      console.error(`Error getting account details for ${accountId}:`, error);
      throw error;
    }
  });

  // Upsert extended account details (currently focused on credit_limit and related fields)
  ipcMain.handle('accounts:saveDetails', (_, details) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO account_details (
          account_id,
          credit_limit,
          interest_rate,
          statement_date,
          due_date,
          minimum_payment
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          credit_limit = COALESCE(excluded.credit_limit, account_details.credit_limit),
          interest_rate = COALESCE(excluded.interest_rate, account_details.interest_rate),
          statement_date = COALESCE(excluded.statement_date, account_details.statement_date),
          due_date = COALESCE(excluded.due_date, account_details.due_date),
          minimum_payment = COALESCE(excluded.minimum_payment, account_details.minimum_payment),
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(
        details.account_id,
        details.credit_limit ?? null,
        details.interest_rate ?? null,
        details.statement_date ?? null,
        details.due_date ?? null,
        details.minimum_payment ?? null
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving account details:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Account IPC handlers registered');
}

// Set up IPC handlers for category operations
function setupCategoryHandlers() {
  // Get all categories
  ipcMain.handle('categories:getAll', () => {
    if (VERBOSE) console.log('Fetching all categories');
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
        INSERT INTO categories (name, type, parent_category_id)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(
        category.name,
        category.type,
        category.parent_category_id || null
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
        SET name = ?, type = ?, parent_category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE category_id = ?
      `);
      
      const result = stmt.run(
        category.name,
        category.type,
        category.parent_category_id || null,
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

// Set up IPC handlers for payee operations
function setupPayeeHandlers() {
  // Get all payees
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

  // Get payee by ID
  ipcMain.handle('payees:getById', (_, id) => {
    const stmt = db.prepare(`
      SELECT p.*, 
             pd.business_type, pd.website, pd.phone, pd.address,
             pd.auto_categorization_rules, pd.payment_methods, pd.typical_amount_range
      FROM payees p
      LEFT JOIN payee_details pd ON p.payee_id = pd.payee_id
      WHERE p.payee_id = ?
    `);
    const row = stmt.get(id);
    
    if (!row) return null;
    
    return {
      payee_id: row.payee_id,
      name: row.name,
      default_category_id: row.default_category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
    };
  });

  // Create payee
  ipcMain.handle('payees:create', (_, payee) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(payee.name, payee.default_category_id);
      const payeeId = result.lastInsertRowid;
      
      // Create payee details if provided
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

  // Update payee
  ipcMain.handle('payees:update', (_, id, payee) => {
    try {
      const stmt = db.prepare(`
        UPDATE payees 
        SET name = ?, default_category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE payee_id = ?
      `);
      const result = stmt.run(payee.name, payee.default_category_id, id);
      
      // Update or create payee details if provided
      if (payee.details) {
        const checkStmt = db.prepare('SELECT payee_id FROM payee_details WHERE payee_id = ?');
        const exists = checkStmt.get(id);
        
        if (exists) {
          const updateStmt = db.prepare(`
            UPDATE payee_details SET
              business_type = ?, website = ?, phone = ?, address = ?,
              auto_categorization_rules = ?, payment_methods = ?, typical_amount_range = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE payee_id = ?
          `);
          updateStmt.run(
            payee.details.business_type,
            payee.details.website,
            payee.details.phone,
            payee.details.address,
            payee.details.auto_categorization_rules,
            payee.details.payment_methods,
            payee.details.typical_amount_range,
            id
          );
        } else {
          const insertStmt = db.prepare(`
            INSERT INTO payee_details (
              payee_id, business_type, website, phone, address,
              auto_categorization_rules, payment_methods, typical_amount_range
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          insertStmt.run(
            id,
            payee.details.business_type,
            payee.details.website,
            payee.details.phone,
            payee.details.address,
            payee.details.auto_categorization_rules,
            payee.details.payment_methods,
            payee.details.typical_amount_range
          );
        }
      }
      
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error updating payee:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete payee
  ipcMain.handle('payees:delete', (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM payees WHERE payee_id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting payee:', error);
      return { success: false, error: error.message };
    }
  });

  // Bulk delete payees
  ipcMain.handle('payees:bulkDelete', (_, ids) => {
    try {
      const stmt = db.prepare('DELETE FROM payees WHERE payee_id = ?');
      let deletedCount = 0;

      for (const id of ids) {
        if (!id) continue;
        const result = stmt.run(id);
        if (result.changes > 0) {
          deletedCount++;
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error bulk deleting payees:', error);
      return { success: false, error: error.message };
    }
  });

  // Get enhanced payees (alias for getAll since it already includes stats)
  ipcMain.handle('payees:getEnhanced', () => {
    return ipcMain.handle('payees:getAll');
  });

  // Create payee if it doesn't exist (case-insensitive)
  ipcMain.handle('payees:createIfNotExists', (_, payee) => {
    try {
      // Check if payee exists (case-insensitive)
      const existing = db.prepare('SELECT payee_id FROM payees WHERE LOWER(name) = LOWER(?)').get(payee.name);

      if (existing) {
        return { id: existing.payee_id, created: false, success: true };
      }

      // Create new payee
      const stmt = db.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(payee.name, payee.default_category_id || null);
      const payeeId = result.lastInsertRowid;

      // Create payee details if provided
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

  console.log('Payee IPC handlers registered');
}

// Set up IPC handlers for bills and subscriptions
function setupBillsHandlers() {
  // Get all bills
  ipcMain.handle('bills:getAll', () => {
    const stmt = db.prepare(`
      SELECT b.*, 
             p.name as payee_name,
             c.name as category_name,
             a.name as account_name
      FROM recurring_bills b
      LEFT JOIN payees p ON b.payee_id = p.payee_id
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN accounts a ON b.account_id = a.account_id
      ORDER BY b.name ASC
    `);
    return stmt.all();
  });

  // Get active bills
  ipcMain.handle('bills:getActive', () => {
    const stmt = db.prepare(`
      SELECT b.*, 
             p.name as payee_name,
             c.name as category_name,
             a.name as account_name
      FROM recurring_bills b
      LEFT JOIN payees p ON b.payee_id = p.payee_id
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN accounts a ON b.account_id = a.account_id
      WHERE b.active = 1
      ORDER BY b.name ASC
    `);
    return stmt.all();
  });

  // Get bill by ID
  ipcMain.handle('bills:getById', (_, id) => {
    const stmt = db.prepare(`
      SELECT b.*, 
             p.name as payee_name,
             c.name as category_name,
             a.name as account_name
      FROM recurring_bills b
      LEFT JOIN payees p ON b.payee_id = p.payee_id
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN accounts a ON b.account_id = a.account_id
      WHERE b.bill_id = ?
    `);
    return stmt.get(id);
  });

  // Create bill
  ipcMain.handle('bills:create', (_, bill) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO recurring_bills (
          name, payee_id, category_id, account_id, amount, frequency,
          start_date, end_date, auto_pay, reminder_days, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        bill.name,
        bill.payee_id,
        bill.category_id,
        bill.account_id,
        bill.amount,
        bill.frequency,
        bill.start_date,
        bill.end_date,
        bill.auto_pay ? 1 : 0,
        bill.reminder_days,
        bill.active ? 1 : 0
      );
      return { id: result.lastInsertRowid, success: true };
    } catch (error) {
      console.error('Error creating bill:', error);
      return { success: false, error: error.message };
    }
  });

  // Update bill
  ipcMain.handle('bills:update', (_, id, bill) => {
    try {
      const stmt = db.prepare(`
        UPDATE recurring_bills SET
          name = ?, payee_id = ?, category_id = ?, account_id = ?, amount = ?,
          frequency = ?, start_date = ?, end_date = ?, auto_pay = ?,
          reminder_days = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE bill_id = ?
      `);
      const result = stmt.run(
        bill.name,
        bill.payee_id,
        bill.category_id,
        bill.account_id,
        bill.amount,
        bill.frequency,
        bill.start_date,
        bill.end_date,
        bill.auto_pay ? 1 : 0,
        bill.reminder_days,
        bill.active ? 1 : 0,
        id
      );
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error updating bill:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete bill
  ipcMain.handle('bills:delete', (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM recurring_bills WHERE bill_id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting bill:', error);
      return { success: false, error: error.message };
    }
  });

  // Get upcoming bills
  ipcMain.handle('bills:getUpcoming', (_, daysAhead = 30) => {
    const stmt = db.prepare(`
      SELECT b.*, 
             p.name as payee_name,
             c.name as category_name,
             a.name as account_name
      FROM recurring_bills b
      LEFT JOIN payees p ON b.payee_id = p.payee_id
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN accounts a ON b.account_id = a.account_id
      WHERE b.active = 1
      AND date(b.start_date) <= date('now', '+' || ? || ' days')
      ORDER BY b.start_date ASC
    `);
    return stmt.all(daysAhead);
  });

  console.log('Bills IPC handlers registered');
}

// Set up IPC handlers for loans
function setupLoansHandlers() {
  // Get all loans
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

  // Get loan by ID
  ipcMain.handle('loans:getById', (_, id) => {
    const stmt = db.prepare(`
      SELECT l.*, 
             a.name as account_name
      FROM loan_details l
      LEFT JOIN accounts a ON l.account_id = a.account_id
      WHERE l.loan_id = ?
    `);
    return stmt.get(id);
  });

  // Create new loan
  ipcMain.handle('loans:create', (_, loan) => {
    const stmt = db.prepare(`
      INSERT INTO loan_details (
        account_id, loan_type, original_amount, current_balance, 
        interest_rate, term_months, payment_amount, payment_frequency,
        start_date, maturity_date, escrow_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      loan.account_id,
      loan.loan_type,
      loan.original_amount,
      loan.current_balance || loan.original_amount,
      loan.interest_rate,
      loan.term_months,
      loan.payment_amount,
      loan.payment_frequency,
      loan.start_date,
      loan.maturity_date,
      loan.escrow_amount || 0
    );
    
    return { id: result.lastInsertRowid, loan_id: result.lastInsertRowid, success: true };
  });

  // Update loan
  ipcMain.handle('loans:update', (_, id, loan) => {
    const stmt = db.prepare(`
      UPDATE loan_details SET 
        account_id = ?, loan_type = ?, original_amount = ?, current_balance = ?,
        interest_rate = ?, term_months = ?, payment_amount = ?, payment_frequency = ?,
        start_date = ?, maturity_date = ?, escrow_amount = ?
      WHERE loan_id = ?
    `);
    
    const result = stmt.run(
      loan.account_id,
      loan.loan_type,
      loan.original_amount,
      loan.current_balance,
      loan.interest_rate,
      loan.term_months,
      loan.payment_amount,
      loan.payment_frequency,
      loan.start_date,
      loan.maturity_date,
      loan.escrow_amount || 0,
      id
    );
    
    return { success: result.changes > 0 };
  });

  // Delete loan
  ipcMain.handle('loans:delete', (_, id) => {
    const stmt = db.prepare('DELETE FROM loan_details WHERE loan_id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  });

  console.log('Loans IPC handlers registered');
}

let mainWindow;

function createWindow() {
  // Initialize database
  initDatabase();
  
  // Set up IPC handlers
  setupAccountHandlers();
  setupTransactionHandlers();
  setupCategoryHandlers();
  setupPayeeHandlers();
  setupBillsHandlers();
  setupLoansHandlers();
  setupBudgetHandlers();
  setupImportExportHandlers();
  
  // Initialize AI handlers
  try {
    const { initializeAIHandlers } = require('./electron/electron/ipc/aiHandlers.js');
    initializeAIHandlers(db);
    console.log('✓ Enhanced AI handlers initialized');
  } catch (error) {
    console.error('Error initializing AI handlers:', error);
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron', 'electron', 'preload.js')
    }
  });

  mainWindow.loadURL(`http://localhost:${config.port}`);
  
  // Only show DevTools in development mode
  if (config.showDevTools) {
    mainWindow.webContents.openDevTools();
  }
  
  // Add environment indicator to window title
  mainWindow.setTitle('Personal Finance Manager (Development)');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Clean up AI services
    try {
      const { cleanupAIServices } = require('./electron/electron/ipc/aiHandlers.js');
      await cleanupAIServices();
      console.log('✓ AI services cleaned up');
    } catch (error) {
      console.error('Error cleaning up AI services:', error);
    }
    
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
    environment: 'development',
    dbPath: dbPath,
    version: app.getVersion(),
    appPath: app.getAppPath(),
    userData: app.getPath('userData')
  };
});

// Setup Import/Export IPC handlers
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
        // Derive payee_id from description when possible
        if ((!transaction.payee_id || transaction.payee_id === null) && transaction.description) {
          const extractedName = extractPayeeName(transaction.description);
          if (extractedName) {
            try {
              const findStmt = db.prepare('SELECT payee_id FROM payees WHERE LOWER(name) = LOWER(?)');
              const existing = findStmt.get(extractedName);

              let payeeId;
              if (existing && existing.payee_id) {
                payeeId = existing.payee_id;
              } else {
                const insertPayeeStmt = db.prepare(`
                  INSERT INTO payees (name, default_category_id)
                  VALUES (?, NULL)
                `);
                const payeeResult = insertPayeeStmt.run(extractedName);
                payeeId = payeeResult.lastInsertRowid;
              }

              transaction.payee_id = payeeId;
            } catch (e) {
              console.error('Error deriving payee during import:', e);
            }
          }
        }

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
  
  // Export transactions to CSV
  ipcMain.handle('export:transactionsToCSV', async (_, options) => {
    try {
      const { filePath, filters } = options;
      // Build a comprehensive query to get transaction data with related info
      let query = 'SELECT t.*, a.name as account_name, a.currency, c.name as category_name, p.name as payee_name FROM transactions t';
      query += ' LEFT JOIN accounts a ON t.account_id = a.account_id';
      query += ' LEFT JOIN categories c ON t.category_id = c.category_id';
      query += ' LEFT JOIN payees p ON t.payee_id = p.payee_id';
      
      const whereConditions = [];
      const params = [];
      
      if (filters) {
        if (filters.startDate && filters.endDate) {
          whereConditions.push('t.date >= ? AND t.date <= ?');
          params.push(filters.startDate, filters.endDate);
        }
        
        if (filters.accountId) {
          whereConditions.push('t.account_id = ?');
          params.push(filters.accountId);
        }
        
        if (filters.transactionType) {
          whereConditions.push('t.transaction_type = ?');
          params.push(filters.transactionType);
        }
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY t.date DESC';
      
      // Execute the query
      const stmt = db.prepare(query);
      const transactions = stmt.all(...params);
      
      // Transform data for CSV export with enhanced fields
      const csvData = transactions.map(t => {
        // Format amount with 2 decimal places
        const formattedAmount = t.amount.toFixed(2);
        
        // Format date consistently
        let formattedDate = t.date;
        try {
          const date = new Date(t.date);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        } catch (e) {
          // Keep original date if parsing fails
        }
        
        // Format transaction type with first letter capitalized
        const formattedType = t.transaction_type.charAt(0).toUpperCase() + 
          t.transaction_type.slice(1);
        
        // Format status with first letter capitalized
        const formattedStatus = t.status.charAt(0).toUpperCase() + 
          t.status.slice(1);
        
        return {
          Date: formattedDate,
          Account: t.account_name || `Account ${t.account_id}`,
          Description: t.description || '',
          Category: t.category_name || '',
          Amount: formattedAmount,
          Currency: t.currency || 'USD',
          Type: formattedType,
          Status: formattedStatus,
          'Transaction ID': t.transaction_id
        };
      });
      
      // Add summary data at the end
      const totalIncome = transactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalExpense = transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const netAmount = totalIncome + totalExpense; // Expense is already negative
      
      // Add a few empty rows before summary
      csvData.push({});
      csvData.push({});
      
      // Add summary data
      csvData.push({
        Date: 'SUMMARY',
        Account: '',
        Description: '',
        Category: '',
        Amount: '',
        Currency: '',
        Type: '',
        Status: '',
        'Transaction ID': ''
      });
      
      csvData.push({
        Date: 'Total Income',
        Account: '',
        Description: '',
        Category: '',
        Amount: totalIncome.toFixed(2),
        Currency: '',
        Type: '',
        Status: '',
        'Transaction ID': ''
      });
      
      csvData.push({
        Date: 'Total Expenses',
        Account: '',
        Description: '',
        Category: '',
        Amount: totalExpense.toFixed(2),
        Currency: '',
        Type: '',
        Status: '',
        'Transaction ID': ''
      });
      
      csvData.push({
        Date: 'Net Amount',
        Account: '',
        Description: '',
        Category: '',
        Amount: netAmount.toFixed(2),
        Currency: '',
        Type: '',
        Status: '',
        'Transaction ID': ''
      });
      
      // Convert to CSV with enhanced options
      const csv = Papa.unparse(csvData, {
        quotes: true, // Quote all fields for better compatibility
        header: true,
        newline: '\r\n', // Standard newline for most spreadsheet applications
        delimiter: ',',
        skipEmptyLines: true
      });
      
      // Add UTF-8 BOM for Excel compatibility
      const csvWithBOM = '\ufeff' + csv;
      
      // Write to file
      fs.writeFileSync(filePath, csvWithBOM, 'utf8');
      
      return {
        success: true,
        path: filePath,
        count: transactions.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  // Export transactions to Excel
  ipcMain.handle('export:transactionsToExcel', async (_, options) => {
    try {
      const { filePath, filters } = options;
      
      // Build a comprehensive query to get transaction data with related info
      let query = 'SELECT t.*, a.name as account_name, a.currency, c.name as category_name, p.name as payee_name FROM transactions t';
      query += ' LEFT JOIN accounts a ON t.account_id = a.account_id';
      query += ' LEFT JOIN categories c ON t.category_id = c.category_id';
      query += ' LEFT JOIN payees p ON t.payee_id = p.payee_id';
      
      const whereConditions = [];
      const params = [];
      
      if (filters) {
        if (filters.startDate && filters.endDate) {
          whereConditions.push('t.date >= ? AND t.date <= ?');
          params.push(filters.startDate, filters.endDate);
        }
        
        if (filters.accountId) {
          whereConditions.push('t.account_id = ?');
          params.push(filters.accountId);
        }
        
        if (filters.transactionType) {
          whereConditions.push('t.transaction_type = ?');
          params.push(filters.transactionType);
        }
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Sort by date, newest first
      query += ' ORDER BY t.date DESC';
      
      // Execute the query
      const stmt = db.prepare(query);
      const transactions = stmt.all(...params);
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Personal Finance Manager';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();
      
      // Add properties
      workbook.properties.date1904 = false;
      workbook.properties.title = 'Transaction Export';
      workbook.properties.subject = 'Financial Data';
      workbook.properties.keywords = 'finance,transactions,export';
      workbook.properties.category = 'Finance';
      
      // Create transactions sheet
      const worksheet = workbook.addWorksheet('Transactions', {
        properties: { tabColor: { argb: 'FF4F81BD' } }
      });
      
      // Define columns with styling
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Account', key: 'account', width: 20 },
        { header: 'Description', key: 'description', width: 35 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Status', key: 'status', width: 12 }
      ];
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.height = 20;
      
      // Add light blue fill to header
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' }
        };
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Center align headers
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
      
      // Default currency for formatting (fallback to USD)
      let defaultCurrency = 'USD';
      if (transactions.length > 0 && transactions[0].currency) {
        defaultCurrency = transactions[0].currency;
      }
      
      // Add data rows with conditional formatting
      transactions.forEach((t, index) => {
        const rowNum = index + 2; // +2 because header is row 1 and we're 0-indexed
        
        const row = worksheet.addRow({
          date: t.date,
          account: t.account_name || `Account ${t.account_id}`,
          description: t.description || '',
          category: t.category_name || '',
          amount: t.amount,
          type: t.transaction_type,
          status: t.status
        });
        
        // Style the amount cell based on transaction type
        const amountCell = row.getCell('amount');
        
        // Format amount with currency
        const currency = t.currency || defaultCurrency;
        amountCell.numFmt = `_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)`;
        
        // Color code by transaction type
        if (t.transaction_type === 'expense') {
          amountCell.font = { color: { argb: 'FFFF0000' } }; // Red for expense
        } else if (t.transaction_type === 'income') {
          amountCell.font = { color: { argb: 'FF006100' } }; // Green for income
        }
        
        // Right-align amount cells
        amountCell.alignment = { horizontal: 'right' };
        
        // Add alternating row colors for readability
        if (index % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' } // Light gray
            };
          });
        }
      });
      
      // Add totals and summary
      worksheet.addRow([]); // Empty row for spacing
      
      // Calculate summary statistics
      const totalIncome = transactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalExpense = transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const netAmount = totalIncome + totalExpense; // Expense amounts are already negative
      
      // Add summary section with formatting
      const summaryRow = worksheet.addRow(['Summary', '', '', '', '', '', '']);
      summaryRow.font = { bold: true, size: 12 };
      worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 7);
      summaryRow.getCell(1).alignment = { horizontal: 'center' };
      
      // Add total rows
      const incomeRow = worksheet.addRow(['Total Income', '', '', '', totalIncome, '', '']);
      const expenseRow = worksheet.addRow(['Total Expenses', '', '', '', totalExpense, '', '']);
      const netRow = worksheet.addRow(['Net Amount', '', '', '', netAmount, '', '']);
      netRow.font = { bold: true };
      
      // Format total amount cells
      [incomeRow, expenseRow, netRow].forEach(row => {
        const cell = row.getCell(5); // 'Amount' column
        cell.numFmt = `_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)`;
        cell.alignment = { horizontal: 'right' };
      });
      
      // Color code summary amounts
      incomeRow.getCell(5).font = { color: { argb: 'FF006100' } }; // Green
      expenseRow.getCell(5).font = { color: { argb: 'FFFF0000' } }; // Red
      
      if (netAmount >= 0) {
        netRow.getCell(5).font = { bold: true, color: { argb: 'FF006100' } }; // Green
      } else {
        netRow.getCell(5).font = { bold: true, color: { argb: 'FFFF0000' } }; // Red
      }
      
      // Add auto-filter to header row
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 }
      };
      
      // Freeze the header row
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }
      ];
      
      // Add a summary sheet with more analysis
      if (transactions.length > 0) {
        const summarySheet = workbook.addWorksheet('Summary', {
          properties: { tabColor: { argb: 'FF00B050' } }
        });
        
        // Add title
        const titleRow = summarySheet.addRow(['Transaction Summary']);
        titleRow.font = { size: 16, bold: true };
        summarySheet.mergeCells(titleRow.number, 1, titleRow.number, 5);
        titleRow.getCell(1).alignment = { horizontal: 'center' };
        
        // Add generated date
        summarySheet.addRow(['Generated on:', new Date().toLocaleDateString()]);
        summarySheet.addRow([`Date Range: ${filters?.startDate || 'All'} to ${filters?.endDate || 'All'}`]);
        
        summarySheet.addRow([]); // Spacing
        
        // Add summary statistics
        summarySheet.addRow(['Total Transactions:', transactions.length]);
        summarySheet.addRow(['Total Income:', totalIncome]);
        summarySheet.addRow(['Total Expenses:', totalExpense]);
        summarySheet.addRow(['Net Amount:', netAmount]);
        
        // Style amount cells
        for (let i = 5; i <= 7; i++) {
          const cell = summarySheet.getCell(`B${i}`);
          cell.numFmt = `_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)`;
        }
        
        // Add transactions by category analysis
        summarySheet.addRow([]); // Spacing
        
        const categoryHeader = summarySheet.addRow(['Transactions by Category']);
        categoryHeader.font = { size: 14, bold: true };
        summarySheet.mergeCells(categoryHeader.number, 1, categoryHeader.number, 5);
        categoryHeader.getCell(1).alignment = { horizontal: 'center' };
        
        // Add category headers
        const categoryColumns = summarySheet.addRow(['Category', 'Income', 'Expenses', 'Net', 'Count']);
        categoryColumns.font = { bold: true };
        categoryColumns.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' }
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        
        // Group transactions by category
        const categoryData = {};
        
        transactions.forEach(t => {
          const category = t.category_name || 'Uncategorized';
          
          if (!categoryData[category]) {
            categoryData[category] = {
              income: 0,
              expense: 0,
              net: 0,
              count: 0
            };
          }
          
          if (t.transaction_type === 'income') {
            categoryData[category].income += t.amount;
          } else if (t.transaction_type === 'expense') {
            categoryData[category].expense += t.amount; // amount is already negative
          }
          
          categoryData[category].count++;
        });
        
        // Calculate net for each category and add rows
        Object.entries(categoryData)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([category, data]) => {
            data.net = data.income + data.expense; // expense is already negative
            
            const row = summarySheet.addRow([
              category,
              data.income,
              data.expense,
              data.net,
              data.count
            ]);
            
            // Style amount cells
            for (let col = 2; col <= 4; col++) {
              const cell = row.getCell(col);
              cell.numFmt = `_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)`;
            }
          });
        
        // Set column widths
        summarySheet.columns = [
          { width: 20 }, // Category
          { width: 12 }, // Income
          { width: 12 }, // Expenses
          { width: 12 }, // Net
          { width: 8 }  // Count
        ];
      }
      
      // Write to file
      await workbook.xlsx.writeFile(filePath);
      
      return {
        success: true,
        path: filePath,
        count: transactions.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('Import/Export IPC handlers registered');
}
