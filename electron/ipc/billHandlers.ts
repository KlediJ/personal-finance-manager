import { ipcMain } from 'electron';
import { RecurringBillRepository, BillPaymentRepository } from '../../src/data-storage/repositories/RecurringBillRepository';
import { RecurringBill, BillPayment } from '../../src/data-storage/models/RecurringBill';

export function setupBillHandlers(): void {
  const billRepository = new RecurringBillRepository();
  const billPaymentRepository = new BillPaymentRepository();

  // Recurring Bills
  ipcMain.handle('bills:getAll', async () => {
    try {
      return billRepository.getAll();
    } catch (error) {
      console.error('Error getting all bills:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getActive', async () => {
    try {
      return billRepository.getActiveBills();
    } catch (error) {
      console.error('Error getting active bills:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getById', async (_, id: number) => {
    try {
      return billRepository.getById(id);
    } catch (error) {
      console.error(`Error getting bill ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('bills:create', async (_, bill: RecurringBill) => {
    try {
      const id = billRepository.create(bill);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:update', async (_, id: number, bill: RecurringBill) => {
    try {
      const success = billRepository.update(id, bill);
      return { success };
    } catch (error) {
      console.error(`Error updating bill ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('bills:delete', async (_, id: number) => {
    try {
      const success = billRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting bill ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('bills:getByPayee', async (_, payeeId: number) => {
    try {
      return billRepository.getBillsByPayee(payeeId);
    } catch (error) {
      console.error(`Error getting bills for payee ${payeeId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('bills:getByAccount', async (_, accountId: number) => {
    try {
      return billRepository.getBillsByAccount(accountId);
    } catch (error) {
      console.error(`Error getting bills for account ${accountId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('bills:getUpcoming', async (_, daysAhead: number = 30) => {
    try {
      return billRepository.getUpcomingBills(daysAhead);
    } catch (error) {
      console.error('Error getting upcoming bills:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getWithSummary', async () => {
    try {
      return billRepository.getBillsWithSummary();
    } catch (error) {
      console.error('Error getting bills with summary:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getOverdue', async () => {
    try {
      return billRepository.getOverdueBills();
    } catch (error) {
      console.error('Error getting overdue bills:', error);
      throw error;
    }
  });

  // Bill Payments
  ipcMain.handle('billPayments:getAll', async () => {
    try {
      return billPaymentRepository.getAll();
    } catch (error) {
      console.error('Error getting all bill payments:', error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:getById', async (_, id: number) => {
    try {
      return billPaymentRepository.getById(id);
    } catch (error) {
      console.error(`Error getting bill payment ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:create', async (_, payment: BillPayment) => {
    try {
      const id = billPaymentRepository.create(payment);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating bill payment:', error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:update', async (_, id: number, payment: BillPayment) => {
    try {
      const success = billPaymentRepository.update(id, payment);
      return { success };
    } catch (error) {
      console.error(`Error updating bill payment ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:delete', async (_, id: number) => {
    try {
      const success = billPaymentRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting bill payment ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:getByBill', async (_, billId: number) => {
    try {
      return billPaymentRepository.getPaymentsByBill(billId);
    } catch (error) {
      console.error(`Error getting payments for bill ${billId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:getOverdue', async () => {
    try {
      return billPaymentRepository.getOverduePayments();
    } catch (error) {
      console.error('Error getting overdue payments:', error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:getUpcoming', async (_, daysAhead: number = 7) => {
    try {
      return billPaymentRepository.getUpcomingPayments(daysAhead);
    } catch (error) {
      console.error('Error getting upcoming payments:', error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:markPaid', async (_, paymentId: number, transactionId: number, amountPaid: number) => {
    try {
      const success = billPaymentRepository.markPaymentPaid(paymentId, transactionId, amountPaid);
      return { success };
    } catch (error) {
      console.error(`Error marking payment ${paymentId} as paid:`, error);
      throw error;
    }
  });

  ipcMain.handle('billPayments:markOverdue', async (_, paymentId: number, daysLate: number, lateFee: number = 0) => {
    try {
      const success = billPaymentRepository.markPaymentOverdue(paymentId, daysLate, lateFee);
      return { success };
    } catch (error) {
      console.error(`Error marking payment ${paymentId} as overdue:`, error);
      throw error;
    }
  });
}