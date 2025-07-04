  // Get categories for classification
  ipcMain.handle('import:getCategories', async () => {
    try {
      const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();
      const categories = await categoryRepository.getAll();
      
      return {
        success: true,
        categories
      };
    } catch (error) {
      console.error('Error getting categories for classification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Workbook } from 'exceljs';
import { CsvProcessor } from '../../src/data-processing/import-export/CsvProcessor';
import { ExcelProcessor } from '../../src/data-processing/import-export/ExcelProcessor';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Transaction } from '../../src/data-storage/models/Transaction';
import { SmartColumnDetector } from '../../src/data-processing/import-export/smart-import/SmartColumnDetector';
import { TransactionClassifier, TransactionData } from '../../src/data-processing/import-export/smart-import/TransactionClassifier';

export function setupImportHandlers(): void {
  const transactionRepository = DatabaseManager.getInstance().getTransactionRepository();
  const accountRepository = DatabaseManager.getInstance().getAccountRepository();
  const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();

  // Show file dialog for choosing import files
  ipcMain.handle('import:showFileDialog', async (_, options) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: options?.filters || [
          { name: 'All Files', extensions: ['*'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
        ]
      });
      
      return {
        canceled: result.canceled,
        filePath: result.filePaths.length > 0 ? result.filePaths[0] : null
      };
    } catch (error) {
      console.error('Error showing file dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  // Parse CSV file with smart column detection
  ipcMain.handle('import:parseCSV', async (_, filePath) => {
    try {
      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Parse CSV using the CsvProcessor
      const result = await CsvProcessor.parseFile(fileContent);
      
      // Apply smart column detection if we have data
      let suggestedMappings = {};
      if (result.data && result.data.length > 0 && result.meta.fields) {
        // Use the first few rows for pattern detection
        const sampleData = result.data.slice(0, Math.min(10, result.data.length));
        
        // Detect column mappings
        const detectedMappings = SmartColumnDetector.detectColumnMappings(
          result.meta.fields,
          sampleData
        );
        
        // Generate the final mappings
        suggestedMappings = SmartColumnDetector.generateMappings(detectedMappings);
      }
      
      return {
        success: true,
        data: result.data,
        meta: result.meta,
        errors: result.errors,
        suggestedMappings: suggestedMappings
      };
    } catch (error) {
      console.error('Error parsing CSV file:', error);
      return {
        success: false,
        errors: [{ message: error.message }]
      };
    }
  });

  // Parse Excel file with smart column detection
  ipcMain.handle('import:parseExcel', async (_, filePath) => {
    try {
      // Read Excel file
      const workbook = new Workbook();
      await workbook.xlsx.readFile(filePath);
      
      // Parse workbook using the ExcelProcessor
      const result = ExcelProcessor.parseWorkbook(workbook);
      
      // Add smart column detection for each sheet
      if (result.sheets && result.sheets.length > 0) {
        for (const sheet of result.sheets) {
          // Skip empty sheets
          if (!sheet.headers || !sheet.data || sheet.data.length === 0) continue;
          
          // Use the first few rows for pattern detection
          const sampleData = sheet.data.slice(0, Math.min(10, sheet.data.length));
          
          // Detect column mappings
          const detectedMappings = SmartColumnDetector.detectColumnMappings(
            sheet.headers,
            sampleData
          );
          
          // Generate the final mappings
          sheet.suggestedMappings = SmartColumnDetector.generateMappings(detectedMappings);
        }
      }
      
      return {
        success: true,
        sheets: result.sheets
      };
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return {
        success: false,
        errors: [{ message: error.message }]
      };
    }
  });

  // Get categories for classification
  ipcMain.handle('import:getCategories', async () => {
    try {
      const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();
      const categories = await categoryRepository.getAll();
      
      return {
        success: true,
        categories
      };
    } catch (error) {
      console.error('Error getting categories for classification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Save validated transactions
  ipcMain.handle('import:saveTransactions', async (_, transactions: Transaction[]) => {
    try {
      // Insert transactions using repository
      const count = transactionRepository.bulkInsert(transactions);
      
      return {
        success: true,
        count
      };
    } catch (error) {
      console.error('Error saving transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Initialize transaction classifier
  const initializeClassifier = async () => {
    try {
      // Get all categories
      const categories = categoryRepository.getAll();
      
      // Initialize the classifier
      const classifier = TransactionClassifier.getInstance({
        minConfidence: 0.5,  // Lower threshold to get more suggestions
        enableTensorFlow: true,
        useCache: true
      });
      
      // Set user's categories
      classifier.setCategories(categories.map(cat => ({
        category_id: cat.category_id,
        name: cat.name,
        type: cat.type,
        parent_id: cat.parent_id
      })));
      
      // Initialize the model
      await classifier.initialize();
      
      return classifier;
    } catch (error) {
      console.error('Error initializing classifier:', error);
      return null;
    }
  };
  
  // Lazy-loaded classifier instance
  let classifierPromise: Promise<TransactionClassifier | null> | null = null;
  
  // Get or initialize classifier
  const getClassifier = async () => {
    if (!classifierPromise) {
      classifierPromise = initializeClassifier();
    }
    return classifierPromise;
  };
  
  // Classify transactions (for import suggestions)
  ipcMain.handle('import:classifyTransactions', async (_, transactions: TransactionData[]) => {
    try {
      // Get classifier
      const classifier = await getClassifier();
      
      if (!classifier) {
        throw new Error('Classifier initialization failed');
      }
      
      // Process each transaction (limit to 100 at a time for performance)
      const limitedTransactions = transactions.slice(0, 100);
      const results = [];
      
      for (const transaction of limitedTransactions) {
        try {
          const categoryMatch = await classifier.classifyTransaction(transaction);
          
          results.push({
            transaction,
            categoryMatch: categoryMatch || null
          });
        } catch (err) {
          console.error('Error classifying transaction:', err);
          results.push({
            transaction,
            categoryMatch: null,
            error: 'Classification failed'
          });
        }
      }
      
      return {
        success: true,
        classifications: results
      };
    } catch (error) {
      console.error('Error in batch classification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}
