"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingService = void 0;
const DatabaseManager_1 = require("../database/DatabaseManager");
const DatabaseConnection_1 = require("../database/DatabaseConnection");
const Transaction_1 = require("../models/Transaction");
const JournalEntryRepository_1 = require("../repositories/JournalEntryRepository");
const VirtualAccountManager_1 = require("./VirtualAccountManager");
class AccountingService {
    constructor() {
        this.journalEntryRepository = new JournalEntryRepository_1.JournalEntryRepository();
        this.virtualAccountManager = new VirtualAccountManager_1.VirtualAccountManager();
    }
    /**
     * Create a transaction with proper double-entry accounting
     */
    createTransaction(transaction) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const transactionRepo = dbManager.getTransactionRepository();
        const accountRepo = dbManager.getAccountRepository();
        const payeeRepo = dbManager.getPayeeRepository();
        // Wrap all operations in a database transaction for atomicity
        return db.transaction(() => {
            // Handle payee creation/assignment if needed
            if (transaction.payee_name && !transaction.payee_id) {
                // Try to find existing payee by name
                const existingPayee = payeeRepo.findByName(transaction.payee_name);
                if (existingPayee) {
                    transaction.payee_id = existingPayee.payee_id;
                }
                else {
                    // Create new payee
                    const newPayeeId = payeeRepo.create({
                        name: transaction.payee_name,
                        default_category_id: transaction.category_id
                    });
                    transaction.payee_id = newPayeeId;
                    console.log(`Created new payee: ${transaction.payee_name} with ID: ${newPayeeId}`);
                }
            }
            // Start transaction
            const transactionId = transactionRepo.create(transaction);
            // Create journal entries based on transaction type
            this.createJournalEntries(transactionId, transaction);
            // Update account balances
            this.updateAccountBalances(transaction);
            return { transactionId, success: true };
        })();
    }
    /**
     * Update a transaction and its journal entries
     */
    updateTransaction(transactionId, transaction) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const transactionRepo = dbManager.getTransactionRepository();
        const payeeRepo = dbManager.getPayeeRepository();
        // Wrap all operations in a database transaction for atomicity
        return db.transaction(() => {
            // Get the original transaction to reverse its effects
            const originalTransaction = transactionRepo.getById(transactionId);
            if (!originalTransaction) {
                throw new Error('Transaction not found');
            }
            // Handle payee creation/assignment if needed
            if (transaction.payee_name && !transaction.payee_id) {
                // Try to find existing payee by name
                const existingPayee = payeeRepo.findByName(transaction.payee_name);
                if (existingPayee) {
                    transaction.payee_id = existingPayee.payee_id;
                }
                else {
                    // Create new payee
                    const newPayeeId = payeeRepo.create({
                        name: transaction.payee_name,
                        default_category_id: transaction.category_id
                    });
                    transaction.payee_id = newPayeeId;
                    console.log(`Created new payee during update: ${transaction.payee_name} with ID: ${newPayeeId}`);
                }
            }
            // Reverse the original transaction's effects
            this.reverseTransaction(originalTransaction);
            // Delete existing journal entries
            this.journalEntryRepository.deleteByTransactionId(transactionId);
            // Update the transaction
            const success = transactionRepo.update(transactionId, transaction);
            if (success) {
                // Create new journal entries
                this.createJournalEntries(transactionId, transaction);
                // Update account balances
                this.updateAccountBalances(transaction);
            }
            return success;
        })();
    }
    /**
     * Delete a transaction and reverse its accounting effects
     */
    deleteTransaction(transactionId) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const transactionRepo = dbManager.getTransactionRepository();
        // Wrap all operations in a database transaction for atomicity
        return db.transaction(() => {
            // Get the transaction to reverse its effects
            const transaction = transactionRepo.getById(transactionId);
            if (!transaction) {
                return false;
            }
            // Reverse the transaction's effects
            this.reverseTransaction(transaction);
            // Delete journal entries
            this.journalEntryRepository.deleteByTransactionId(transactionId);
            // Delete the transaction
            return transactionRepo.delete(transactionId);
        })();
    }
    /**
     * Create journal entries based on transaction type
     */
    createJournalEntries(transactionId, transaction) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const accountRepo = dbManager.getAccountRepository();
        const account = accountRepo.getById(transaction.account_id);
        if (!account) {
            throw new Error('Account not found');
        }
        const amount = Math.abs(transaction.amount);
        switch (transaction.transaction_type) {
            case Transaction_1.TransactionType.INCOME:
                this.createIncomeJournalEntries(transactionId, account, amount, transaction.description, transaction.category_id || undefined);
                break;
            case Transaction_1.TransactionType.EXPENSE:
                this.createExpenseJournalEntries(transactionId, account, amount, transaction.description, transaction.category_id || undefined);
                break;
            case Transaction_1.TransactionType.TRANSFER:
                // Transfer logic will be handled separately
                break;
        }
    }
    /**
     * Create journal entries for income transactions
     */
    createIncomeJournalEntries(transactionId, account, amount, description, categoryId) {
        // For cash basis accounting:
        // Debit: Asset account (increase cash/bank balance)
        // Credit: Income account (virtual income category account)
        const incomeAccountId = this.virtualAccountManager.getOrCreateVirtualIncomeAccount(categoryId);
        this.journalEntryRepository.createDoubleEntry(transactionId, account.account_id, // Debit the asset account
        incomeAccountId, // Credit the income account
        amount, description);
    }
    /**
     * Create journal entries for expense transactions
     */
    createExpenseJournalEntries(transactionId, account, amount, description, categoryId) {
        // For cash basis accounting:
        // Debit: Expense account (virtual expense category account)
        // Credit: Asset account (decrease cash/bank balance)
        const expenseAccountId = this.virtualAccountManager.getOrCreateVirtualExpenseAccount(categoryId);
        this.journalEntryRepository.createDoubleEntry(transactionId, expenseAccountId, // Debit the expense account
        account.account_id, // Credit the asset account
        amount, description);
    }
    /**
     * Create transfer between two accounts
     */
    createTransfer(fromAccountId, toAccountId, amount, description, date) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
        const transactionRepo = dbManager.getTransactionRepository();
        const accountRepo = dbManager.getAccountRepository();
        // Wrap all operations in a database transaction for atomicity
        return db.transaction(() => {
            const fromAccount = accountRepo.getById(fromAccountId);
            const toAccount = accountRepo.getById(toAccountId);
            if (!fromAccount || !toAccount) {
                throw new Error('One or both accounts not found');
            }
            const transferDate = date || new Date().toISOString().split('T')[0];
            const transferAmount = Math.abs(amount);
            // Create "from" transaction (outgoing transfer)
            const fromTransaction = {
                account_id: fromAccountId,
                date: transferDate,
                amount: -transferAmount,
                description: description || `Transfer to ${toAccount.name}`,
                transaction_type: Transaction_1.TransactionType.TRANSFER,
                status: 'cleared'
            };
            // Create "to" transaction (incoming transfer)
            const toTransaction = {
                account_id: toAccountId,
                date: transferDate,
                amount: transferAmount,
                description: description || `Transfer from ${fromAccount.name}`,
                transaction_type: Transaction_1.TransactionType.TRANSFER,
                status: 'cleared'
            };
            const fromTransactionId = transactionRepo.create(fromTransaction);
            const toTransactionId = transactionRepo.create(toTransaction);
            // Create journal entries for the transfer
            this.journalEntryRepository.createDoubleEntry(fromTransactionId, toAccountId, // Debit destination account
            fromAccountId, // Credit source account
            transferAmount, description || 'Account transfer');
            // Update account balances
            this.updateAccountBalance(fromAccountId);
            this.updateAccountBalance(toAccountId);
            return { fromTransactionId, toTransactionId, success: true };
        })();
    }
    /**
     * Update account balances based on journal entries
     */
    updateAccountBalances(transaction) {
        this.updateAccountBalance(transaction.account_id);
    }
    /**
     * Update a single account's balance from journal entries
     */
    updateAccountBalance(accountId) {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const accountRepo = dbManager.getAccountRepository();
        const account = accountRepo.getById(accountId);
        if (!account) {
            throw new Error('Account not found');
        }
        // Calculate balance from journal entries
        const calculatedBalance = this.journalEntryRepository.calculateAccountBalance(accountId);
        // Add opening balance to the calculated balance
        const newBalance = account.opening_balance + calculatedBalance;
        // Update the account balance
        accountRepo.updateBalance(accountId, newBalance);
    }
    /**
     * Reverse the effects of a transaction
     */
    reverseTransaction(transaction) {
        // Create a reverse transaction to undo the effects
        const reverseTransaction = {
            ...transaction,
            amount: -transaction.amount
        };
        // Update account balance
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const accountRepo = dbManager.getAccountRepository();
        const account = accountRepo.getById(transaction.account_id);
        if (account) {
            const newBalance = account.current_balance - transaction.amount;
            accountRepo.updateBalance(transaction.account_id, newBalance);
        }
    }
    /**
     * Initialize accounting system and migrate any existing placeholder accounts
     * This should be called once during application startup
     */
    initializeAccounting() {
        try {
            // Run the migration to convert any existing placeholder accounts
            const migrationResults = this.virtualAccountManager.migratePlaceholderAccounts();
            console.log('Accounting system initialized successfully', migrationResults);
            return { success: true, migrationResults };
        }
        catch (error) {
            console.error('Error initializing accounting system:', error);
            return { success: false };
        }
    }
    /**
     * Recalculate all account balances from journal entries
     */
    recalculateAllBalances() {
        const dbManager = DatabaseManager_1.DatabaseManager.getInstance();
        const accountRepo = dbManager.getAccountRepository();
        const accounts = accountRepo.getAll();
        accounts.forEach(account => {
            this.updateAccountBalance(account.account_id);
        });
    }
}
exports.AccountingService = AccountingService;
//# sourceMappingURL=AccountingService.js.map