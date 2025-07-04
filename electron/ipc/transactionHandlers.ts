import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { AutoCategorizer } from '../../src/ai/AutoCategorizer';

export function setupTransactionHandlers(): void {
  const transactionRepository = DatabaseManager.getInstance().getTransactionRepository();
  const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();
  const categorizer = AutoCategorizer.getInstance();

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

  // Create transaction
  ipcMain.handle('transactions:create', async (_, transaction: Transaction) => {
    try {
      if (!transaction.category_id && transaction.description) {
        const prediction = categorizer.predict(transaction.description);
        if (prediction && prediction.probability >= 0.6) {
          const cat = categoryRepository.getByName(prediction.label);
          if (cat?.category_id) {
            transaction.category_id = cat.category_id;
          }
        }
      }
      const id = transactionRepository.create(transaction);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  });

  // Update transaction
  ipcMain.handle('transactions:update', async (_, id: number, transaction: Transaction) => {
    try {
      const success = transactionRepository.update(id, transaction);
      return { success };
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  });

  // Delete transaction
  ipcMain.handle('transactions:delete', async (_, id: number) => {
    try {
      const success = transactionRepository.delete(id);
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
}