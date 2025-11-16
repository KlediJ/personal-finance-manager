#!/usr/bin/env node

/**
 * Diagnostic script to check payee-transaction linking in the database
 */

const path = require('path');
const fs = require('fs');

// Dynamically import better-sqlite3
const Database = require('better-sqlite3');

const dbPath = '/mnt/c/Users/joana/AppData/Roaming/personal-finance-manager/database/finance_manager.db';

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

console.log('Opening database:', dbPath);
const db = new Database(dbPath);

console.log('\n=== PAYEE-TRANSACTION LINKING DIAGNOSTIC ===\n');

// 1. Check transaction statistics
console.log('1. TRANSACTION STATISTICS:');
const transactionStats = db.prepare(`
  SELECT
    COUNT(*) as total_transactions,
    COUNT(payee_id) as transactions_with_payee_id,
    COUNT(*) - COUNT(payee_id) as transactions_without_payee_id
  FROM transactions
`).get();
console.log('   Total transactions:', transactionStats.total_transactions);
console.log('   Transactions with payee_id:', transactionStats.transactions_with_payee_id);
console.log('   Transactions without payee_id:', transactionStats.transactions_without_payee_id);

// 2. Check payee statistics
console.log('\n2. PAYEE STATISTICS:');
const payeeStats = db.prepare(`
  SELECT COUNT(*) as total_payees FROM payees
`).get();
console.log('   Total payees:', payeeStats.total_payees);

// 3. Sample payees
console.log('\n3. SAMPLE PAYEES:');
const samplePayees = db.prepare(`
  SELECT payee_id, name FROM payees LIMIT 5
`).all();
samplePayees.forEach(p => {
  console.log(`   - ID: ${p.payee_id}, Name: ${p.name}`);
});

// 4. Sample transactions with payee_id
console.log('\n4. SAMPLE TRANSACTIONS WITH PAYEE_ID:');
const transactionsWithPayee = db.prepare(`
  SELECT transaction_id, description, payee_id
  FROM transactions
  WHERE payee_id IS NOT NULL
  LIMIT 5
`).all();
if (transactionsWithPayee.length === 0) {
  console.log('   NO TRANSACTIONS HAVE PAYEE_ID SET!');
} else {
  transactionsWithPayee.forEach(t => {
    console.log(`   - TX ID: ${t.transaction_id}, Description: "${t.description}", Payee ID: ${t.payee_id}`);
  });
}

// 5. Check JOIN results
console.log('\n5. TESTING JOIN QUERY (transactions LEFT JOIN payees):');
const joinTest = db.prepare(`
  SELECT
    t.transaction_id,
    t.description,
    t.payee_id,
    p.name as payee_name
  FROM transactions t
  LEFT JOIN payees p ON t.payee_id = p.payee_id
  LIMIT 5
`).all();
joinTest.forEach(t => {
  console.log(`   - TX ${t.transaction_id}: "${t.description}" | payee_id: ${t.payee_id || 'NULL'} | payee_name: ${t.payee_name || 'NULL'}`);
});

// 6. Check for broken foreign keys
console.log('\n6. CHECKING FOR BROKEN FOREIGN KEYS:');
const brokenFKs = db.prepare(`
  SELECT t.transaction_id, t.description, t.payee_id
  FROM transactions t
  WHERE t.payee_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM payees p WHERE p.payee_id = t.payee_id)
`).all();
if (brokenFKs.length > 0) {
  console.log(`   FOUND ${brokenFKs.length} BROKEN FOREIGN KEYS!`);
  brokenFKs.forEach(t => {
    console.log(`   - TX ${t.transaction_id} references non-existent payee_id: ${t.payee_id}`);
  });
} else {
  console.log('   No broken foreign keys found.');
}

// 7. Test the getEnhancedPayees query
console.log('\n7. TESTING ENHANCED PAYEES QUERY:');
const enhancedPayees = db.prepare(`
  SELECT
    p.payee_id,
    p.name,
    COUNT(t.transaction_id) as transaction_count,
    SUM(t.amount) as total_amount
  FROM payees p
  LEFT JOIN transactions t ON p.payee_id = t.payee_id
  GROUP BY p.payee_id
  ORDER BY p.name ASC
  LIMIT 5
`).all();
console.log('   Sample enhanced payees:');
enhancedPayees.forEach(p => {
  console.log(`   - ${p.name}: ${p.transaction_count} transactions, Total: ${p.total_amount || 0} cents`);
});

// 8. Check what the frontend would see
console.log('\n8. WHAT PAYEES PAGE WOULD DISPLAY:');
const payeesPageData = db.prepare(`
  SELECT
    p.*,
    pd.*,
    COUNT(t.transaction_id) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as average_amount,
    MAX(t.date) as last_transaction_date
  FROM payees p
  LEFT JOIN payee_details pd ON p.payee_id = pd.payee_id
  LEFT JOIN transactions t ON p.payee_id = t.payee_id
  GROUP BY p.payee_id
  ORDER BY p.name ASC
  LIMIT 5
`).all();
console.log('   Payees with stats (what PayeesPage.tsx would show):');
payeesPageData.forEach(p => {
  console.log(`   - ${p.name}: transaction_count = ${p.transaction_count}, total_amount = ${p.total_amount || 0}`);
});

// 9. Check what Dashboard would see
console.log('\n9. WHAT DASHBOARD WOULD SHOW FOR PAYEES:');
const dashboardPayeeQuery = db.prepare(`
  SELECT
    t.transaction_id,
    t.description,
    t.amount,
    t.payee_id,
    p.name as payee_name
  FROM transactions t
  LEFT JOIN payees p ON t.payee_id = p.payee_id
  WHERE t.transaction_type = 'expense'
  LIMIT 10
`).all();
console.log('   Sample expense transactions:');
dashboardPayeeQuery.forEach(t => {
  console.log(`   - "${t.description}": payee_name = "${t.payee_name || 'No payee'}", payee_id = ${t.payee_id || 'NULL'}`);
});

console.log('\n=== DIAGNOSTIC COMPLETE ===\n');

db.close();
