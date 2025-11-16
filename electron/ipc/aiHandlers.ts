import { ipcMain } from 'electron';
import { TransactionCategorizationService, CategorizationResult } from '../../src/data-processing/ai/TransactionCategorizationService';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { Category } from '../../src/data-storage/models/Category';
import { Payee } from '../../src/data-storage/models/Payee';

// Global AI service instance
let categorizationService: TransactionCategorizationService | null = null;
let dbInstance: any = null;

// Initialize AI services with database instance
const initializeAIServices = async (db?: any) => {
  // Store database instance if provided
  if (db) {
    dbInstance = db;
  }

  // Initialize rule-based categorization service
  if (!categorizationService) {
    categorizationService = new TransactionCategorizationService();
    console.log('Rule-based categorization service initialized (Phase 1)');
  }
};

// Helper function to ensure database is ready
const ensureDatabaseReady = (): boolean => {
  if (!dbInstance) {
    console.error('Database instance not provided to AI handlers');
    return false;
  }
  return true;
};

// AI Status
ipcMain.handle('ai:getStatus', async () => {
  try {
    await initializeAIServices();

    return {
      status: 'ready',
      message: 'Rule-based categorization service is ready (Phase 1)',
      features: {
        categorization: true,
        payeeExtraction: true,
        learning: false, // Phase 2+
        ruleBased: true,
        lightweight: true
      },
      accuracy: {
        target: '75-80%',
        description: 'Rule-based pattern matching with confidence scoring'
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

// Transaction Categorization with Payee Extraction
ipcMain.handle('ai:categorizeTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Check if database is ready
    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories and payees directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();

    const result = await categorizationService.processTransaction(
      transaction,
      availableCategories,
      existingPayees
    );

    return {
      success: true,
      predictions: result.categoryPredictions,
      payeeExtraction: result.payeeExtraction,
      extractedInfo: result.extractedInfo,
      confidence: result.confidence
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

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Check if database is ready
    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories and payees directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();
    console.log(`Using ${availableCategories.length} categories, ${existingPayees.length} payees`);

    console.log(`Starting batch categorization of ${transactions.length} transactions`);

    const results = await categorizationService.batchProcessTransactions(
      transactions,
      availableCategories,
      existingPayees,
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('ai:categorization-progress', progress);
        console.log(`Batch categorization progress: ${progress.toFixed(1)}%`);
      }
    );

    // Convert Map to Object for IPC transmission
    const resultObj: { [key: number]: any } = {};
    results.forEach((result, transactionId) => {
      resultObj[transactionId] = {
        categoryPredictions: result.categoryPredictions,
        payeeExtraction: result.payeeExtraction,
        extractedInfo: result.extractedInfo,
        confidence: result.confidence
      };
    });

    console.log(`Batch categorization completed: ${results.size} transactions processed`);

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
ipcMain.handle('ai:learnFromFeedback', async (event, feedback: any) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Log feedback for future learning (Phase 2+)
    console.log('User feedback received:', feedback);

    // If feedback includes transaction and correct category, use the learning method
    if (feedback.transaction && feedback.correctCategory) {
      categorizationService.learnFromCorrection(
        feedback.transaction,
        feedback.correctCategory,
        feedback.correctPayee
      );
    }

    return {
      success: true,
      message: 'Feedback logged for future improvements (Phase 2: Learning mechanism)'
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// AI Chat Interface (Phase 2+ feature)
ipcMain.handle('ai:chat', async (event, messages: any[]) => {
  try {
    await initializeAIServices();

    console.log('AI Chat requested (Phase 2+ feature)');

    return {
      success: false,
      response: 'Chat feature available in Phase 2+. Currently using rule-based categorization (Phase 1).',
      error: 'Feature not available in Phase 1'
    };
  } catch (error) {
    console.error('Error in AI chat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Natural Language Query Processing (Phase 2+ feature)
ipcMain.handle('ai:processQuery', async (event, query: string) => {
  try {
    await initializeAIServices();

    console.log('Query processing requested (Phase 2+ feature):', query);

    return {
      success: false,
      enhanced: false,
      result: {
        type: 'text',
        content: 'Natural language query processing available in Phase 2+. Currently using rule-based categorization (Phase 1).'
      },
      error: 'Feature not available in Phase 1'
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
    await initializeAIServices();

    if (!ensureDatabaseReady()) {
      return {
        success: false,
        error: 'Database not accessible',
        transactions: []
      };
    }

    const allTransactions = dbInstance.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
    `).all();

    const uncategorized = allTransactions.filter((t: any) => !t.category_id);

    console.log(`Found ${uncategorized.length} uncategorized transactions out of ${allTransactions.length} total`);

    return {
      success: true,
      transactions: uncategorized
    };
  } catch (error) {
    console.error('Error getting uncategorized transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transactions: []
    };
  }
});

// Get AI Statistics
ipcMain.handle('ai:getStatistics', async () => {
  try {
    await initializeAIServices();

    if (!ensureDatabaseReady()) {
      return {
        success: false,
        error: 'Database not accessible',
        stats: {
          total: 0,
          categorized: 0,
          uncategorized: 0,
          completionRate: 100,
          lastUpdated: new Date().toISOString()
        }
      };
    }

    const allTransactions = dbInstance.prepare(`
      SELECT t.*, c.name as category_name, p.name as payee_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN payees p ON t.payee_id = p.payee_id
    `).all();

    const categorized = allTransactions.filter((t: any) => t.category_id);
    const uncategorized = allTransactions.filter((t: any) => !t.category_id);

    const stats = {
      total: allTransactions.length,
      categorized: categorized.length,
      uncategorized: uncategorized.length,
      completionRate: allTransactions.length > 0 ? (categorized.length / allTransactions.length) * 100 : 100,
      lastUpdated: new Date().toISOString()
    };

    console.log(`AI Statistics: ${categorized.length} categorized, ${uncategorized.length} uncategorized out of ${allTransactions.length} total`);

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting AI statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        total: 0,
        categorized: 0,
        uncategorized: 0,
        completionRate: 100,
        lastUpdated: new Date().toISOString()
      }
    };
  }
});

// Update Query Context (placeholder for Phase 2+)
ipcMain.handle('ai:updateContext', async () => {
  try {
    await initializeAIServices();

    console.log('Context update requested (no-op in Phase 1)');

    return {
      success: true,
      message: 'Context update not required for rule-based categorization (Phase 1)'
    };
  } catch (error) {
    console.error('Error updating context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Clear AI Models (no-op in Phase 1)
ipcMain.handle('ai:clearModels', async () => {
  try {
    console.log('Clear models requested (no-op in Phase 1)');

    return {
      success: true,
      message: 'No models to clear in rule-based system (Phase 1)'
    };
  } catch (error) {
    console.error('Error clearing AI models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Model Management (no-op in Phase 1)
ipcMain.handle('ai:preloadModels', async () => {
  return {
    success: true,
    message: 'No models to preload in rule-based system (Phase 1)'
  };
});

ipcMain.handle('ai:getModelStatus', async () => {
  return {
    success: true,
    statuses: [],
    memoryUsage: { current: 0, max: 0, percentage: 0 },
    message: 'No models in rule-based system (Phase 1)'
  };
});

ipcMain.handle('ai:loadModel', async (event, modelName: string) => {
  return {
    success: false,
    message: `Model loading not available in Phase 1 (requested: ${modelName})`
  };
});

ipcMain.handle('ai:unloadModel', async (event, modelName: string) => {
  return {
    success: false,
    message: `Model unloading not available in Phase 1 (requested: ${modelName})`
  };
});

// Financial Analysis (Phase 2+ features)
ipcMain.handle('ai:analyzeFinancialHealth', async () => {
  return {
    success: false,
    error: 'Financial analysis available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

ipcMain.handle('ai:optimizeLoans', async () => {
  return {
    success: false,
    error: 'Loan optimization available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

ipcMain.handle('ai:forecastBills', async () => {
  return {
    success: false,
    error: 'Bill forecasting available in Phase 2+ (currently Phase 1: rule-based categorization)'
  };
});

// Auto-Payee Creation
ipcMain.handle('ai:createPayeeFromTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    if (!ensureDatabaseReady()) {
      throw new Error('Database not available');
    }

    // Get categories and payees directly from database
    const availableCategories = dbInstance.prepare('SELECT * FROM categories').all();
    const existingPayees = dbInstance.prepare('SELECT * FROM payees').all();

    const result = await categorizationService.processTransaction(
      transaction,
      availableCategories,
      existingPayees
    );

    if (result.payeeExtraction && result.payeeExtraction.extracted) {
      // Create the new payee directly in database
      const payeeData = result.payeeExtraction.payee;
      const insertStmt = dbInstance.prepare(`
        INSERT INTO payees (name, default_category_id)
        VALUES (?, ?)
      `);
      const info = insertStmt.run(
        payeeData.name,
        payeeData.default_category_id || null
      );

      const newPayee = dbInstance.prepare('SELECT * FROM payees WHERE payee_id = ?').get(info.lastInsertRowid);

      return {
        success: true,
        payee: newPayee,
        confidence: result.payeeExtraction.confidence,
        categoryPredictions: result.categoryPredictions
      };
    } else {
      return {
        success: false,
        message: 'No new payee could be extracted from transaction'
      };
    }
  } catch (error) {
    console.error('Error creating payee from transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Export for use in main process
export const initializeAIHandlers = (db?: any) => {
  if (db) {
    dbInstance = db;
  }
  initializeAIServices(db);
  console.log('Rule-based AI categorization handlers initialized (Phase 1)');
};

// Cleanup on app quit
export const cleanupAIServices = async () => {
  categorizationService = null;
  console.log('AI services cleaned up');
};