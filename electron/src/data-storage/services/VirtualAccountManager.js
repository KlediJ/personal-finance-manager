"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualAccountManager = void 0;
const DatabaseConnection_1 = require("../database/DatabaseConnection");
const Account_1 = require("../models/Account");
const Category_1 = require("../models/Category");
const AccountRepository_1 = require("../repositories/AccountRepository");
const CategoryRepository_1 = require("../repositories/CategoryRepository");
/**
 * VirtualAccountManager handles the creation and management of virtual accounts
 * for proper double-entry bookkeeping. Instead of using hardcoded placeholder IDs,
 * this class dynamically creates virtual accounts for each category.
 */
class VirtualAccountManager {
    constructor() {
        this.accountRepository = new AccountRepository_1.AccountRepository();
        this.categoryRepository = new CategoryRepository_1.CategoryRepository();
    }
    /**
     * Get or create a virtual income account for a specific category
     * @param categoryId The category ID to create/get virtual account for
     * @returns The virtual income account ID
     */
    getOrCreateVirtualIncomeAccount(categoryId) {
        if (!categoryId) {
            // Use a general income account if no category is specified
            return this.getOrCreateGeneralVirtualAccount('INCOME');
        }
        const category = this.categoryRepository.getById(categoryId);
        if (!category) {
            throw new Error(`Category with ID ${categoryId} not found`);
        }
        if (category.type !== Category_1.CategoryType.INCOME) {
            throw new Error(`Category ${category.name} is not an income category`);
        }
        const virtualAccountCode = `V-INCOME-${categoryId}`;
        const existingAccount = this.findVirtualAccountByCode(virtualAccountCode);
        if (existingAccount) {
            return existingAccount.account_id;
        }
        // Create new virtual income account
        const virtualAccount = {
            name: `Virtual Income: ${category.name}`,
            type: Account_1.AccountType.CASH, // Use CASH as the base type for virtual accounts
            account_class: Account_1.AccountClass.INCOME,
            account_code: virtualAccountCode,
            opening_balance: 0,
            current_balance: 0,
            currency: 'USD',
            active: true,
            // Mark as virtual account when we add the column
        };
        const accountId = this.accountRepository.create(virtualAccount);
        // Mark as virtual account (will be added to schema)
        this.markAccountAsVirtual(accountId);
        return accountId;
    }
    /**
     * Get or create a virtual expense account for a specific category
     * @param categoryId The category ID to create/get virtual account for
     * @returns The virtual expense account ID
     */
    getOrCreateVirtualExpenseAccount(categoryId) {
        if (!categoryId) {
            // Use a general expense account if no category is specified
            return this.getOrCreateGeneralVirtualAccount('EXPENSE');
        }
        const category = this.categoryRepository.getById(categoryId);
        if (!category) {
            throw new Error(`Category with ID ${categoryId} not found`);
        }
        if (category.type !== Category_1.CategoryType.EXPENSE) {
            throw new Error(`Category ${category.name} is not an expense category`);
        }
        const virtualAccountCode = `V-EXPENSE-${categoryId}`;
        const existingAccount = this.findVirtualAccountByCode(virtualAccountCode);
        if (existingAccount) {
            return existingAccount.account_id;
        }
        // Create new virtual expense account
        const virtualAccount = {
            name: `Virtual Expense: ${category.name}`,
            type: Account_1.AccountType.CASH, // Use CASH as the base type for virtual accounts
            account_class: Account_1.AccountClass.EXPENSE,
            account_code: virtualAccountCode,
            opening_balance: 0,
            current_balance: 0,
            currency: 'USD',
            active: true,
        };
        const accountId = this.accountRepository.create(virtualAccount);
        // Mark as virtual account (will be added to schema)
        this.markAccountAsVirtual(accountId);
        return accountId;
    }
    /**
     * Get or create general virtual accounts for income/expense without specific categories
     */
    getOrCreateGeneralVirtualAccount(accountClass) {
        const virtualAccountCode = `V-GENERAL-${accountClass}`;
        const existingAccount = this.findVirtualAccountByCode(virtualAccountCode);
        if (existingAccount) {
            return existingAccount.account_id;
        }
        const virtualAccount = {
            name: `Virtual ${accountClass.charAt(0) + accountClass.slice(1).toLowerCase()}: General`,
            type: Account_1.AccountType.CASH,
            account_class: accountClass === 'INCOME' ? Account_1.AccountClass.INCOME : Account_1.AccountClass.EXPENSE,
            account_code: virtualAccountCode,
            opening_balance: 0,
            current_balance: 0,
            currency: 'USD',
            active: true,
        };
        const accountId = this.accountRepository.create(virtualAccount);
        this.markAccountAsVirtual(accountId);
        return accountId;
    }
    /**
     * Find a virtual account by its account code
     */
    findVirtualAccountByCode(accountCode) {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const query = `
      SELECT * FROM accounts 
      WHERE account_code = ? 
      AND active = 1
    `;
        try {
            const row = db.prepare(query).get(accountCode);
            if (!row)
                return null;
            // Map the row to Account entity manually since mapToEntity is protected
            const account = {
                account_id: row.account_id,
                name: row.name,
                type: row.type,
                opening_balance: row.opening_balance,
                current_balance: row.current_balance,
                currency: row.currency,
                active: Boolean(row.active),
                created_at: row.created_at,
                updated_at: row.updated_at,
                account_class: row.account_class,
                account_code: row.account_code,
                is_liability: Boolean(row.is_liability),
                is_virtual: Boolean(row.is_virtual)
            };
            return account;
        }
        catch (error) {
            console.error(`Error finding virtual account by code ${accountCode}:`, error);
            return null;
        }
    }
    /**
     * Mark an account as virtual (temporary method until schema is updated)
     */
    markAccountAsVirtual(accountId) {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        // Try to update is_virtual column if it exists
        try {
            const updateQuery = `UPDATE accounts SET is_virtual = 1 WHERE account_id = ?`;
            db.prepare(updateQuery).run(accountId);
        }
        catch (error) {
            // Column doesn't exist yet - this is expected before schema update
            console.log(`is_virtual column not yet added to accounts table (account_id: ${accountId})`);
        }
    }
    /**
     * Get all virtual accounts
     */
    getAllVirtualAccounts() {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const mapRowToAccount = (row) => {
            return {
                account_id: row.account_id,
                name: row.name,
                type: row.type,
                opening_balance: row.opening_balance,
                current_balance: row.current_balance,
                currency: row.currency,
                active: Boolean(row.active),
                created_at: row.created_at,
                updated_at: row.updated_at,
                account_class: row.account_class,
                account_code: row.account_code,
                is_liability: Boolean(row.is_liability),
                is_virtual: Boolean(row.is_virtual)
            };
        };
        try {
            // Try to use is_virtual column if it exists
            const queryWithColumn = `
        SELECT * FROM accounts 
        WHERE is_virtual = 1 
        AND active = 1
        ORDER BY account_code
      `;
            const rows = db.prepare(queryWithColumn).all();
            return rows.map(mapRowToAccount);
        }
        catch (error) {
            // Fall back to using account_code pattern
            const fallbackQuery = `
        SELECT * FROM accounts 
        WHERE account_code LIKE 'V-%' 
        AND active = 1
        ORDER BY account_code
      `;
            const rows = db.prepare(fallbackQuery).all();
            return rows.map(mapRowToAccount);
        }
    }
    /**
     * Clean up unused virtual accounts
     * This method can be called periodically to remove virtual accounts
     * that are no longer referenced by any transactions
     */
    cleanupUnusedVirtualAccounts() {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const cleanupQuery = `
      DELETE FROM accounts 
      WHERE account_code LIKE 'V-%'
      AND account_id NOT IN (
        SELECT DISTINCT account_id 
        FROM journal_entries 
        WHERE account_id IS NOT NULL
      )
      AND account_id NOT IN (
        SELECT DISTINCT account_id 
        FROM transactions 
        WHERE account_id IS NOT NULL
      )
    `;
        try {
            const result = db.prepare(cleanupQuery).run();
            console.log(`Cleaned up ${result.changes} unused virtual accounts`);
            return result.changes;
        }
        catch (error) {
            console.error('Error cleaning up virtual accounts:', error);
            return 0;
        }
    }
    /**
     * Check if account ID represents a virtual account
     */
    isVirtualAccount(accountId) {
        const account = this.accountRepository.getById(accountId);
        if (!account)
            return false;
        // Check if it has virtual account code pattern
        return account.account_code?.startsWith('V-') || false;
    }
    /**
     * Migrate existing transactions that use placeholder IDs (999998/999999)
     * This is a one-time migration method to fix existing data
     */
    migratePlaceholderAccounts() {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        return db.transaction(() => {
            let migratedJournalEntries = 0;
            let migratedTransactions = 0;
            // Get general virtual accounts
            const generalIncomeAccountId = this.getOrCreateGeneralVirtualAccount('INCOME');
            const generalExpenseAccountId = this.getOrCreateGeneralVirtualAccount('EXPENSE');
            try {
                // Update journal entries that use placeholder accounts
                const updateJournalEntriesQuery = `
          UPDATE journal_entries 
          SET account_id = CASE 
            WHEN account_id = 999999 THEN ?
            WHEN account_id = 999998 THEN ?
            ELSE account_id
          END
          WHERE account_id IN (999998, 999999)
        `;
                const journalResult = db.prepare(updateJournalEntriesQuery).run(generalIncomeAccountId, generalExpenseAccountId);
                migratedJournalEntries = journalResult.changes;
                // Update transactions table if it somehow contains these placeholder IDs
                const updateTransactionsQuery = `
          UPDATE transactions 
          SET account_id = CASE 
            WHEN account_id = 999999 THEN ?
            WHEN account_id = 999998 THEN ?
            ELSE account_id
          END
          WHERE account_id IN (999998, 999999)
        `;
                const transactionResult = db.prepare(updateTransactionsQuery).run(generalIncomeAccountId, generalExpenseAccountId);
                migratedTransactions = transactionResult.changes;
                console.log(`Migration completed: ${migratedJournalEntries} journal entries, ${migratedTransactions} transactions updated`);
            }
            catch (error) {
                console.error('Error during placeholder account migration:', error);
                throw error;
            }
            return { migratedJournalEntries, migratedTransactions };
        })();
    }
}
exports.VirtualAccountManager = VirtualAccountManager;
//# sourceMappingURL=VirtualAccountManager.js.map