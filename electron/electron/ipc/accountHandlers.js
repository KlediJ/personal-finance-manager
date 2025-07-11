"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAccountHandlers = setupAccountHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupAccountHandlers() {
    const accountRepository = DatabaseManager_1.DatabaseManager.getInstance().getAccountRepository();
    // Get all accounts
    electron_1.ipcMain.handle('accounts:getAll', async () => {
        try {
            return accountRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all accounts:', error);
            throw error;
        }
    });
    // Get active accounts
    electron_1.ipcMain.handle('accounts:getActive', async () => {
        try {
            return accountRepository.getActiveAccounts();
        }
        catch (error) {
            console.error('Error getting active accounts:', error);
            throw error;
        }
    });
    // Get account by ID
    electron_1.ipcMain.handle('accounts:getById', async (_, id) => {
        try {
            return accountRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting account ${id}:`, error);
            throw error;
        }
    });
    // Create account
    electron_1.ipcMain.handle('accounts:create', async (_, account) => {
        try {
            const id = accountRepository.create(account);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating account:', error);
            throw error;
        }
    });
    // Update account
    electron_1.ipcMain.handle('accounts:update', async (_, id, account) => {
        try {
            const success = accountRepository.update(id, account);
            return { success };
        }
        catch (error) {
            console.error(`Error updating account ${id}:`, error);
            throw error;
        }
    });
    // Delete account
    electron_1.ipcMain.handle('accounts:delete', async (_, id) => {
        try {
            const success = accountRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting account ${id}:`, error);
            throw error;
        }
    });
    // Get total balance
    electron_1.ipcMain.handle('accounts:getTotalBalance', async () => {
        try {
            return accountRepository.getTotalBalance();
        }
        catch (error) {
            console.error('Error getting total balance:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=accountHandlers.js.map