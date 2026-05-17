import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { DatabaseConnection } from '../../src/data-storage/database/DatabaseConnection';
import { Account } from '../../src/data-storage/models/Account';

export function setupAccountHandlers(): void {
  const accountRepository = DatabaseManager.getInstance().getAccountRepository();
  const isUserVisibleAccount = (account: Account) =>
    !account.is_virtual && !(account.account_code || '').startsWith('V-');

  // Get all accounts
  ipcMain.handle('accounts:getAll', async () => {
    try {
      return accountRepository.getAll().filter(isUserVisibleAccount);
    } catch (error) {
      console.error('Error getting all accounts:', error);
      throw error;
    }
  });

  // Get active accounts
  ipcMain.handle('accounts:getActive', async () => {
    try {
      return accountRepository.getActiveAccounts().filter(isUserVisibleAccount);
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
      const db = DatabaseConnection.getInstance();

      const transactionCountRow = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?')
        .get(id) as { count: number };
      const recurringBillCountRow = db
        .prepare('SELECT COUNT(*) as count FROM recurring_bills WHERE account_id = ?')
        .get(id) as { count: number };
      const interestCountRow = db
        .prepare('SELECT COUNT(*) as count FROM interest_expenses WHERE account_id = ?')
        .get(id) as { count: number };

      if ((error as Error).message.toLowerCase().includes('foreign key')) {
        if ((transactionCountRow?.count || 0) > 0) {
          return {
            success: false,
            error: 'This account still has transactions. Delete or move those transactions before deleting the account.'
          };
        }

        if ((recurringBillCountRow?.count || 0) > 0) {
          return {
            success: false,
            error: 'This account is still used by recurring bills. Remove those references before deleting the account.'
          };
        }

        if ((interestCountRow?.count || 0) > 0) {
          return {
            success: false,
            error: 'This account is still referenced by interest records and cannot be deleted yet.'
          };
        }

        return {
          success: false,
          error: 'This account is still referenced elsewhere and cannot be deleted yet.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get total balance
  ipcMain.handle('accounts:getTotalBalance', async () => {
    try {
      return accountRepository
        .getAll()
        .filter(isUserVisibleAccount)
        .reduce((sum, account) => sum + account.current_balance, 0);
    } catch (error) {
      console.error('Error getting total balance:', error);
      throw error;
    }
  });

  // Get extended account details (e.g., credit limit) from account_details
  ipcMain.handle('accounts:getDetails', async (_, accountId: number) => {
    try {
      const db = DatabaseConnection.getInstance();
      const stmt = db.prepare(
        'SELECT * FROM account_details WHERE account_id = ?'
      );
      const row = stmt.get(accountId);
      return row || null;
    } catch (error) {
      console.error(`Error getting account details for ${accountId}:`, error);
      throw error;
    }
  });

  // Upsert extended account details (currently focused on credit_limit)
  ipcMain.handle(
    'accounts:saveDetails',
    async (
      _,
      details: {
        account_id: number;
        credit_limit?: number | null;
        interest_rate?: number | null;
        statement_date?: number | null;
        due_date?: number | null;
        minimum_payment?: number | null;
      }
    ) => {
      try {
        const db = DatabaseConnection.getInstance();
        const stmt = db.prepare(`
          INSERT INTO account_details (
            account_id,
            credit_limit,
            interest_rate,
            statement_date,
            due_date,
            minimum_payment
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            credit_limit = COALESCE(excluded.credit_limit, account_details.credit_limit),
            interest_rate = COALESCE(excluded.interest_rate, account_details.interest_rate),
            statement_date = COALESCE(excluded.statement_date, account_details.statement_date),
            due_date = COALESCE(excluded.due_date, account_details.due_date),
            minimum_payment = COALESCE(excluded.minimum_payment, account_details.minimum_payment),
            updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(
          details.account_id,
          details.credit_limit ?? null,
          details.interest_rate ?? null,
          details.statement_date ?? null,
          details.due_date ?? null,
          details.minimum_payment ?? null
        );

        return { success: true };
      } catch (error) {
        console.error('Error saving account details:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );
}
