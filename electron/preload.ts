import { contextBridge, ipcRenderer } from 'electron';
import { Account } from '../src/data-storage/models/Account';
import { Transaction } from '../src/data-storage/models/Transaction';
import { Category } from '../src/data-storage/models/Category';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
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
  }
});
