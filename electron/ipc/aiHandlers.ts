import { ipcMain } from 'electron';
import { TransactionCategorizer, CategoryPrediction, LearningFeedback } from '../../src/data-processing/ai/TransactionCategorizer';
import { QueryProcessor, QueryResult, QueryContext } from '../../src/data-processing/ai/QueryProcessor';
import { TransactionRepository } from '../../src/data-storage/repositories/TransactionRepository';
import { CategoryRepository } from '../../src/data-storage/repositories/CategoryRepository';
import { AccountRepository } from '../../src/data-storage/repositories/AccountRepository';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { Category } from '../../src/data-storage/models/Category';

// Global AI service instances
let transactionCategorizer: TransactionCategorizer | null = null;
let queryProcessor: QueryProcessor | null = null;

// Initialize AI services
const initializeAIServices = async () => {
  if (!transactionCategorizer) {
    transactionCategorizer = new TransactionCategorizer();
  }
  
  // Initialize query processor with current data
  const transactionRepo = new TransactionRepository();
  const categoryRepo = new CategoryRepository();
  const accountRepo = new AccountRepository();
  
  const context: QueryContext = {
    transactions: transactionRepo.getAll(),
    categories: categoryRepo.getAll(),
    accounts: accountRepo.getAll()
  };
  
  queryProcessor = new QueryProcessor(context);
};

// AI Status
ipcMain.handle('ai:getStatus', async () => {
  try {
    await initializeAIServices();
    return {
      status: 'ready',
      message: 'AI services are ready',
      features: {
        categorization: true,
        querying: true,
        learning: true
      }
    };
  } catch (error) {
    console.error('AI service initialization error:', error);
    return {
      status: 'error',
      message: 'Failed to initialize AI services',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Transaction Categorization
ipcMain.handle('ai:categorizeTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();
    
    if (!transactionCategorizer) {
      throw new Error('Transaction categorizer not initialized');
    }
    
    const categoryRepo = new CategoryRepository();
    const availableCategories = categoryRepo.getAll();
    
    const predictions = await transactionCategorizer.categorizeTransaction(transaction, availableCategories);
    
    return {
      success: true,
      predictions
    };
  } catch (error) {
    console.error('Error categorizing transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Batch Transaction Categorization
ipcMain.handle('ai:batchCategorizeTransactions', async (event, transactions: Transaction[]) => {
  try {
    await initializeAIServices();
    
    if (!transactionCategorizer) {
      throw new Error('Transaction categorizer not initialized');
    }
    
    const categoryRepo = new CategoryRepository();
    const availableCategories = categoryRepo.getAll();
    
    const results = await transactionCategorizer.batchCategorizeTransactions(
      transactions, 
      availableCategories,
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('ai:categorization-progress', progress);
      }
    );
    
    // Convert Map to Object for IPC transmission
    const resultObj: { [key: number]: CategoryPrediction[] } = {};
    results.forEach((predictions, transactionId) => {
      resultObj[transactionId] = predictions;
    });
    
    return {
      success: true,
      results: resultObj
    };
  } catch (error) {
    console.error('Error in batch categorization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Learn from User Feedback
ipcMain.handle('ai:learnFromFeedback', async (event, feedback: LearningFeedback) => {
  try {
    await initializeAIServices();
    
    if (!transactionCategorizer) {
      throw new Error('Transaction categorizer not initialized');
    }
    
    await transactionCategorizer.learnFromFeedback(feedback);
    
    return {
      success: true,
      message: 'Feedback processed successfully'
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Natural Language Query Processing
ipcMain.handle('ai:processQuery', async (event, query: string) => {
  try {
    await initializeAIServices();
    
    if (!queryProcessor) {
      throw new Error('Query processor not initialized');
    }
    
    const result = await queryProcessor.processQuery(query);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error processing query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get Uncategorized Transactions
ipcMain.handle('ai:getUncategorizedTransactions', async () => {
  try {
    const transactionRepo = new TransactionRepository();
    const allTransactions = transactionRepo.getAll();
    
    const uncategorized = allTransactions.filter(t => !t.category_id);
    
    return {
      success: true,
      transactions: uncategorized
    };
  } catch (error) {
    console.error('Error getting uncategorized transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get AI Statistics
ipcMain.handle('ai:getStatistics', async () => {
  try {
    const transactionRepo = new TransactionRepository();
    const allTransactions = transactionRepo.getAll();
    
    const categorized = allTransactions.filter(t => t.category_id);
    const uncategorized = allTransactions.filter(t => !t.category_id);
    
    const stats = {
      total: allTransactions.length,
      categorized: categorized.length,
      uncategorized: uncategorized.length,
      completionRate: allTransactions.length > 0 ? (categorized.length / allTransactions.length) * 100 : 100,
      lastUpdated: new Date().toISOString()
    };
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting AI statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Update Query Context (call when data changes)
ipcMain.handle('ai:updateContext', async () => {
  try {
    // Reinitialize query processor with fresh data
    const transactionRepo = new TransactionRepository();
    const categoryRepo = new CategoryRepository();
    const accountRepo = new AccountRepository();
    
    const context: QueryContext = {
      transactions: transactionRepo.getAll(),
      categories: categoryRepo.getAll(),
      accounts: accountRepo.getAll()
    };
    
    queryProcessor = new QueryProcessor(context);
    
    return {
      success: true,
      message: 'Context updated successfully'
    };
  } catch (error) {
    console.error('Error updating context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Clear AI Models (for reset/debugging)
ipcMain.handle('ai:clearModels', async () => {
  try {
    // Clear localStorage models
    // Note: This would need to be implemented in the renderer process
    // as main process doesn't have access to localStorage
    
    // Dispose of current models
    if (transactionCategorizer) {
      transactionCategorizer.dispose();
      transactionCategorizer = null;
    }
    
    queryProcessor = null;
    
    return {
      success: true,
      message: 'AI models cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing AI models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Export for use in main process
export const initializeAIHandlers = () => {
  console.log('AI IPC handlers initialized');
};

// Cleanup on app quit
export const cleanupAIServices = () => {
  if (transactionCategorizer) {
    transactionCategorizer.dispose();
    transactionCategorizer = null;
  }
  queryProcessor = null;
};