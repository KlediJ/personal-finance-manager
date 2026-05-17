"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLoanHandlers = setupLoanHandlers;
const electron_1 = require("electron");
const LoanRepository_1 = require("../../src/data-storage/repositories/LoanRepository");
function setupLoanHandlers() {
    const loanRepository = new LoanRepository_1.LoanRepository();
    const amortizationRepository = new LoanRepository_1.AmortizationScheduleRepository();
    // Loan Details
    electron_1.ipcMain.handle('loans:getAll', async () => {
        try {
            return loanRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all loans:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:getById', async (_, id) => {
        try {
            return loanRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting loan ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:create', async (_, loan) => {
        try {
            const id = loanRepository.create(loan);
            // Generate amortization schedule
            const schedule = loanRepository.generateAmortizationSchedule(id);
            if (schedule.length > 0) {
                await amortizationRepository.bulkInsertSchedule(schedule);
            }
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating loan:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:update', async (_, id, loan) => {
        try {
            const success = loanRepository.update(id, loan);
            return { success };
        }
        catch (error) {
            console.error(`Error updating loan ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:delete', async (_, id) => {
        try {
            const success = loanRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting loan ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:getByAccount', async (_, accountId) => {
        try {
            return loanRepository.getLoansByAccount(accountId);
        }
        catch (error) {
            console.error(`Error getting loans for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:getByType', async (_, loanType) => {
        try {
            return loanRepository.getLoansByType(loanType);
        }
        catch (error) {
            console.error(`Error getting loans of type ${loanType}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:getActiveLoan', async (_, accountId) => {
        try {
            return loanRepository.getActiveLoan(accountId);
        }
        catch (error) {
            console.error(`Error getting active loan for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:getWithSummary', async () => {
        try {
            return loanRepository.getLoansWithSummary();
        }
        catch (error) {
            console.error('Error getting loans with summary:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:updateBalance', async (_, loanId, newBalance) => {
        try {
            const success = loanRepository.updateLoanBalance(loanId, newBalance);
            return { success };
        }
        catch (error) {
            console.error(`Error updating loan balance for loan ${loanId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('loans:generateAmortizationSchedule', async (_, loanId) => {
        try {
            const schedule = loanRepository.generateAmortizationSchedule(loanId);
            if (schedule.length > 0) {
                // Clear existing schedule
                const existingSchedule = amortizationRepository.getScheduleByLoan(loanId);
                for (const item of existingSchedule) {
                    if (item.schedule_id) {
                        amortizationRepository.delete(item.schedule_id);
                    }
                }
                // Insert new schedule
                await amortizationRepository.bulkInsertSchedule(schedule);
            }
            return { schedule, success: true };
        }
        catch (error) {
            console.error(`Error generating amortization schedule for loan ${loanId}:`, error);
            throw error;
        }
    });
    // Amortization Schedule
    electron_1.ipcMain.handle('amortization:getAll', async () => {
        try {
            return amortizationRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all amortization schedules:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:getById', async (_, id) => {
        try {
            return amortizationRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting amortization schedule ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:create', async (_, schedule) => {
        try {
            const id = amortizationRepository.create(schedule);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating amortization schedule:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:update', async (_, id, schedule) => {
        try {
            const success = amortizationRepository.update(id, schedule);
            return { success };
        }
        catch (error) {
            console.error(`Error updating amortization schedule ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:delete', async (_, id) => {
        try {
            const success = amortizationRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting amortization schedule ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:getByLoan', async (_, loanId) => {
        try {
            return amortizationRepository.getScheduleByLoan(loanId);
        }
        catch (error) {
            console.error(`Error getting amortization schedule for loan ${loanId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:getActualPayments', async (_, loanId) => {
        try {
            return amortizationRepository.getActualPayments(loanId);
        }
        catch (error) {
            console.error(`Error getting actual payments for loan ${loanId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:markPaymentActual', async (_, scheduleId, transactionId) => {
        try {
            const success = amortizationRepository.markPaymentActual(scheduleId, transactionId);
            return { success };
        }
        catch (error) {
            console.error(`Error marking payment actual for schedule ${scheduleId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('amortization:bulkInsert', async (_, scheduleItems) => {
        try {
            const success = amortizationRepository.bulkInsertSchedule(scheduleItems);
            return { success };
        }
        catch (error) {
            console.error('Error bulk inserting amortization schedule:', error);
            throw error;
        }
    });
}
