import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { DatabaseConnection } from '../../src/data-storage/database/DatabaseConnection';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { AccountingService } from '../../src/data-storage/services/AccountingService';

export function setupTransactionHandlers(): void {
  const transactionRepository = DatabaseManager.getInstance().getTransactionRepository();
  const accountingService = new AccountingService();

  // Get all transactions
  ipcMain.handle('transactions:getAll', async () => {
    try {
      return transactionRepository.getAll();
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  });

  // Get transaction by ID
  ipcMain.handle('transactions:getById', async (_, id: number) => {
    try {
      return transactionRepository.getById(id);
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error);
      throw error;
    }
  });

  // Get transactions by account ID
  ipcMain.handle('transactions:getByAccountId', async (_, accountId: number) => {
    try {
      return transactionRepository.getByAccountId(accountId);
    } catch (error) {
      console.error(`Error getting transactions for account ${accountId}:`, error);
      throw error;
    }
  });

  // Get transactions by date range
  ipcMain.handle('transactions:getByDateRange', async (_, startDate: string, endDate: string) => {
    try {
      return transactionRepository.getByDateRange(startDate, endDate);
    } catch (error) {
      console.error(`Error getting transactions between ${startDate} and ${endDate}:`, error);
      throw error;
    }
  });

  // Get recent transactions
  ipcMain.handle('transactions:getRecent', async (_, limit: number) => {
    try {
      return transactionRepository.getRecent(limit);
    } catch (error) {
      console.error(`Error getting recent transactions (limit: ${limit}):`, error);
      throw error;
    }
  });

  // Search transactions by description
  ipcMain.handle('transactions:searchByDescription', async (_, term: string) => {
    try {
      return transactionRepository.searchByDescription(term);
    } catch (error) {
      console.error(`Error searching transactions with term "${term}":`, error);
      throw error;
    }
  });

  // Create transaction with double-entry accounting
  ipcMain.handle('transactions:create', async (_, transaction: Transaction) => {
    try {
      const result = accountingService.createTransaction(transaction);
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  });

  // Update transaction with double-entry accounting
  ipcMain.handle('transactions:update', async (_, id: number, transaction: Transaction) => {
    try {
      const success = accountingService.updateTransaction(id, transaction);
      return { success };
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  });

  // Delete transaction with double-entry accounting
  ipcMain.handle('transactions:delete', async (_, id: number) => {
    try {
      const success = accountingService.deleteTransaction(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  });

  // Get transactions by category
  ipcMain.handle('transactions:getByCategory', async (_, categoryId: number) => {
    try {
      return transactionRepository.getByCategory(categoryId);
    } catch (error) {
      console.error(`Error getting transactions for category ${categoryId}:`, error);
      throw error;
    }
  });

  // Get transactions by type
  ipcMain.handle('transactions:getByType', async (_, type: string) => {
    try {
      return transactionRepository.getByType(type);
    } catch (error) {
      console.error(`Error getting transactions of type ${type}:`, error);
      throw error;
    }
  });

  // Get transactions by status
  ipcMain.handle('transactions:getByStatus', async (_, status: string) => {
    try {
      return transactionRepository.getByStatus(status);
    } catch (error) {
      console.error(`Error getting transactions with status ${status}:`, error);
      throw error;
    }
  });

  // Create transfer between accounts
  ipcMain.handle('transactions:createTransfer', async (_, 
    fromAccountId: number, 
    toAccountId: number, 
    amount: number, 
    description?: string, 
    date?: string
  ) => {
    try {
      const result = accountingService.createTransfer(fromAccountId, toAccountId, amount, description, date);
      return result;
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  });

  // Recalculate all account balances
  ipcMain.handle('transactions:recalculateBalances', async () => {
    try {
      accountingService.recalculateAllBalances();
      return { success: true };
    } catch (error) {
      console.error('Error recalculating balances:', error);
      throw error;
    }
  });

  // Bulk create transactions (for imports)
  ipcMain.handle('transactions:bulkCreate', async (_, transactions: Transaction[]) => {
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ index: number; error: string; transaction: any }> = [];
      
      console.log(`Starting bulk import of ${transactions.length} transactions`);
      
      for (let i = 0; i < transactions.length; i++) {
        try {
          const result = accountingService.createTransaction(transactions[i]);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push({ index: i, error: 'Transaction creation failed', transaction: transactions[i] });
          }
        } catch (error) {
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
    } catch (error) {
      console.error('Error in bulk transaction creation:', error);
      throw error;
    }
  });

  // Backfill payees for existing transactions
  ipcMain.handle('transactions:backfillPayees', async () => {
    try {
      const { PayeeExtractor } = require('../../src/data-processing/ai/PayeeExtractor');
      const payeeRepository = DatabaseManager.getInstance().getPayeeRepository();
      
      // Get all transactions that don't have payees but have descriptions
      const db = DatabaseConnection.getInstance();
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
        const txn = transaction as any; // Type assertion since we know the structure
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
        } else {
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
      
    } catch (error) {
      console.error('Error during payee backfill:', error);
      throw error;
    }
  });
}