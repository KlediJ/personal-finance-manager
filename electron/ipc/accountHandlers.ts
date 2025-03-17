import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Account } from '../../src/data-storage/models/Account';

export function setupAccountHandlers(): void {
  const accountRepository = DatabaseManager.getInstance().getAccountRepository();

  // Get all accounts
  ipcMain.handle('accounts:getAll', async () => {
    try {
      return accountRepository.getAll();
    } catch (error) {
      console.error('Error getting all accounts:', error);
      throw error;
    }
  });

  // Get active accounts
  ipcMain.handle('accounts:getActive', async () => {
    try {
      return accountRepository.getActiveAccounts();
    } catch (error) {
      console.error('Error getting active accounts:', error);
      throw error;
    }
  });

  // Get account by ID
  ipcMain.handle('accounts:getById', async (_, id: number) => {
    try {
      return accountRepository.getById(id);
    } catch (error) {
      console.error(`Error getting account ${id}:`, error);
      throw error;
    }
  });

  // Create account
  ipcMain.handle('accounts:create', async (_, account: Account) => {
    try {
      const id = accountRepository.create(account);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  });

  // Update account
  ipcMain.handle('accounts:update', async (_, id: number, account: Account) => {
    try {
      const success = accountRepository.update(id, account);
      return { success };
    } catch (error) {
      console.error(`Error updating account ${id}:`, error);
      throw error;
    }
  });

  // Delete account
  ipcMain.handle('accounts:delete', async (_, id: number) => {
    try {
      const success = accountRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting account ${id}:`, error);
      throw error;
    }
  });

  // Get total balance
  ipcMain.handle('accounts:getTotalBalance', async () => {
    try {
      return accountRepository.getTotalBalance();
    } catch (error) {
      console.error('Error getting total balance:', error);
      throw error;
    }
  });
}
