"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('api', {
    accounts: {
        getAll: () => electron_1.ipcRenderer.invoke('accounts:getAll'),
        getActive: () => electron_1.ipcRenderer.invoke('accounts:getActive'),
        getById: (id) => electron_1.ipcRenderer.invoke('accounts:getById', id),
        create: (account) => electron_1.ipcRenderer.invoke('accounts:create', account),
        update: (id, account) => electron_1.ipcRenderer.invoke('accounts:update', id, account),
        delete: (id) => electron_1.ipcRenderer.invoke('accounts:delete', id),
        getTotalBalance: () => electron_1.ipcRenderer.invoke('accounts:getTotalBalance')
    },
    transactions: {
        getAll: () => electron_1.ipcRenderer.invoke('transactions:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('transactions:getById', id),
        getByAccountId: (accountId) => electron_1.ipcRenderer.invoke('transactions:getByAccountId', accountId),
        getByDateRange: (startDate, endDate) => electron_1.ipcRenderer.invoke('transactions:getByDateRange', startDate, endDate),
        getRecent: (limit) => electron_1.ipcRenderer.invoke('transactions:getRecent', limit),
        searchByDescription: (term) => electron_1.ipcRenderer.invoke('transactions:searchByDescription', term),
        create: (transaction) => electron_1.ipcRenderer.invoke('transactions:create', transaction),
        update: (id, transaction) => electron_1.ipcRenderer.invoke('transactions:update', id, transaction),
        delete: (id) => electron_1.ipcRenderer.invoke('transactions:delete', id),
        bulkDelete: (ids) => electron_1.ipcRenderer.invoke('transactions:bulkDelete', ids),
        getByCategory: (categoryId) => electron_1.ipcRenderer.invoke('transactions:getByCategory', categoryId),
        getByType: (type) => electron_1.ipcRenderer.invoke('transactions:getByType', type),
        getByStatus: (status) => electron_1.ipcRenderer.invoke('transactions:getByStatus', status)
    },
    categories: {
        getAll: () => electron_1.ipcRenderer.invoke('categories:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('categories:getById', id),
        getByType: (type) => electron_1.ipcRenderer.invoke('categories:getByType', type),
        getParents: () => electron_1.ipcRenderer.invoke('categories:getParents'),
        getSubcategories: (parentId) => electron_1.ipcRenderer.invoke('categories:getSubcategories', parentId),
        getHierarchy: () => electron_1.ipcRenderer.invoke('categories:getHierarchy'),
        create: (category) => electron_1.ipcRenderer.invoke('categories:create', category),
        update: (id, category) => electron_1.ipcRenderer.invoke('categories:update', id, category),
        delete: (id) => electron_1.ipcRenderer.invoke('categories:delete', id)
    },
    database: {
        // You can add database diagnostic methods here in the future
        getStats: () => "SQLite database is active"
    },
    // Import/Export operations
    import: {
        // File selection dialog
        showFileDialog: (options) => electron_1.ipcRenderer.invoke('import:showFileDialog', options),
        
        // File parsing
        parseCSV: (filePath) => electron_1.ipcRenderer.invoke('import:parseCSV', filePath),
        parseExcel: (filePath) => electron_1.ipcRenderer.invoke('import:parseExcel', filePath),
        
        // Data validation and import
        validateTransactions: (data, mappings) => 
            electron_1.ipcRenderer.invoke('import:validateTransactions', data, mappings),
        saveTransactions: (transactions) => 
            electron_1.ipcRenderer.invoke('import:saveTransactions', transactions)
    },
    
    export: {
        // File save dialog
        showSaveDialog: (options) => electron_1.ipcRenderer.invoke('export:showSaveDialog', options),
        
        // Export generation
        transactionsToCSV: (options) => electron_1.ipcRenderer.invoke('export:transactionsToCSV', options),
        transactionsToExcel: (options) => electron_1.ipcRenderer.invoke('export:transactionsToExcel', options)
    }
});
//# sourceMappingURL=preload.js.map