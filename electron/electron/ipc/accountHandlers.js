"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAccountHandlers = setupAccountHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
const DatabaseConnection_1 = require("../../src/data-storage/database/DatabaseConnection");
function setupAccountHandlers() {
    const accountRepository = DatabaseManager_1.DatabaseManager.getInstance().getAccountRepository();
    // Get all accounts
    electron_1.ipcMain.handle('accounts:getAll', async () => {
        try {
            return accountRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all accounts:', error);
            throw error;
        }
    });
    // Get active accounts
    electron_1.ipcMain.handle('accounts:getActive', async () => {
        try {
            return accountRepository.getActiveAccounts();
        }
        catch (error) {
            console.error('Error getting active accounts:', error);
            throw error;
        }
    });
    // Get account by ID
    electron_1.ipcMain.handle('accounts:getById', async (_, id) => {
        try {
            return accountRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting account ${id}:`, error);
            throw error;
        }
    });
    // Create account
    electron_1.ipcMain.handle('accounts:create', async (_, account) => {
        try {
            const id = accountRepository.create(account);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating account:', error);
            throw error;
        }
    });
    // Update account
    electron_1.ipcMain.handle('accounts:update', async (_, id, account) => {
        try {
            const success = accountRepository.update(id, account);
            return { success };
        }
        catch (error) {
            console.error(`Error updating account ${id}:`, error);
            throw error;
        }
    });
    // Delete account
    electron_1.ipcMain.handle('accounts:delete', async (_, id) => {
        try {
            const success = accountRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting account ${id}:`, error);
            throw error;
        }
    });
    // Get total balance
    electron_1.ipcMain.handle('accounts:getTotalBalance', async () => {
        try {
            return accountRepository.getTotalBalance();
        }
        catch (error) {
            console.error('Error getting total balance:', error);
            throw error;
        }
    });
    // Get extended account details (e.g., credit limit) from account_details
    electron_1.ipcMain.handle('accounts:getDetails', async (_, accountId) => {
        try {
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
            const stmt = db.prepare('SELECT * FROM account_details WHERE account_id = ?');
            const row = stmt.get(accountId);
            return row || null;
        }
        catch (error) {
            console.error(`Error getting account details for ${accountId}:`, error);
            throw error;
        }
    });
    // Upsert extended account details (currently focused on credit_limit)
    electron_1.ipcMain.handle('accounts:saveDetails', async (_, details) => {
        try {
            const db = DatabaseConnection_1.DatabaseConnection.getInstance();
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
            stmt.run(details.account_id, details.credit_limit ?? null, details.interest_rate ?? null, details.statement_date ?? null, details.due_date ?? null, details.minimum_payment ?? null);
            return { success: true };
        }
        catch (error) {
            console.error('Error saving account details:', error);
            return { success: false, error: error.message };
        }
    });
}
//# sourceMappingURL=accountHandlers.js.map