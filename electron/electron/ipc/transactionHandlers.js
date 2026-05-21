"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTransactionHandlers = setupTransactionHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
const DatabaseConnection_1 = require("../../src/data-storage/database/DatabaseConnection");
const AccountingService_1 = require("../../src/data-storage/services/AccountingService");
const exportHandlers_1 = require("./exportHandlers");
function setupTransactionHandlers() {
    const transactionRepository = DatabaseManager_1.DatabaseManager.getInstance().getTransactionRepository();
    const accountingService = new AccountingService_1.AccountingService();
    // Ensure export-related IPC handlers are registered once when transaction handlers are set up.
    (0, exportHandlers_1.setupExportHandlers)();
    // Get all transactions
    electron_1.ipcMain.handle('transactions:getAll', async () => {
        try {
            return transactionRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all transactions:', error);
            throw error;
        }
    });
    // Get transaction by ID
    electron_1.ipcMain.handle('transactions:getById', async (_, id) => {
        try {
            return transactionRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting transaction ${id}:`, error);
            throw error;
        }
    });
    // Get transactions by account ID
    electron_1.ipcMain.handle('transactions:getByAccountId', async (_, accountId) => {
        try {
            return transactionRepository.getByAccountId(accountId);
        }
        catch (error) {
            console.error(`Error getting transactions for account ${accountId}:`, error);
            throw error;
        }
    });
    // Get transactions by date range
    electron_1.ipcMain.handle('transactions:getByDateRange', async (_, startDate, endDate) => {
        try {
            return transactionRepository.getByDateRange(startDate, endDate);
        }
        catch (error) {
            console.error(`Error getting transactions between ${startDate} and ${endDate}:`, error);
            throw error;
        }
    });
    // Get recent transactions
    electron_1.ipcMain.handle('transactions:getRecent', async (_, limit) => {
        try {
            return transactionRepository.getRecent(limit);
        }
        catch (error) {
            console.error(`Error getting recent transactions (limit: ${limit}):`, error);
            throw error;
        }
    });
    // Search transactions by description
    electron_1.ipcMain.handle('transactions:searchByDescription', async (_, term) => {
        try {
            return transactionRepository.searchByDescription(term);
        }
        catch (error) {
            console.error(`Error searching transactions with term "${term}":`, error);
            throw error;
        }
    });
    // Create transaction with double-entry accounting
    electron_1.ipcMain.handle('transactions:create', async (_, transaction) => {
        try {
            const result = accountingService.createTransaction(transaction);
            return result;
        }
        catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    });
    // Update transaction with double-entry accounting
    electron_1.ipcMain.handle('transactions:update', async (_, id, transaction) => {
        try {
            const success = accountingService.updateTransaction(id, transaction);
            return { success };
        }
        catch (error) {
            console.error(`Error updating transaction ${id}:`, error);
            throw error;
        }
    });
    // Delete transaction with double-entry accounting
    electron_1.ipcMain.handle('transactions:delete', async (_, id) => {
        try {
            const success = accountingService.deleteTransaction(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting transaction ${id}:`, error);
            throw error;
        }
    });
    // Get transactions by category
    electron_1.ipcMain.handle('transactions:getByCategory', async (_, categoryId) => {
        try {
            return transactionRepository.getByCategory(categoryId);
        }
        catch (error) {
            console.error(`Error getting transactions for category ${categoryId}:`, error);
            throw error;
        }
    });
    // Get transactions by type
    electron_1.ipcMain.handle('transactions:getByType', async (_, type) => {
        try {
            return transactionRepository.getByType(type);
        }
        catch (error) {
            console.error(`Error getting transactions of type ${type}:`, error);
            throw error;
        }
    });
    // Get transactions by status
    electron_1.ipcMain.handle('transactions:getByStatus', async (_, status) => {
        try {
            return transactionRepository.getByStatus(status);
        }
        catch (error) {
            console.error(`Error getting transactions with status ${status}:`, error);
            throw error;
        }
    });
    // Get transactions pending later transfer review
    electron_1.ipcMain.handle('transactions:getPendingTransferReview', async () => {
        try {
            return transactionRepository.getPendingTransferReview();
        }
        catch (error) {
            console.error('Error getting pending transfer review transactions:', error);
            throw error;
        }
    });
    // Update pending transfer review state for a transaction
    electron_1.ipcMain.handle('transactions:setPendingTransferReview', async (_, transactionId, pending) => {
        try {
            const success = transactionRepository.setPendingTransferReview(transactionId, pending);
            return { success };
        }
        catch (error) {
            console.error(`Error setting pending transfer review for transaction ${transactionId}:`, error);
            throw error;
        }
    });
    // Bulk delete transactions with per-transaction accounting cleanup.
    electron_1.ipcMain.handle('transactions:bulkDelete', async (_, ids) => {
        try {
            if (!Array.isArray(ids) || ids.length === 0) {
                return { success: false, count: 0, error: 'No transaction IDs provided' };
            }
            const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
            if (uniqueIds.length === 0) {
                return { success: false, count: 0, error: 'No valid transaction IDs provided' };
            }
            let count = 0;
            const errors = [];
            const handledIds = new Set();
            for (const id of uniqueIds) {
                if (handledIds.has(id)) {
                    count++;
                    continue;
                }
                try {
                    const transaction = transactionRepository.getById(id);
                    if (!transaction) {
                        // If the row is already gone by the time we reach it, treat it as
                        // already handled. This commonly happens when both sides of a
                        // transfer were selected and the first delete removed the pair.
                        count++;
                        handledIds.add(id);
                        continue;
                    }
                    const success = accountingService.deleteTransaction(id);
                    if (success) {
                        count++;
                        handledIds.add(id);
                        if (transaction.transaction_type === 'transfer' &&
                            typeof transaction.linked_transaction_id === 'number') {
                            handledIds.add(transaction.linked_transaction_id);
                        }
                    }
                    else {
                        errors.push({ id, error: 'Transaction not found or could not be deleted' });
                    }
                }
                catch (error) {
                    errors.push({
                        id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            if (errors.length > 0) {
                return {
                    success: false,
                    partialSuccess: count > 0,
                    count,
                    totalCount: uniqueIds.length,
                    errors,
                    error: errors[0].error
                };
            }
            return { success: true, count, totalCount: uniqueIds.length };
        }
        catch (error) {
            console.error('Error bulk deleting transactions:', error);
            return {
                success: false,
                count: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Get monthly activity with basic summaries
    electron_1.ipcMain.handle('transactions:getMonthlyActivity', async (_, month, accountId) => {
        try {
            const transactions = transactionRepository.getByMonth(month, accountId);
            // Aggregate totals by category and by payee (merchant)
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
        }
        catch (error) {
            console.error('Error getting monthly activity:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Create transfer between accounts
    electron_1.ipcMain.handle('transactions:createTransfer', async (_, fromAccountId, toAccountId, amount, description, date) => {
        try {
            const result = accountingService.createTransfer(fromAccountId, toAccountId, amount, description, date);
            return result;
        }
        catch (error) {
            console.error('Error creating transfer:', error);
            throw error;
        }
    });
    // Convert a previously imported pending-review transaction into a linked transfer
    electron_1.ipcMain.handle('transactions:convertPendingTransfer', async (_, transactionId, fromAccountId, toAccountId) => {
        try {
            return accountingService.convertPendingTransferReview(transactionId, fromAccountId, toAccountId);
        }
        catch (error) {
            console.error(`Error converting pending transfer ${transactionId}:`, error);
            throw error;
        }
    });
    // Recalculate all account balances
    electron_1.ipcMain.handle('transactions:recalculateBalances', async () => {
        try {
            accountingService.recalculateAllBalances();
            return { success: true };
        }
        catch (error) {
            console.error('Error recalculating balances:', error);
            throw error;
        }
    });
    // Bulk-assign a payee to multiple transactions.
    electron_1.ipcMain.handle('transactions:bulkAssignPayee', async (_, transactionIds, payeeId) => {
        try {
            if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
                return { success: false, count: 0, error: 'No transaction IDs provided' };
            }
            const uniqueIds = [...new Set(transactionIds.filter((id) => Number.isInteger(id) && id > 0))];
            if (uniqueIds.length === 0) {
                return { success: false, count: 0, error: 'No valid transaction IDs provided' };
            }
            const payeeRepository = DatabaseManager_1.DatabaseManager.getInstance().getPayeeRepository();
            const payee = payeeRepository.getById(payeeId);
            if (!payee) {
                return { success: false, count: 0, error: 'Payee not found' };
            }
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
            const placeholders = uniqueIds.map(() => '?').join(', ');
            const statement = db.prepare(`
        UPDATE transactions
        SET payee_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id IN (${placeholders})
      `);
            const result = statement.run(payeeId, ...uniqueIds);
            return { success: true, count: result.changes };
        }
        catch (error) {
            console.error('Error bulk assigning payee:', error);
            return {
                success: false,
                count: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    // Bulk create transactions (for imports)
    electron_1.ipcMain.handle('transactions:bulkCreate', async (_, transactions) => {
        try {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            console.log(`Starting bulk import of ${transactions.length} transactions`);
            for (let i = 0; i < transactions.length; i++) {
                try {
                    const result = accountingService.createTransaction(transactions[i]);
                    if (result.success) {
                        successCount++;
                    }
                    else {
                        errorCount++;
                        errors.push({ index: i, error: 'Transaction creation failed', transaction: transactions[i] });
                    }
                }
                catch (error) {
                    errorCount++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({ index: i, error: errorMessage, transaction: transactions[i] });
                    console.error(`Error creating transaction ${i + 1}:`, error);
                }
            }
            console.log(`Bulk import completed: ${successCount} successful, ${errorCount} failed`);
            return {
                success: errorCount === 0,
                successCount,
                errorCount,
                errors: errors.slice(0, 10) // Return first 10 errors only
            };
        }
        catch (error) {
            console.error('Error in bulk transaction creation:', error);
            throw error;
        }
    });
    // Backfill payees for existing transactions
    electron_1.ipcMain.handle('transactions:backfillPayees', async () => {
        try {
            const { PayeeExtractor } = require('../../src/data-processing/ai/PayeeExtractor');
            const payeeRepository = DatabaseManager_1.DatabaseManager.getInstance().getPayeeRepository();
            // Get all transactions that don't have payees but have descriptions
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
            const transactionsToProcess = db.prepare(`
        SELECT transaction_id, description 
        FROM transactions 
        WHERE payee_id IS NULL 
          AND description IS NOT NULL 
          AND description != ''
          AND transaction_type != 'transfer'
      `).all();
            console.log(`Found ${transactionsToProcess.length} transactions to process for payee extraction`);
            if (transactionsToProcess.length === 0) {
                return {
                    success: true,
                    processedCount: 0,
                    payeeExtractedCount: 0,
                    newPayeeCount: 0,
                    existingPayeeCount: 0,
                    message: 'No transactions need payee extraction'
                };
            }
            let processedCount = 0;
            let payeeExtractedCount = 0;
            let newPayeeCount = 0;
            let existingPayeeCount = 0;
            for (const transaction of transactionsToProcess) {
                const txn = transaction; // Type assertion since we know the structure
                processedCount++;
                // Extract payee name from description
                const extractedPayeeName = PayeeExtractor.extractPayeeFromDescription(txn.description);
                if (!extractedPayeeName) {
                    continue;
                }
                payeeExtractedCount++;
                console.log(`Transaction ${txn.transaction_id}: "${txn.description}" -> "${extractedPayeeName}"`);
                // Check if payee already exists
                let existingPayee = payeeRepository.findByName(extractedPayeeName);
                if (!existingPayee) {
                    // Create new payee
                    const newPayeeId = payeeRepository.create({
                        name: extractedPayeeName
                    });
                    existingPayee = { payee_id: newPayeeId, name: extractedPayeeName };
                    newPayeeCount++;
                    console.log(`  Created new payee: ${extractedPayeeName} (ID: ${newPayeeId})`);
                }
                else {
                    existingPayeeCount++;
                    console.log(`  Found existing payee: ${extractedPayeeName} (ID: ${existingPayee.payee_id})`);
                }
                // Update transaction with payee_id
                db.prepare('UPDATE transactions SET payee_id = ? WHERE transaction_id = ?')
                    .run(existingPayee.payee_id, txn.transaction_id);
            }
            console.log('\n=== Payee Backfill Summary ===');
            console.log(`Transactions processed: ${processedCount}`);
            console.log(`Payees extracted: ${payeeExtractedCount}`);
            console.log(`New payees created: ${newPayeeCount}`);
            console.log(`Existing payees used: ${existingPayeeCount}`);
            return {
                success: true,
                processedCount,
                payeeExtractedCount,
                newPayeeCount,
                existingPayeeCount,
                message: `Successfully processed ${payeeExtractedCount} transactions with payee extraction`
            };
        }
        catch (error) {
            console.error('Error during payee backfill:', error);
            throw error;
        }
    });
}
