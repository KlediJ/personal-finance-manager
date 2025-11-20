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

  // Initialize learning table for feedback-based improvements (Phase 2)
  if (dbInstance) {
    try {
      dbInstance.prepare(`
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
    } catch (error) {
      console.error('Failed to initialize ai_categorization_feedback table:', error);
    }
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

    // Apply learned category override if strong feedback exists for this payee
    const payeeId = (transaction as any).payee_id as number | undefined;
    const payeeName = (transaction as any).payee_name as string | undefined;
    const learned = getLearnedCategoryForPayee(payeeId, payeeName);

    if (learned) {
      const learnedCategory = availableCategories.find(
        (c: Category) => c.category_id === learned.category_id
      );

      if (learnedCategory) {
        const learnedPrediction = {
          category: learnedCategory,
          confidence: 0.9
        };

        const remainingPredictions = result.categoryPredictions.filter(
          p => p.category.category_id !== learnedCategory.category_id
        );

        result.categoryPredictions = [learnedPrediction, ...remainingPredictions];
      }
    }

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
      const tx = transactions.find(t => t.transaction_id === transactionId);

      if (tx) {
        const payeeId = (tx as any).payee_id as number | undefined;
        const payeeName = (tx as any).payee_name as string | undefined;
        const learned = getLearnedCategoryForPayee(payeeId, payeeName);

        if (learned) {
          const learnedCategory = availableCategories.find(
            (c: Category) => c.category_id === learned.category_id
          );

          if (learnedCategory) {
            const learnedPrediction = {
              category: learnedCategory,
              confidence: 0.9
            };

            const remainingPredictions = result.categoryPredictions.filter(
              p => p.category.category_id !== learnedCategory.category_id
            );

            result.categoryPredictions = [learnedPrediction, ...remainingPredictions];
          }
        }
      }

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

// Helper: get dominant learned category for a payee
const getLearnedCategoryForPayee = (payeeId?: number | null, payeeName?: string | null): { category_id: number; category_name: string } | null => {
  if (!dbInstance) return null;

  try {
    if (payeeId) {
      const row = dbInstance.prepare(`
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
    if (normalizedName.length === 0) return null;

    const rowByName = dbInstance.prepare(`
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
  } catch (error) {
    console.error('Error reading learned category for payee:', error);
  }

  return null;
};

// Learn from User Feedback (Phase 2: persistent learning)
ipcMain.handle('ai:learnFromFeedback', async (event, feedback: any) => {
  try {
    await initializeAIServices();

    if (!categorizationService) {
      throw new Error('Categorization service not initialized');
    }

    // Log feedback for future learning (Phase 2)
    console.log('User feedback received:', feedback);

    // If feedback includes transaction and correct category, persist it
    if (feedback.transaction && feedback.correctCategory) {
      try {
        if (dbInstance) {
          const tx = feedback.transaction as Transaction;
          const cat = feedback.correctCategory as Category;
          const payee = feedback.correctPayee as Payee | undefined;

          dbInstance.prepare(`
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
          `).run(
            tx.transaction_id || null,
            payee?.payee_id || null,
            payee?.name || tx.payee_name || null,
            cat.category_id || null,
            cat.name || null,
            tx.description || null,
            tx.amount || null
          );
        }
      } catch (dbError) {
        console.error('Error writing feedback to ai_categorization_feedback:', dbError);
      }

      // Preserve existing hook for potential in-memory learning
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
