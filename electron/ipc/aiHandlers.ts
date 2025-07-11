import { ipcMain } from 'electron';
import { MistralProcessor, MistralResult } from '../../src/data-processing/ai/MistralProcessor';
import { MistralAIProcessor, MistralChatMessage } from '../../src/data-processing/ai/MistralAIProcessor';
import { CodeLlamaProcessor, CodeLlamaResult, FinancialContext } from '../../src/data-processing/ai/CodeLlamaProcessor';
import { DualModelRouter } from '../ai/DualModelRouter';
import { ModelManager } from '../ai/ModelManager';
import { DatabaseConnection } from '../../src/data-storage/database/DatabaseConnection';
import { TransactionRepository } from '../../src/data-storage/repositories/TransactionRepository';
import { CategoryRepository } from '../../src/data-storage/repositories/CategoryRepository';
import { AccountRepository } from '../../src/data-storage/repositories/AccountRepository';
import { PayeeRepository } from '../../src/data-storage/repositories/PayeeRepository';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { Category } from '../../src/data-storage/models/Category';
import { Payee } from '../../src/data-storage/models/Payee';

// Global AI service instances
let mistralProcessor: MistralProcessor | null = null;
let mistralAIProcessor: MistralAIProcessor | null = null;
let codeLlamaProcessor: CodeLlamaProcessor | null = null;
let dualModelRouter: DualModelRouter | null = null;
let modelManager: ModelManager | null = null;

// Initialize AI services
const initializeAIServices = async () => {
  // Initialize model manager
  if (!modelManager) {
    modelManager = ModelManager.getInstance();
  }
  
  // Initialize dual model router
  if (!dualModelRouter) {
    dualModelRouter = DualModelRouter.getInstance();
  }
  
  // Try to initialize repositories, but don't fail if database isn't ready
  try {
    // Check if database is already initialized
    if (!DatabaseConnection.getInstance()) {
      DatabaseConnection.initialize();
    }
    
    // Try to create repositories and access data
    const transactionRepo = new TransactionRepository();
    const categoryRepo = new CategoryRepository();
    const accountRepo = new AccountRepository();
    const payeeRepo = new PayeeRepository();
    
    // Test database access with a simple query
    const testTransactions = transactionRepo.getAll();
    const testCategories = categoryRepo.getAll();
    const testAccounts = accountRepo.getAll();
    const testPayees = payeeRepo.getAll();
    
    // Initialize Mistral processors
    if (!mistralProcessor) {
      mistralProcessor = new MistralProcessor();
    }
    if (!mistralAIProcessor) {
      mistralAIProcessor = new MistralAIProcessor(modelManager);
    }
    
    // Initialize CodeLlama processor with financial context
    const financialContext: FinancialContext = {
      transactions: testTransactions,
      categories: testCategories,
      accounts: testAccounts,
      payees: testPayees
    };
    
    if (!codeLlamaProcessor) {
      codeLlamaProcessor = new CodeLlamaProcessor(financialContext);
    } else {
      codeLlamaProcessor.updateContext(financialContext);
    }
    
    console.log('AI services initialized with database data');
  } catch (error) {
    console.log('Database not ready for AI services, using fallback mode:', error);
    
    // Initialize with empty data for testing
    if (!mistralProcessor) {
      mistralProcessor = new MistralProcessor();
    }
    if (!mistralAIProcessor) {
      mistralAIProcessor = new MistralAIProcessor(modelManager);
    }
    
    const emptyFinancialContext: FinancialContext = {
      transactions: [],
      categories: [],
      accounts: [],
      payees: []
    };
    
    if (!codeLlamaProcessor) {
      codeLlamaProcessor = new CodeLlamaProcessor(emptyFinancialContext);
    }
    
    console.log('AI services initialized in fallback mode');
  }
};

