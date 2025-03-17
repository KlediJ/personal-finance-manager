import { contextBridge, ipcRenderer } from 'electron';
import { Account } from '../src/data-storage/models/Account';

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
  }
});
