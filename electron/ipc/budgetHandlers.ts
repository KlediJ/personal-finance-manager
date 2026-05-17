import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Budget } from '../../src/data-storage/models/Budget';

export function setupBudgetHandlers(): void {
  // Get database manager instance
  const dbManager = DatabaseManager.getInstance();
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
  ipcMain.handle('budgets:getAll', async () => {
    try {
      return budgetRepository.getAll();
    } catch (error) {
      console.error('Error getting all budgets:', error);
      throw error;
    }
  });

  // Get all budgets with category information
  ipcMain.handle('budgets:getAllWithCategories', async () => {
    try {
      return budgetRepository.getAllWithCategories();
    } catch (error) {
      console.error('Error getting all budgets with categories:', error);
      throw error;
    }
  });

  // Get budget by ID
  ipcMain.handle('budgets:getById', async (_, id: number) => {
    try {
      return budgetRepository.getById(id);
    } catch (error) {
      console.error(`Error getting budget ${id}:`, error);
      throw error;
    }
  });

  // Get budgets by period
  ipcMain.handle('budgets:getByPeriod', async (_, period: string) => {
    try {
      return budgetRepository.getByPeriod(period as any);
    } catch (error) {
      console.error(`Error getting budgets for period ${period}:`, error);
      throw error;
    }
  });

  // Get budgets by date range
  ipcMain.handle('budgets:getByDateRange', async (_, startDate: string, endDate: string) => {
    try {
      return budgetRepository.getByDateRange(startDate, endDate);
    } catch (error) {
      console.error(`Error getting budgets between ${startDate} and ${endDate}:`, error);
      throw error;
    }
  });

  // Get budgets by category
  ipcMain.handle('budgets:getByCategory', async (_, categoryId: number) => {
    try {
      return budgetRepository.getByCategory(categoryId);
    } catch (error) {
      console.error(`Error getting budgets for category ${categoryId}:`, error);
      throw error;
    }
  });

  // Get current active budgets
  ipcMain.handle('budgets:getCurrentBudgets', async () => {
    try {
      return budgetRepository.getCurrentBudgets();
    } catch (error) {
      console.error('Error getting current budgets:', error);
      throw error;
    }
  });

  // Get current active budgets with category information
  ipcMain.handle('budgets:getCurrentBudgetsWithCategories', async () => {
    try {
      return budgetRepository.getCurrentBudgetsWithCategories();
    } catch (error) {
      console.error('Error getting current budgets with categories:', error);
      throw error;
    }
  });

  // Get budget progress
  ipcMain.handle('budgets:getBudgetProgress', async (_, date?: string) => {
    try {
      return budgetRepository.getBudgetProgress(date);
    } catch (error) {
      console.error('Error getting budget progress:', error);
      throw error;
    }
  });

  // Create budget
  ipcMain.handle('budgets:create', async (_, budget: Budget) => {
    try {
      const id = budgetRepository.create(budget);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  });

  // Update budget
  ipcMain.handle('budgets:update', async (_, id: number, budget: Budget) => {
    try {
      const success = budgetRepository.update(id, budget);
      return { success };
    } catch (error) {
      console.error(`Error updating budget ${id}:`, error);
      throw error;
    }
  });

  // Delete budget
  ipcMain.handle('budgets:delete', async (_, id: number) => {
    try {
      const success = budgetRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting budget ${id}:`, error);
      throw error;
    }
  });
}
