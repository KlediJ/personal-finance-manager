import { contextBridge, ipcRenderer } from 'electron';
import { Account } from '../src/data-storage/models/Account';
import { Transaction } from '../src/data-storage/models/Transaction';
import { Category } from '../src/data-storage/models/Category';
import { Budget } from '../src/data-storage/models/Budget';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get environment information
  getEnvironment: () => ipcRenderer.invoke('app:getEnvironment')
});

contextBridge.exposeInMainWorld('api', {
  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getActive: () => ipcRenderer.invoke('accounts:getActive'),
    getById: (id: number) => ipcRenderer.invoke('accounts:getById', id),
    create: (account: Account) => ipcRenderer.invoke('accounts:create', account),
    update: (id: number, account: Account) => ipcRenderer.invoke('accounts:update', id, account),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
    getTotalBalance: () => ipcRenderer.invoke('accounts:getTotalBalance')
  },
  transactions: {
    getAll: () => ipcRenderer.invoke('transactions:getAll'),
    getById: (id: number) => ipcRenderer.invoke('transactions:getById', id),
    getByAccountId: (accountId: number) => ipcRenderer.invoke('transactions:getByAccountId', accountId),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('transactions:getByDateRange', startDate, endDate),
    getRecent: (limit: number) => ipcRenderer.invoke('transactions:getRecent', limit),
    searchByDescription: (term: string) => ipcRenderer.invoke('transactions:searchByDescription', term),
    create: (transaction: Transaction) => ipcRenderer.invoke('transactions:create', transaction),
    update: (id: number, transaction: Transaction) => 
      ipcRenderer.invoke('transactions:update', id, transaction),
    delete: (id: number) => ipcRenderer.invoke('transactions:delete', id),
    bulkDelete: (ids: number[]) => ipcRenderer.invoke('transactions:bulkDelete', ids),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('transactions:getByCategory', categoryId),
    getByType: (type: string) => ipcRenderer.invoke('transactions:getByType', type),
    getByStatus: (status: string) => ipcRenderer.invoke('transactions:getByStatus', status)
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    getById: (id: number) => ipcRenderer.invoke('categories:getById', id),
    getByType: (type: string) => ipcRenderer.invoke('categories:getByType', type),
    getParents: () => ipcRenderer.invoke('categories:getParents'),
    getSubcategories: (parentId: number) => ipcRenderer.invoke('categories:getSubcategories', parentId),
    getHierarchy: () => ipcRenderer.invoke('categories:getHierarchy'),
    create: (category: Category) => ipcRenderer.invoke('categories:create', category),
    update: (id: number, category: Category) => ipcRenderer.invoke('categories:update', id, category),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },
  database: {
    // You can add database diagnostic methods here in the future
    getStats: () => "SQLite database is active"
  },
  
  budgets: {
    getAll: () => ipcRenderer.invoke('budgets:getAll'),
    getAllWithCategories: () => {
      console.log('Preload: Calling budgets:getAllWithCategories');
      return ipcRenderer.invoke('budgets:getAllWithCategories');
    },
    getById: (id: number) => ipcRenderer.invoke('budgets:getById', id),
    getByPeriod: (period: string) => ipcRenderer.invoke('budgets:getByPeriod', period),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('budgets:getByDateRange', startDate, endDate),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('budgets:getByCategory', categoryId),
    getCurrentBudgets: () => ipcRenderer.invoke('budgets:getCurrentBudgets'),
    getCurrentBudgetsWithCategories: () => ipcRenderer.invoke('budgets:getCurrentBudgetsWithCategories'),
    getBudgetProgress: (date?: string) => {
      console.log('Preload: Calling budgets:getBudgetProgress', date);
      return ipcRenderer.invoke('budgets:getBudgetProgress', date);
    },
    create: (budget: Budget) => ipcRenderer.invoke('budgets:create', budget),
    update: (id: number, budget: Budget) => ipcRenderer.invoke('budgets:update', id, budget),
    delete: (id: number) => ipcRenderer.invoke('budgets:delete', id)
  },
  
  // Import/Export operations
  import: {
    // File selection dialog
    showFileDialog: (options?: any) => ipcRenderer.invoke('import:showFileDialog', options),
    
    // File parsing
    parseCSV: (filePath: string) => ipcRenderer.invoke('import:parseCSV', filePath),
    parseExcel: (filePath: string) => ipcRenderer.invoke('import:parseExcel', filePath),
    
    // Data validation and import
    validateTransactions: (data: any[], mappings: Record<string, string>) => 
      ipcRenderer.invoke('import:validateTransactions', data, mappings),
    saveTransactions: (transactions: Transaction[]) => 
      ipcRenderer.invoke('import:saveTransactions', transactions)
  },
  
  export: {
    // File save dialog
    showSaveDialog: (options?: { format?: 'csv' | 'excel' }) => 
      ipcRenderer.invoke('export:showSaveDialog', options),
    
    // Export generation
    transactionsToCSV: (options: { filePath: string, filters?: any }) => 
      ipcRenderer.invoke('export:transactionsToCSV', options),
    transactionsToExcel: (options: { filePath: string, filters?: any }) => 
      ipcRenderer.invoke('export:transactionsToExcel', options)
  },
  
  // AI Services
  ai: {
    // Status and initialization
    getStatus: () => ipcRenderer.invoke('ai:getStatus'),
    updateContext: () => ipcRenderer.invoke('ai:updateContext'),
    clearModels: () => ipcRenderer.invoke('ai:clearModels'),
    
    // Transaction categorization
    categorizeTransaction: (transaction: Transaction) => 
      ipcRenderer.invoke('ai:categorizeTransaction', transaction),
    batchCategorizeTransactions: (transactions: Transaction[]) => 
      ipcRenderer.invoke('ai:batchCategorizeTransactions', transactions),
    learnFromFeedback: (feedback: any) => 
      ipcRenderer.invoke('ai:learnFromFeedback', feedback),
    
    // Query processing
    processQuery: (query: string) => ipcRenderer.invoke('ai:processQuery', query),
    
    // Data helpers
    getUncategorizedTransactions: () => ipcRenderer.invoke('ai:getUncategorizedTransactions'),
    getStatistics: () => ipcRenderer.invoke('ai:getStatistics'),
    
    // Progress listeners
    onCategorizationProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ai:categorization-progress', (event, progress) => callback(progress));
    },
    removeCategorizationProgressListener: () => {
      ipcRenderer.removeAllListeners('ai:categorization-progress');
    }
  }
});