// AI Status
ipcMain.handle('ai:getStatus', async () => {
  try {
    await initializeAIServices();
    
    // Get model status
    const modelStatuses = modelManager?.getAllModelStatuses() || [];
    const memoryUsage = modelManager?.getMemoryUsage() || { current: 0, max: 0, percentage: 0 };
    
    return {
      status: 'ready',
      message: 'AI dual-model architecture is ready',
      features: {
        categorization: true,
        payeeExtraction: true,
        complexQuerying: true,
        financialAnalysis: true,
        learning: true,
        dualModel: true
      },
      models: {
        mistral: modelStatuses.find(m => m.name === 'mistral-7b')?.loaded || false,
        codellama: modelStatuses.find(m => m.name === 'codellama-7b')?.loaded || false,
        statuses: modelStatuses
      },
      memory: memoryUsage
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

// Enhanced Transaction Categorization with Payee Extraction
ipcMain.handle('ai:categorizeTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();
    
    const categoryRepo = new CategoryRepository();
    const payeeRepo = new PayeeRepository();
    const availableCategories = categoryRepo.getAll();
    const existingPayees = payeeRepo.getAll();
    
    // Use dual model routing for enhanced categorization
    if (dualModelRouter && mistralProcessor) {
      const mistralResult = await mistralProcessor.processTransaction(
        transaction,
        availableCategories,
        existingPayees
      );
      
      return {
        success: true,
        enhanced: true,
        predictions: mistralResult.categoryPredictions,
        payeeExtraction: mistralResult.payeeExtraction,
        extractedInfo: mistralResult.extractedInfo,
        confidence: mistralResult.confidence
      };
    } else {
      // Fallback to mock categorization for development
      return {
        success: true,
        enhanced: false,
        predictions: [{
          category: availableCategories[0] || { name: 'General', category_id: 1 },
          confidence: 0.5
        }]
      };
    }
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
    
    if (!mistralProcessor) {
      throw new Error('Mistral processor not initialized');
    }
    
    // Get categories and payees - try multiple approaches
    let availableCategories: any[] = [];
    let existingPayees: any[] = [];
    
    // Use mock data if database access fails - this ensures the AI categorization can still work
    const mockCategories = [
      { category_id: 1, name: 'Food & Dining', type: 'expense' },
      { category_id: 2, name: 'Transportation', type: 'expense' },
      { category_id: 3, name: 'Utilities', type: 'expense' },
      { category_id: 4, name: 'Housing', type: 'expense' },
      { category_id: 5, name: 'Entertainment', type: 'expense' },
      { category_id: 6, name: 'Shopping', type: 'expense' },
      { category_id: 7, name: 'Healthcare', type: 'expense' },
      { category_id: 8, name: 'Income', type: 'income' },
      { category_id: 9, name: 'Other', type: 'expense' }
    ];
    
    try {
      const categoryRepo = new CategoryRepository();
      const payeeRepo = new PayeeRepository();
      availableCategories = categoryRepo.getAll();
      existingPayees = payeeRepo.getAll();
      console.log(`Using repository data: ${availableCategories.length} categories, ${existingPayees.length} payees`);
    } catch (dbError) {
      console.log('Database not accessible, using mock categories for batch categorization');
      availableCategories = mockCategories;
      existingPayees = [];
    }
    
    console.log(`Starting batch categorization of ${transactions.length} transactions`);
    
    const results = await mistralProcessor.batchProcessTransactions(
      transactions, 
      availableCategories,
      existingPayees,
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('ai:categorization-progress', progress);
        console.log(`Batch categorization progress: ${progress}%`);
      }
    );
    
    // Convert Map to Object for IPC transmission
    const resultObj: { [key: number]: any } = {};
    results.forEach((mistralResult, transactionId) => {
      resultObj[transactionId] = {
        categoryPredictions: mistralResult.categoryPredictions,
        payeeExtraction: mistralResult.payeeExtraction,
        extractedInfo: mistralResult.extractedInfo,
        confidence: mistralResult.confidence
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
    
    // With the new dual-model architecture, feedback is handled differently
    // For now, we'll just log it for future implementation
    console.log('Feedback received:', feedback);
    
    return {
      success: true,
      message: 'Feedback logged for future model improvements'
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Mistral Chat Interface (for testing AI intelligence)
ipcMain.handle('ai:chat', async (event, messages: MistralChatMessage[]) => {
  try {
    await initializeAIServices();
    
    console.log('🗣️ AI Chat Request:', messages);
    
    if (!mistralAIProcessor) {
      throw new Error('Mistral AI processor not initialized');
    }
    
    const result = await mistralAIProcessor.chat(messages);
    
    return {
      success: result.success,
      response: result.response,
      error: result.error,
      usage: result.usage,
      modelUsed: 'mistral-7b',
      enhanced: true
    };
  } catch (error) {
    console.error('Error in AI chat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Enhanced Natural Language Query Processing
ipcMain.handle('ai:processQuery', async (event, query: string) => {
  try {
    await initializeAIServices();
    
    console.log('🔍 Processing query:', query);
    
    // First, try the new AI-powered approach
    if (mistralAIProcessor) {
      console.log('🧠 Using Mistral AI for query processing');
      
      const messages: MistralChatMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful financial AI assistant. Respond to user queries about their finances in a friendly and informative way. If the query is not about finances, still be helpful but try to relate it back to financial concepts when possible.'
        },
        {
          role: 'user',
          content: query
        }
      ];
      
      const chatResult = await mistralAIProcessor.chat(messages);
      
      if (chatResult.success) {
        return {
          success: true,
          enhanced: true,
          result: {
            type: 'text',
            content: chatResult.response,
            data: null
          },
          modelUsed: 'mistral-7b-ai',
          processingTime: 0,
          confidence: 0.9,
          usage: chatResult.usage
        };
      }
    }
    
    // Fallback to dual model routing for complex queries
    if (dualModelRouter) {
      console.log('🔄 Using DualModelRouter for query processing');
      const result = await dualModelRouter.routeQuery(query);
      
      return {
        success: result.success,
        enhanced: true,
        result: {
          type: result.data?.type || 'text',
          content: result.data?.content || result.error || 'No content',
          data: result.data
        },
        modelUsed: result.modelUsed,
        processingTime: result.processingTime,
        confidence: result.confidence
      };
    } else {
      // Final fallback to simple mock response
      return {
        success: true,
        enhanced: false,
        result: {
          type: 'text',
          content: 'AI query processing is available but requires model initialization.'
        }
      };
    }
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
    
    // Try to access database
    try {
      const transactionRepo = new TransactionRepository();
      const allTransactions = transactionRepo.getAll();
      const uncategorized = allTransactions.filter(t => !t.category_id);
      
      console.log(`Found ${uncategorized.length} uncategorized transactions out of ${allTransactions.length} total`);
      
      return {
        success: true,
        transactions: uncategorized
      };
    } catch (dbError) {
      console.log('Database not accessible in AI service, returning failure to use fallback');
      // Return failure so the UI can use its fallback logic
      return {
        success: false,
        error: 'Database not accessible',
        transactions: []
      };
    }
  } catch (error) {
    console.error('Error getting uncategorized transactions:', error);
    // Return error instead of empty array
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
    
    // Try to access database
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
      
      console.log(`AI Statistics: ${categorized.length} categorized, ${uncategorized.length} uncategorized out of ${allTransactions.length} total`);
      
      return {
        success: true,
        stats
      };
    } catch (dbError) {
      console.log('Database not accessible for AI statistics, returning failure');
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
  } catch (error) {
    console.error('Error getting AI statistics:', error);
    // Return error for debugging
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

// Update Query Context (call when data changes)
ipcMain.handle('ai:updateContext', async () => {
  try {
    // Reinitialize all processors with fresh data
    const transactionRepo = new TransactionRepository();
    const categoryRepo = new CategoryRepository();
    const accountRepo = new AccountRepository();
    const payeeRepo = new PayeeRepository();
    
    // Update CodeLlama processor with fresh financial context
    const financialContext: FinancialContext = {
      transactions: transactionRepo.getAll(),
      categories: categoryRepo.getAll(),
      accounts: accountRepo.getAll(),
      payees: payeeRepo.getAll()
    };
    
    if (codeLlamaProcessor) {
      codeLlamaProcessor.updateContext(financialContext);
    }
    
    return {
      success: true,
      message: 'All AI contexts updated successfully'
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
    // Dispose of ONNX models
    if (modelManager) {
      await modelManager.unloadAllModels();
    }
    
    // Clear all AI service instances
    mistralProcessor = null;
    codeLlamaProcessor = null;
    dualModelRouter = null;
    
    return {
      success: true,
      message: 'All AI models cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing AI models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Model Management
ipcMain.handle('ai:preloadModels', async () => {
  try {
    await initializeAIServices();
    
    if (modelManager) {
      await modelManager.preloadModels();
      return {
        success: true,
        message: 'Models preloaded successfully'
      };
    } else {
      throw new Error('Model manager not initialized');
    }
  } catch (error) {
    console.error('Error preloading models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('ai:getModelStatus', async () => {
  try {
    await initializeAIServices();
    
    if (modelManager) {
      const statuses = modelManager.getAllModelStatuses();
      const memoryUsage = modelManager.getMemoryUsage();
      
      return {
        success: true,
        statuses,
        memoryUsage
      };
    } else {
      throw new Error('Model manager not initialized');
    }
  } catch (error) {
    console.error('Error getting model status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('ai:loadModel', async (event, modelName: string) => {
  try {
    await initializeAIServices();
    
    if (modelManager) {
      const loaded = await modelManager.loadModel(modelName);
      return {
        success: loaded,
        message: loaded ? `Model ${modelName} loaded successfully` : `Failed to load model ${modelName}`
      };
    } else {
      throw new Error('Model manager not initialized');
    }
  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('ai:unloadModel', async (event, modelName: string) => {
  try {
    await initializeAIServices();
    
    if (modelManager) {
      const unloaded = await modelManager.unloadModel(modelName);
      return {
        success: unloaded,
        message: unloaded ? `Model ${modelName} unloaded successfully` : `Failed to unload model ${modelName}`
      };
    } else {
      throw new Error('Model manager not initialized');
    }
  } catch (error) {
    console.error(`Error unloading model ${modelName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Financial Analysis
ipcMain.handle('ai:analyzeFinancialHealth', async () => {
  try {
    await initializeAIServices();
    
    if (dualModelRouter) {
      const result = await dualModelRouter.routeQuery('analyze my financial health');
      return {
        success: result.success,
        analysis: result.data,
        modelUsed: result.modelUsed,
        processingTime: result.processingTime
      };
    } else {
      throw new Error('Dual model router not initialized');
    }
  } catch (error) {
    console.error('Error analyzing financial health:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('ai:optimizeLoans', async () => {
  try {
    await initializeAIServices();
    
    if (dualModelRouter) {
      const result = await dualModelRouter.routeQuery('optimize my loan payments');
      return {
        success: result.success,
        optimization: result.data,
        modelUsed: result.modelUsed,
        processingTime: result.processingTime
      };
    } else {
      throw new Error('Dual model router not initialized');
    }
  } catch (error) {
    console.error('Error optimizing loans:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('ai:forecastBills', async () => {
  try {
    await initializeAIServices();
    
    if (dualModelRouter) {
      const result = await dualModelRouter.routeQuery('forecast my upcoming bills');
      return {
        success: result.success,
        forecast: result.data,
        modelUsed: result.modelUsed,
        processingTime: result.processingTime
      };
    } else {
      throw new Error('Dual model router not initialized');
    }
  } catch (error) {
    console.error('Error forecasting bills:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Auto-Payee Creation
ipcMain.handle('ai:createPayeeFromTransaction', async (event, transaction: Transaction) => {
  try {
    await initializeAIServices();
    
    if (mistralProcessor) {
      const categoryRepo = new CategoryRepository();
      const payeeRepo = new PayeeRepository();
      const availableCategories = categoryRepo.getAll();
      const existingPayees = payeeRepo.getAll();
      
      const result = await mistralProcessor.processTransaction(
        transaction,
        availableCategories,
        existingPayees
      );
      
      if (result.payeeExtraction && result.payeeExtraction.extracted) {
        // Create the new payee
        const newPayee = await payeeRepo.create(result.payeeExtraction.payee);
        
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
    } else {
      throw new Error('Mistral processor not initialized');
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
export const initializeAIHandlers = () => {
  console.log('Enhanced AI IPC handlers initialized');
};

// Cleanup on app quit
export const cleanupAIServices = async () => {
  if (modelManager) {
    await modelManager.dispose();
    modelManager = null;
  }
  
  mistralProcessor = null;
  mistralAIProcessor = null;
  codeLlamaProcessor = null;
  dualModelRouter = null;
};