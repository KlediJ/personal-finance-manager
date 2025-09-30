const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

// Database path - use the same path as the main app
const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'personal-finance-manager', 'finance.db');

console.log('Using database:', dbPath);

const db = new Database(dbPath);

// Common payee patterns - you can expand this list
const payeePatterns = [
  { pattern: /starbucks/i, name: 'Starbucks' },
  { pattern: /walmart/i, name: 'Walmart' },
  { pattern: /target/i, name: 'Target' },
  { pattern: /amazon/i, name: 'Amazon' },
  { pattern: /mcdonalds/i, name: "McDonald's" },
  { pattern: /costco/i, name: 'Costco' },
  { pattern: /home depot/i, name: 'Home Depot' },
  { pattern: /lowes/i, name: "Lowe's" },
  { pattern: /kroger/i, name: 'Kroger' },
  { pattern: /safeway/i, name: 'Safeway' },
  { pattern: /shell/i, name: 'Shell' },
  { pattern: /exxon/i, name: 'Exxon' },
  { pattern: /bp\s/i, name: 'BP' },
  { pattern: /chevron/i, name: 'Chevron' },
  { pattern: /labonne/i, name: "LaBonne's Markets" },
  { pattern: /stop\s*&\s*shop/i, name: 'Stop & Shop' },
  { pattern: /big\s*y/i, name: 'Big Y' },
  { pattern: /dunkin/i, name: 'Dunkin' },
  { pattern: /subway/i, name: 'Subway' },
  { pattern: /pizza/i, name: 'Pizza Restaurant' },
  { pattern: /gas\s*station/i, name: 'Gas Station' },
  { pattern: /pharmacy/i, name: 'Pharmacy' },
  { pattern: /grocery/i, name: 'Grocery Store' }
];

function getOrCreatePayee(name) {
  // Check if payee already exists
  const existingPayee = db.prepare('SELECT payee_id FROM payees WHERE name = ?').get(name);
  
  if (existingPayee) {
    return existingPayee.payee_id;
  }
  
  // Create new payee
  const result = db.prepare(`
    INSERT INTO payees (name, created_at, updated_at)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(name);
  
  console.log(`Created new payee: ${name} (ID: ${result.lastInsertRowid})`);
  return result.lastInsertRowid;
}

function assignPayeesToTransactions() {
  console.log('Starting payee auto-assignment...');
  
  // Get all transactions without payees
  const transactions = db.prepare(`
    SELECT transaction_id, description 
    FROM transactions 
    WHERE payee_id IS NULL 
    AND transaction_type != 'transfer'
    AND description IS NOT NULL
  `).all();
  
  console.log(`Found ${transactions.length} transactions without payees`);
  
  const updateStmt = db.prepare(`
    UPDATE transactions 
    SET payee_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE transaction_id = ?
  `);
  
  let assignedCount = 0;
  
  // Start transaction
  db.prepare('BEGIN').run();
  
  try {
    for (const transaction of transactions) {
      const description = transaction.description.trim();
      
      // Try to match against known patterns
      for (const { pattern, name } of payeePatterns) {
        if (pattern.test(description)) {
          const payeeId = getOrCreatePayee(name);
          updateStmt.run(payeeId, transaction.transaction_id);
          console.log(`Assigned "${name}" to transaction: ${description}`);
          assignedCount++;
          break;
        }
      }
    }
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    console.log(`Successfully assigned payees to ${assignedCount} transactions`);
    
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('Error during payee assignment:', error);
    throw error;
  }
}

function suggestPayeesForUnmatched() {
  console.log('\nSuggesting payees for unmatched transactions...');
  
  // Get transactions that still don't have payees
  const unmatchedTransactions = db.prepare(`
    SELECT transaction_id, description 
    FROM transactions 
    WHERE payee_id IS NULL 
    AND transaction_type != 'transfer'
    AND description IS NOT NULL
    ORDER BY description
  `).all();
  
  if (unmatchedTransactions.length === 0) {
    console.log('All transactions have payees assigned!');
    return;
  }
  
  console.log(`\nFound ${unmatchedTransactions.length} transactions that need manual payee assignment:`);
  console.log('='.repeat(80));
  
  // Group similar descriptions
  const descriptionGroups = {};
  
  for (const transaction of unmatchedTransactions) {
    const key = transaction.description.toLowerCase().trim();
    if (!descriptionGroups[key]) {
      descriptionGroups[key] = [];
    }
    descriptionGroups[key].push(transaction);
  }
  
  // Show grouped suggestions
  Object.entries(descriptionGroups).forEach(([description, transactions]) => {
    console.log(`\nDescription: "${description}"`);
    console.log(`Count: ${transactions.length} transaction(s)`);
    console.log(`Transaction IDs: ${transactions.map(t => t.transaction_id).join(', ')}`);
    
    // Suggest a payee name based on the description
    const suggestedName = description
      .replace(/\d+/g, '') // Remove numbers
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
      
    if (suggestedName) {
      console.log(`Suggested payee name: "${suggestedName}"`);
    }
    console.log('-'.repeat(40));
  });
  
  console.log(`\nTo manually assign payees, you can use the payees management page in the app.`);
}

// Run the script
try {
  assignPayeesToTransactions();
  suggestPayeesForUnmatched();
  
  console.log('\nPayee assignment complete!');
  console.log('Restart the application to see the updated payee information.');
  
} catch (error) {
  console.error('Script failed:', error);
  process.exit(1);
} finally {
  db.close();
}