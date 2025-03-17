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
  // Add database diagnostic information
  database: {
    // You can add database diagnostic methods here in the future
    getStats: () => "SQLite database is active"
  }
});

console.log('Preload script loaded - Database API exposed');
