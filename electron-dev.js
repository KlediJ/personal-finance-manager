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
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const Database = require('better-sqlite3');
const fs = require('fs');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');

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
  setupImportExportHandlers();
  
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

// Setup Import/Export IPC handlers
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
  
  // Export transactions to CSV
  ipcMain.handle('export:transactionsToCSV', async (_, options) => {
    try {
      const { filePath, filters } = options;
      // Build a comprehensive query to get transaction data with related info
      let query = 'SELECT t.*, a.name as account_name, a.currency, c.name as category_name FROM transactions t';
      query += ' LEFT JOIN accounts a ON t.account_id = a.account_id';
      query += ' LEFT JOIN categories c ON t.category_id = c.category_id';
      
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
      let query = 'SELECT t.*, a.name as account_name, a.currency, c.name as category_name FROM transactions t';
      query += ' LEFT JOIN accounts a ON t.account_id = a.account_id';
      query += ' LEFT JOIN categories c ON t.category_id = c.category_id';
      
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
