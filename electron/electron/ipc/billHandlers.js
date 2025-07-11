"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBillHandlers = setupBillHandlers;
const electron_1 = require("electron");
const RecurringBillRepository_1 = require("../../src/data-storage/repositories/RecurringBillRepository");
function setupBillHandlers() {
    const billRepository = new RecurringBillRepository_1.RecurringBillRepository();
    const billPaymentRepository = new RecurringBillRepository_1.BillPaymentRepository();
    // Recurring Bills
    electron_1.ipcMain.handle('bills:getAll', async () => {
        try {
            return billRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all bills:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getActive', async () => {
        try {
            return billRepository.getActiveBills();
        }
        catch (error) {
            console.error('Error getting active bills:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getById', async (_, id) => {
        try {
            return billRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting bill ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:create', async (_, bill) => {
        try {
            const id = billRepository.create(bill);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating bill:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:update', async (_, id, bill) => {
        try {
            const success = billRepository.update(id, bill);
            return { success };
        }
        catch (error) {
            console.error(`Error updating bill ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:delete', async (_, id) => {
        try {
            const success = billRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting bill ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getByPayee', async (_, payeeId) => {
        try {
            return billRepository.getBillsByPayee(payeeId);
        }
        catch (error) {
            console.error(`Error getting bills for payee ${payeeId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getByAccount', async (_, accountId) => {
        try {
            return billRepository.getBillsByAccount(accountId);
        }
        catch (error) {
            console.error(`Error getting bills for account ${accountId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getUpcoming', async (_, daysAhead = 30) => {
        try {
            return billRepository.getUpcomingBills(daysAhead);
        }
        catch (error) {
            console.error('Error getting upcoming bills:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getWithSummary', async () => {
        try {
            return billRepository.getBillsWithSummary();
        }
        catch (error) {
            console.error('Error getting bills with summary:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('bills:getOverdue', async () => {
        try {
            return billRepository.getOverdueBills();
        }
        catch (error) {
            console.error('Error getting overdue bills:', error);
            throw error;
        }
    });
    // Bill Payments
    electron_1.ipcMain.handle('billPayments:getAll', async () => {
        try {
            return billPaymentRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all bill payments:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:getById', async (_, id) => {
        try {
            return billPaymentRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting bill payment ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:create', async (_, payment) => {
        try {
            const id = billPaymentRepository.create(payment);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating bill payment:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:update', async (_, id, payment) => {
        try {
            const success = billPaymentRepository.update(id, payment);
            return { success };
        }
        catch (error) {
            console.error(`Error updating bill payment ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:delete', async (_, id) => {
        try {
            const success = billPaymentRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting bill payment ${id}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:getByBill', async (_, billId) => {
        try {
            return billPaymentRepository.getPaymentsByBill(billId);
        }
        catch (error) {
            console.error(`Error getting payments for bill ${billId}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:getOverdue', async () => {
        try {
            return billPaymentRepository.getOverduePayments();
        }
        catch (error) {
            console.error('Error getting overdue payments:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:getUpcoming', async (_, daysAhead = 7) => {
        try {
            return billPaymentRepository.getUpcomingPayments(daysAhead);
        }
        catch (error) {
            console.error('Error getting upcoming payments:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:markPaid', async (_, paymentId, transactionId, amountPaid) => {
        try {
            const success = billPaymentRepository.markPaymentPaid(paymentId, transactionId, amountPaid);
            return { success };
        }
        catch (error) {
            console.error(`Error marking payment ${paymentId} as paid:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('billPayments:markOverdue', async (_, paymentId, daysLate, lateFee = 0) => {
        try {
            const success = billPaymentRepository.markPaymentOverdue(paymentId, daysLate, lateFee);
            return { success };
        }
        catch (error) {
            console.error(`Error marking payment ${paymentId} as overdue:`, error);
            throw error;
        }
    });
}
//# sourceMappingURL=billHandlers.js.map