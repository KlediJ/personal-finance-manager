"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTransactionHandlers = setupTransactionHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupTransactionHandlers() {
    const transactionRepository = DatabaseManager_1.DatabaseManager.getInstance().getTransactionRepository();
    // Get all transactions
    electron_1.ipcMain.handle('transactions:getAll', async () => {
        try {
            return transactionRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all transactions:', error);
            throw error;
        }
    });
    // Get transaction by ID
    electron_1.ipcMain.handle('transactions:getById', async (_, id) => {
        try {
            return transactionRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting transaction ${id}:`, error);
            throw error;
        }
    });
    // Get transactions by account ID
    electron_1.ipcMain.handle('transactions:getByAccountId', async (_, accountId) => {
        try {
            return transactionRepository.getByAccountId(accountId);
        }
        catch (error) {
            console.error(`Error getting transactions for account ${accountId}:`, error);
            throw error;
        }
    });
    // Get transactions by date range
    electron_1.ipcMain.handle('transactions:getByDateRange', async (_, startDate, endDate) => {
        try {
            return transactionRepository.getByDateRange(startDate, endDate);
        }
        catch (error) {
            console.error(`Error getting transactions between ${startDate} and ${endDate}:`, error);
            throw error;
        }
    });
    // Get recent transactions
    electron_1.ipcMain.handle('transactions:getRecent', async (_, limit) => {
        try {
            return transactionRepository.getRecent(limit);
        }
        catch (error) {
            console.error(`Error getting recent transactions (limit: ${limit}):`, error);
            throw error;
        }
    });
    // Search transactions by description
    electron_1.ipcMain.handle('transactions:searchByDescription', async (_, term) => {
        try {
            return transactionRepository.searchByDescription(term);
        }
        catch (error) {
            console.error(`Error searching transactions with term "${term}":`, error);
            throw error;
        }
    });
    // Create transaction
    electron_1.ipcMain.handle('transactions:create', async (_, transaction) => {
        try {
            const id = transactionRepository.create(transaction);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    });
    // Update transaction
    electron_1.ipcMain.handle('transactions:update', async (_, id, transaction) => {
        try {
            const success = transactionRepository.update(id, transaction);
            return { success };
        }
        catch (error) {
            console.error(`Error updating transaction ${id}:`, error);
            throw error;
        }
    });
    // Delete transaction
    electron_1.ipcMain.handle('transactions:delete', async (_, id) => {
        try {
            const success = transactionRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting transaction ${id}:`, error);
            throw error;
        }
    });
    // Get transactions by category
    electron_1.ipcMain.handle('transactions:getByCategory', async (_, categoryId) => {
        try {
            return transactionRepository.getByCategory(categoryId);
        }
        catch (error) {
            console.error(`Error getting transactions for category ${categoryId}:`, error);
            throw error;
        }
    });
    // Get transactions by type
    electron_1.ipcMain.handle('transactions:getByType', async (_, type) => {
        try {
            return transactionRepository.getByType(type);
        }
        catch (error) {
            console.error(`Error getting transactions of type ${type}:`, error);
            throw error;
        }
    });
    // Get transactions by status
    electron_1.ipcMain.handle('transactions:getByStatus', async (_, status) => {
        try {
            return transactionRepository.getByStatus(status);
        }
        catch (error) {
            console.error(`Error getting transactions with status ${status}:`, error);
            throw error;
        }
    });
}
//# sourceMappingURL=transactionHandlers.js.map