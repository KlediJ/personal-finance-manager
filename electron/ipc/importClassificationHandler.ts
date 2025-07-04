import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { TransactionClassifier } from '../../src/data-processing/import-export/smart-import/TransactionClassifier';

export function setupImportClassificationHandler(): void {
  const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();
  let classifier: TransactionClassifier | null = null;
  
  // Initialize the transaction classifier once at startup
  const initializeClassifier = async () => {
    try {
      // Get all categories from the database
      const categories = categoryRepository.getAll();
      
      // Initialize the classifier
      classifier = TransactionClassifier.getInstance({
        minConfidence: 0.6,   // Minimum confidence for a category match
        enableTensorFlow: true, // Use ML-based classification when possible
        useCache: true        // Cache results to improve performance
      });
      
      // Set the categories
      classifier.setCategories(categories);
      
      // Initialize the classifier (loads TensorFlow, etc.)
      await classifier.initialize();
      
      console.log('Transaction classifier initialized with user categories');
      return true;
    } catch (error) {
      console.error('Failed to initialize transaction classifier:', error);
      return false;
    }
  };
  
  // Handler for initializing the classifier
  ipcMain.handle('import:initializeClassifier', async () => {
    try {
      const success = await initializeClassifier();
      return { success };
    } catch (error) {
      console.error('Error initializing classifier:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handler for classifying a transaction
  ipcMain.handle('import:classifyTransaction', async (_, transaction) => {
    try {
      // Initialize classifier if not already done
      if (!classifier) {
        await initializeClassifier();
      }
      
      // Classify the transaction
      const result = await classifier!.classifyTransaction({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        transaction_type: transaction.transaction_type
      });
      
      if (result) {
        return {
          success: true,
          category_id: result.category_id,
          category_name: result.category_name,
          confidence: result.confidence
        };
      } else {
        return {
          success: false,
          message: 'No suitable category found'
        };
      }
    } catch (error) {
      console.error('Error classifying transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Handler for batch classifying multiple transactions
  ipcMain.handle('import:classifyTransactions', async (_, transactions) => {
    try {
      // Initialize classifier if not already done
      if (!classifier) {
        await initializeClassifier();
      }
      
      // Process each transaction
      const results = [];
      
      for (const transaction of transactions) {
        const classification = await classifier!.classifyTransaction({
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          transaction_type: transaction.transaction_type
        });
        
        results.push({
          index: transaction.index,
          transaction_id: transaction.transaction_id,
          classification: classification ? {
            category_id: classification.category_id,
            category_name: classification.category_name,
            confidence: classification.confidence
          } : null
        });
      }
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error batch classifying transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Handler for updating the classifier categories
  ipcMain.handle('import:updateClassifierCategories', async () => {
    try {
      // Reload all categories
      const categories = categoryRepository.getAll();
      
      // Update the classifier's categories
      if (classifier) {
        classifier.setCategories(categories);
        return { success: true };
      } else {
        // Initialize if not already done
        await initializeClassifier();
        return { success: true };
      }
    } catch (error) {
      console.error('Error updating classifier categories:', error);
      return { success: false, error: error.message };
    }
  });
}
