const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

// This script will extract payees from existing transaction descriptions
// and assign them to transactions that don't already have payees

// Determine database path
let dbPath;
if (app && app.getPath) {
  // Running in Electron
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'database', 'finance_manager.db');
} else {
  // Running as standalone script
  const os = require('os');
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'personal-finance-manager');
  dbPath = path.join(userDataPath, 'database', 'finance_manager.db');
}

console.log('Database path:', dbPath);

// PayeeExtractor logic (copied from the TypeScript version)
class PayeeExtractor {
  static extractPayeeFromDescription(description) {
    if (!description || description.trim().length === 0) {
      return null;
    }

    const desc = description.trim().toUpperCase();
    
    // Common bank transaction patterns
    const patterns = [
      // "PURCHASE AUTHORIZED ON MM/DD MERCHANT NAME"
      /PURCHASE\s+AUTHORIZED\s+ON\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "DEBIT CARD PURCHASE MM/DD MERCHANT NAME"
      /DEBIT\s+CARD\s+PURCHASE\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "ATM WITHDRAWAL MM/DD LOCATION"
      /ATM\s+WITHDRAWAL\s+\d{2}\/\d{2}\s+(.+?)(?:\s+CARD\s+\d+)?$/,
      
      // "CHECK #123 TO PAYEE NAME"
      /CHECK\s+#?\d+\s+TO\s+(.+?)$/,
      
      // "AUTOMATIC PAYMENT TO PAYEE NAME"
      /AUTOMATIC\s+PAYMENT\s+TO\s+(.+?)$/,
      
      // "ONLINE PAYMENT TO PAYEE NAME"
      /ONLINE\s+PAYMENT\s+TO\s+(.+?)$/,
      
      // "TRANSFER TO PAYEE NAME"
      /TRANSFER\s+TO\s+(.+?)$/,
      
      // "TRANSFER FROM PAYEE NAME"
      /TRANSFER\s+FROM\s+(.+?)$/,
      
      // "DIRECT DEPOSIT FROM PAYEE NAME"
      /DIRECT\s+DEPOSIT\s+FROM\s+(.+?)$/,
      
      // "WITHDRAWAL AT MERCHANT NAME"
      /WITHDRAWAL\s+AT\s+(.+?)$/,
      
      // "PAYMENT TO PAYEE NAME"
      /PAYMENT\s+TO\s+(.+?)$/,
      
      // Generic "MERCHANT NAME LOCATION" pattern
      /^([A-Z0-9\\s&'-]+?)(?:\s+[A-Z]{2}\s+\d{5})?(?:\s+CARD\s+\d+)?$/,
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        return this.cleanPayeeName(match[1]);
      }
    }

    // If no pattern matches, try to clean the whole description
    const cleaned = this.cleanPayeeName(desc);
    
    // Only return if it looks like a reasonable payee name (not just numbers or too short)
    if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  }

  static cleanPayeeName(rawName) {
    let cleaned = rawName.trim();
    
    // Remove common bank codes and suffixes
    const removePatterns = [
      /\s+CARD\s+\d+.*$/i,
      /\s+\d{4,}.*$/,  // Remove long numbers at end
      /\s+[A-Z]{2}\s+\d{5}.*$/,  // Remove state/zip
      /\s+PURCHASE.*$/i,
      /\s+PAYMENT.*$/i,
      /\s+DEPOSIT.*$/i,
      /\s+WITHDRAWAL.*$/i,
      /\s+TRANSFER.*$/i,
      /\s+AUTHORIZED.*$/i,
      /\s+TRANSACTION.*$/i,
      /\s+#\d+.*$/,  // Remove reference numbers
    ];

    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/[*#]+/g, '')  // Remove asterisks and hashes
      .replace(/^\W+|\W+$/g, '')  // Remove leading/trailing non-word chars
      .trim();
    
    // Convert to title case for better readability
    cleaned = this.toTitleCase(cleaned);
    
    return cleaned;
  }

  static toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}

function backfillPayees() {
  let db;
  try {
    // Open database
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    console.log('Connected to database successfully');
    
    // Get all transactions that don't have payees but have descriptions
    const transactionsToProcess = db.prepare(`
      SELECT transaction_id, description 
      FROM transactions 
      WHERE payee_id IS NULL 
        AND description IS NOT NULL 
        AND description != ''
        AND transaction_type != 'transfer'
    `).all();
    
    console.log(`Found ${transactionsToProcess.length} transactions to process`);
    
    if (transactionsToProcess.length === 0) {
      console.log('No transactions need payee extraction');
      return;
    }
    
    // Prepare statements
    const findPayeeStmt = db.prepare('SELECT payee_id, name FROM payees WHERE name = ?');
    const createPayeeStmt = db.prepare('INSERT INTO payees (name) VALUES (?) RETURNING payee_id');
    const updateTransactionStmt = db.prepare('UPDATE transactions SET payee_id = ? WHERE transaction_id = ?');
    
    let processedCount = 0;
    let payeeExtractedCount = 0;
    let newPayeeCount = 0;
    let existingPayeeCount = 0;
    
    // Begin transaction for all updates
    const updateTransaction = db.transaction(() => {
      for (const transaction of transactionsToProcess) {
        processedCount++;
        
        // Extract payee name from description
        const extractedPayeeName = PayeeExtractor.extractPayeeFromDescription(transaction.description);
        
        if (!extractedPayeeName) {
          continue;
        }
        
        payeeExtractedCount++;
        console.log(`Transaction ${transaction.transaction_id}: "${transaction.description}" -> "${extractedPayeeName}"`);
        
        // Check if payee already exists
        let payee = findPayeeStmt.get(extractedPayeeName);
        
        if (!payee) {
          // Create new payee
          const result = createPayeeStmt.get(extractedPayeeName);
          payee = { payee_id: result.payee_id, name: extractedPayeeName };
          newPayeeCount++;
          console.log(`  Created new payee: ${extractedPayeeName} (ID: ${payee.payee_id})`);
        } else {
          existingPayeeCount++;
          console.log(`  Found existing payee: ${extractedPayeeName} (ID: ${payee.payee_id})`);
        }
        
        // Update transaction with payee_id
        updateTransactionStmt.run(payee.payee_id, transaction.transaction_id);
      }
    });
    
    // Execute the transaction
    updateTransaction();
    
    console.log('\n=== Backfill Summary ===');
    console.log(`Transactions processed: ${processedCount}`);
    console.log(`Payees extracted: ${payeeExtractedCount}`);
    console.log(`New payees created: ${newPayeeCount}`);
    console.log(`Existing payees used: ${existingPayeeCount}`);
    console.log('Payee backfill completed successfully!');
    
  } catch (error) {
    console.error('Error during payee backfill:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the backfill
if (require.main === module) {
  backfillPayees();
}

module.exports = { backfillPayees };