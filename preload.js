const { contextBridge, ipcRenderer } = require('electron');

// Expose database operations to the renderer process
contextBridge.exposeInMainWorld('api', {
  accounts: {
    // Database operations
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getById: (id) => ipcRenderer.invoke('accounts:getById', id),
    create: (account) => ipcRenderer.invoke('accounts:create', account),
    update: (id, account) => ipcRenderer.invoke('accounts:update', id, account),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id),
    getTotalBalance: () => ipcRenderer.invoke('accounts:getTotalBalance')
  },
  transactions: {
    getAll: () => ipcRenderer.invoke('transactions:getAll'),
    getById: (id) => ipcRenderer.invoke('transactions:getById', id),
    getByAccountId: (accountId) => ipcRenderer.invoke('transactions:getByAccountId', accountId),
    getByDateRange: (startDate, endDate) => 
      ipcRenderer.invoke('transactions:getByDateRange', startDate, endDate),
    getRecent: (limit) => ipcRenderer.invoke('transactions:getRecent', limit),
    searchByDescription: (term) => ipcRenderer.invoke('transactions:searchByDescription', term),
    create: (transaction) => ipcRenderer.invoke('transactions:create', transaction),
    update: (id, transaction) => 
      ipcRenderer.invoke('transactions:update', id, transaction),
    delete: (id) => ipcRenderer.invoke('transactions:delete', id),
    getByCategory: (categoryId) => ipcRenderer.invoke('transactions:getByCategory', categoryId),
    getByType: (type) => ipcRenderer.invoke('transactions:getByType', type),
    getByStatus: (status) => ipcRenderer.invoke('transactions:getByStatus', status)
  },
  // Add database diagnostic information
  database: {
    // You can add database diagnostic methods here in the future
    getStats: () => "SQLite database is active"
  },
  
  // Import/Export operations
  import: {
    // File selection dialog
    showFileDialog: (options) => ipcRenderer.invoke('import:showFileDialog', options),
    
    // File parsing
    parseCSV: (filePath) => ipcRenderer.invoke('import:parseCSV', filePath),
    parseExcel: (filePath) => ipcRenderer.invoke('import:parseExcel', filePath),
    
    // Data validation and import
    validateTransactions: (data, mappings) => 
      ipcRenderer.invoke('import:validateTransactions', data, mappings),
    saveTransactions: (transactions) => 
      ipcRenderer.invoke('import:saveTransactions', transactions)
  },
  
  export: {
    // File save dialog
    showSaveDialog: (options) => ipcRenderer.invoke('export:showSaveDialog', options),
    
    // Export generation
    transactionsToCSV: (options) => ipcRenderer.invoke('export:transactionsToCSV', options),
    transactionsToExcel: (options) => ipcRenderer.invoke('export:transactionsToExcel', options)
  }
});

console.log('Preload script loaded - Database API exposed');
