"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBudgetHandlers = setupBudgetHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupBudgetHandlers() {
    // Get database manager instance
    const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
    if (!dbManager) {
        console.error('Database manager not initialized');
        throw new Error('Database manager not initialized');
    }
    // Get budget repository from the database manager
    const budgetRepository = dbManager.getBudgetRepository();
    if (!budgetRepository) {
        console.error('Budget repository not initialized');
        throw new Error('Budget repository not initialized');
    }
    // Get all budgets
    electron_1.ipcMain.handle('budgets:getAll', async () => {
        try {
            return budgetRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all budgets:', error);
            throw error;
        }
    });
    // Get all budgets with category information
    electron_1.ipcMain.handle('budgets:getAllWithCategories', async () => {
        try {
            return budgetRepository.getAllWithCategories();
        }
        catch (error) {
            console.error('Error getting all budgets with categories:', error);
            throw error;
        }
    });
    // Get budget by ID
    electron_1.ipcMain.handle('budgets:getById', async (_, id) => {
        try {
            return budgetRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting budget ${id}:`, error);
            throw error;
        }
    });
    // Get budgets by period
    electron_1.ipcMain.handle('budgets:getByPeriod', async (_, period) => {
        try {
            return budgetRepository.getByPeriod(period);
        }
        catch (error) {
            console.error(`Error getting budgets for period ${period}:`, error);
            throw error;
        }
    });
    // Get budgets by date range
    electron_1.ipcMain.handle('budgets:getByDateRange', async (_, startDate, endDate) => {
        try {
            return budgetRepository.getByDateRange(startDate, endDate);
        }
        catch (error) {
            console.error(`Error getting budgets between ${startDate} and ${endDate}:`, error);
            throw error;
        }
    });
    // Get budgets by category
    electron_1.ipcMain.handle('budgets:getByCategory', async (_, categoryId) => {
        try {
            return budgetRepository.getByCategory(categoryId);
        }
        catch (error) {
            console.error(`Error getting budgets for category ${categoryId}:`, error);
            throw error;
        }
    });
    // Get current active budgets
    electron_1.ipcMain.handle('budgets:getCurrentBudgets', async () => {
        try {
            return budgetRepository.getCurrentBudgets();
        }
        catch (error) {
            console.error('Error getting current budgets:', error);
            throw error;
        }
    });
    // Get current active budgets with category information
    electron_1.ipcMain.handle('budgets:getCurrentBudgetsWithCategories', async () => {
        try {
            return budgetRepository.getCurrentBudgetsWithCategories();
        }
        catch (error) {
            console.error('Error getting current budgets with categories:', error);
            throw error;
        }
    });
    // Get budget progress
    electron_1.ipcMain.handle('budgets:getBudgetProgress', async (_, date) => {
        try {
            return budgetRepository.getBudgetProgress(date);
        }
        catch (error) {
            console.error('Error getting budget progress:', error);
            throw error;
        }
    });
    // Create budget
    electron_1.ipcMain.handle('budgets:create', async (_, budget) => {
        try {
            const id = budgetRepository.create(budget);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating budget:', error);
            throw error;
        }
    });
    // Update budget
    electron_1.ipcMain.handle('budgets:update', async (_, id, budget) => {
        try {
            const success = budgetRepository.update(id, budget);
            return { success };
        }
        catch (error) {
            console.error(`Error updating budget ${id}:`, error);
            throw error;
        }
    });
    // Delete budget
    electron_1.ipcMain.handle('budgets:delete', async (_, id) => {
        try {
            const success = budgetRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting budget ${id}:`, error);
            throw error;
        }
    });
}
