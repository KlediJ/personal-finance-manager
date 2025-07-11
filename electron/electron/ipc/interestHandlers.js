"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupInterestHandlers = setupInterestHandlers;
const electron_1 = require("electron");
const InterestExpenseRepository_1 = require("../../src/data-storage/repositories/InterestExpenseRepository");
function setupInterestHandlers() {
    const interestRepository = new InterestExpenseRepository_1.InterestExpenseRepository();
    // Interest Expenses
    electron_1.ipcMain.handle('interest:getAll', async () => {
        try {
            return interestRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all interest expenses:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getById', async (_, id) => {
        try {
            return interestRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting interest expense ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:create', async (_, expense) => {
        try {
            const id = interestRepository.create(expense);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating interest expense:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:update', async (_, id, expense) => {
        try {
            const success = interestRepository.update(id, expense);
            return { success };
        }
        catch (error) {
            console.error(`Error updating interest expense ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:delete', async (_, id) => {
        try {
            const success = interestRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting interest expense ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getByAccount', async (_, accountId) => {
        try {
            return interestRepository.getExpensesByAccount(accountId);
        }
        catch (error) {
            console.error(`Error getting interest expenses for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getByType', async (_, expenseType) => {
        try {
            return interestRepository.getExpensesByType(expenseType);
        }
        catch (error) {
            console.error(`Error getting interest expenses of type ${expenseType}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getByDateRange', async (_, startDate, endDate) => {
        try {
            return interestRepository.getExpensesByDateRange(startDate, endDate);
        }
        catch (error) {
            console.error(`Error getting interest expenses for date range ${startDate} to ${endDate}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getWithSummary', async () => {
        try {
            return interestRepository.getExpensesWithSummary();
        }
        catch (error) {
            console.error('Error getting interest expenses with summary:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getTotalByAccount', async (_, accountId, year) => {
        try {
            return interestRepository.getTotalInterestByAccount(accountId, year);
        }
        catch (error) {
            console.error(`Error getting total interest for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getTotalByType', async (_, expenseType, year) => {
        try {
            return interestRepository.getTotalInterestByType(expenseType, year);
        }
        catch (error) {
            console.error(`Error getting total interest for type ${expenseType}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getMonthlyTrend', async (_, accountId, months = 12) => {
        try {
            return interestRepository.getMonthlyInterestTrend(accountId, months);
        }
        catch (error) {
            console.error(`Error getting monthly interest trend for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:getCreditCardAnalysis', async (_, accountId) => {
        try {
            return interestRepository.calculateCreditCardInterestAnalysis(accountId);
        }
        catch (error) {
            console.error(`Error getting credit card analysis for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('interest:recordExpense', async (_, params) => {
        try {
            const id = interestRepository.recordInterestExpense(params.accountId, params.expenseType, params.periodStart, params.periodEnd, params.averageBalance, params.interestRate, params.interestAmount, params.transactionId);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error recording interest expense:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=interestHandlers.js.map