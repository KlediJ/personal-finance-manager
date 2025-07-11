import { ipcMain } from 'electron';
import { InterestExpenseRepository } from '../../src/data-storage/repositories/InterestExpenseRepository';
import { InterestExpense, InterestExpenseType } from '../../src/data-storage/models/InterestExpense';

export function setupInterestHandlers(): void {
  const interestRepository = new InterestExpenseRepository();

  // Interest Expenses
  ipcMain.handle('interest:getAll', async () => {
    try {
      return interestRepository.getAll();
    } catch (error) {
      console.error('Error getting all interest expenses:', error);
      throw error;
    }
  });

  ipcMain.handle('interest:getById', async (_, id: number) => {
    try {
      return interestRepository.getById(id);
    } catch (error) {
      console.error(`Error getting interest expense ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:create', async (_, expense: InterestExpense) => {
    try {
      const id = interestRepository.create(expense);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating interest expense:', error);
      throw error;
    }
  });

  ipcMain.handle('interest:update', async (_, id: number, expense: InterestExpense) => {
    try {
      const success = interestRepository.update(id, expense);
      return { success };
    } catch (error) {
      console.error(`Error updating interest expense ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:delete', async (_, id: number) => {
    try {
      const success = interestRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting interest expense ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getByAccount', async (_, accountId: number) => {
    try {
      return interestRepository.getExpensesByAccount(accountId);
    } catch (error) {
      console.error(`Error getting interest expenses for account ${accountId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getByType', async (_, expenseType: InterestExpenseType) => {
    try {
      return interestRepository.getExpensesByType(expenseType);
    } catch (error) {
      console.error(`Error getting interest expenses of type ${expenseType}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getByDateRange', async (_, startDate: string, endDate: string) => {
    try {
      return interestRepository.getExpensesByDateRange(startDate, endDate);
    } catch (error) {
      console.error(`Error getting interest expenses for date range ${startDate} to ${endDate}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getWithSummary', async () => {
    try {
      return interestRepository.getExpensesWithSummary();
    } catch (error) {
      console.error('Error getting interest expenses with summary:', error);
      throw error;
    }
  });

  ipcMain.handle('interest:getTotalByAccount', async (_, accountId: number, year?: number) => {
    try {
      return interestRepository.getTotalInterestByAccount(accountId, year);
    } catch (error) {
      console.error(`Error getting total interest for account ${accountId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getTotalByType', async (_, expenseType: InterestExpenseType, year?: number) => {
    try {
      return interestRepository.getTotalInterestByType(expenseType, year);
    } catch (error) {
      console.error(`Error getting total interest for type ${expenseType}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getMonthlyTrend', async (_, accountId: number, months: number = 12) => {
    try {
      return interestRepository.getMonthlyInterestTrend(accountId, months);
    } catch (error) {
      console.error(`Error getting monthly interest trend for account ${accountId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:getCreditCardAnalysis', async (_, accountId: number) => {
    try {
      return interestRepository.calculateCreditCardInterestAnalysis(accountId);
    } catch (error) {
      console.error(`Error getting credit card analysis for account ${accountId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('interest:recordExpense', async (_, params: {
    accountId: number;
    expenseType: InterestExpenseType;
    periodStart: string;
    periodEnd: string;
    averageBalance: number;
    interestRate: number;
    interestAmount: number;
    transactionId?: number;
  }) => {
    try {
      const id = interestRepository.recordInterestExpense(
        params.accountId,
        params.expenseType,
        params.periodStart,
        params.periodEnd,
        params.averageBalance,
        params.interestRate,
        params.interestAmount,
        params.transactionId
      );
      return { id, success: true };
    } catch (error) {
      console.error('Error recording interest expense:', error);
      throw error;
    }
  });
}