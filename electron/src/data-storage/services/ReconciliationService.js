"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const DatabaseManager_1 = require("../database/DatabaseManager");
const Transaction_1 = require("../models/Transaction");
const Money_1 = require("../../utils/Money");
/**
 * ReconciliationService handles the reconciliation process for maintaining
 * accounting integrity by locking reconciled transactions and managing
 * account balance verification.
 */
class ReconciliationService {
    constructor() {
        this.databaseManager = DatabaseManager_1.DatabaseManager.getInstance();
        this.transactionRepository = this.databaseManager.getTransactionRepository();
        this.accountRepository = this.databaseManager.getAccountRepository();
    }
    /**
     * Get reconciliation summary for an account
     * @param accountId Account ID to get reconciliation summary for
     * @returns Detailed reconciliation summary
     */
    getReconciliationSummary(accountId) {
        const account = this.accountRepository.getById(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }
        // Get transactions ready for reconciliation (cleared but not locked)
        const clearedTransactions = this.transactionRepository.getTransactionsReadyForReconciliation(accountId);
        // Get already reconciled transactions
        const reconciledTransactions = this.transactionRepository.getReconciledTransactions()
            .filter((t) => t.account_id === accountId);
        // Calculate balances
        const clearedBalance = this.calculateTransactionBalance(clearedTransactions);
        const reconciledBalance = this.calculateTransactionBalance(reconciledTransactions);
        return {
            accountId,
            accountName: account.name,
            startingBalance: account.opening_balance,
            clearedTransactions,
            reconciledTransactions,
            clearedBalance,
            reconciledBalance,
            unreconciledCount: clearedTransactions.length,
            totalTransactions: clearedTransactions.length + reconciledTransactions.length
        };
    }
    /**
     * Calculate total balance for a list of transactions
     * @param transactions List of transactions
     * @returns Total balance in cents
     */
    calculateTransactionBalance(transactions) {
        return transactions.reduce((total, transaction) => {
            return total + transaction.amount;
        }, 0);
    }
    /**
     * Reconcile a single transaction
     * @param transactionId Transaction ID to reconcile
     * @returns Success status
     */
    reconcileTransaction(transactionId) {
        try {
            // Validate transaction exists and can be reconciled
            const transaction = this.transactionRepository.getById(transactionId);
            if (!transaction) {
                throw new Error(`Transaction ${transactionId} not found`);
            }
            if (transaction.status !== Transaction_1.TransactionStatus.CLEARED) {
                throw new Error(`Transaction ${transactionId} must be in 'cleared' status to be reconciled. Current status: ${transaction.status}`);
            }
            if (transaction.is_locked) {
                throw new Error(`Transaction ${transactionId} is already locked/reconciled`);
            }
            // Mark as reconciled (this automatically sets reconciled_at and is_locked)
            this.transactionRepository.update(transactionId, {
                status: Transaction_1.TransactionStatus.RECONCILED
            });
            console.log(`✅ Transaction ${transactionId} successfully reconciled and locked`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to reconcile transaction ${transactionId}:`, error);
            throw error;
        }
    }
    /**
     * Bulk reconcile multiple transactions for an account
     * @param accountId Account ID
     * @param transactionIds Array of transaction IDs to reconcile
     * @param expectedBalance Expected final balance in cents (for verification)
     * @returns Bulk reconciliation result
     */
    bulkReconcileTransactions(accountId, transactionIds, expectedBalance) {
        let reconciledCount = 0;
        let failedCount = 0;
        const errors = [];
        console.log(`🔄 Starting bulk reconciliation of ${transactionIds.length} transactions for account ${accountId}`);
        // Reconcile each transaction
        for (const transactionId of transactionIds) {
            try {
                this.reconcileTransaction(transactionId);
                reconciledCount++;
            }
            catch (error) {
                failedCount++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push({ transactionId, error: errorMessage });
                console.error(`Failed to reconcile transaction ${transactionId}:`, errorMessage);
            }
        }
        // Calculate final balance if expected balance was provided
        let balanceVerified = false;
        let finalBalance = 0;
        if (expectedBalance !== undefined) {
            const summary = this.getReconciliationSummary(accountId);
            finalBalance = summary.startingBalance + summary.clearedBalance + summary.reconciledBalance;
            balanceVerified = finalBalance === expectedBalance;
            if (!balanceVerified) {
                console.warn(`⚠️  Balance verification failed for account ${accountId}`);
                console.warn(`Expected: ${Money_1.Money.formatCents(expectedBalance)}, Actual: ${Money_1.Money.formatCents(finalBalance)}`);
                console.warn(`Difference: ${Money_1.Money.formatCents(Math.abs(finalBalance - expectedBalance))}`);
            }
            else {
                console.log(`✅ Balance verification passed for account ${accountId}: ${Money_1.Money.formatCents(finalBalance)}`);
            }
        }
        const result = {
            success: failedCount === 0,
            reconciledCount,
            failedCount,
            errors,
            finalBalance,
            balanceVerified
        };
        console.log(`📊 Bulk reconciliation completed: ${reconciledCount} successful, ${failedCount} failed`);
        return result;
    }
    /**
     * Get all transactions that can be reconciled for an account
     * @param accountId Account ID
     * @returns Transactions ready for reconciliation
     */
    getReconcilableTransactions(accountId) {
        return this.transactionRepository.getTransactionsReadyForReconciliation(accountId);
    }
    /**
     * Verify account balance matches expected value
     * @param accountId Account ID
     * @param expectedBalance Expected balance in cents
     * @returns Balance verification result
     */
    verifyAccountBalance(accountId, expectedBalance) {
        const summary = this.getReconciliationSummary(accountId);
        const actualBalance = summary.startingBalance + summary.clearedBalance + summary.reconciledBalance;
        const difference = actualBalance - expectedBalance;
        return {
            matches: difference === 0,
            expectedBalance,
            actualBalance,
            difference,
            summary
        };
    }
    /**
     * Get reconciliation statistics for all accounts
     * @returns Overall reconciliation statistics
     */
    getReconciliationStatistics() {
        const allAccounts = this.accountRepository.getAll();
        const accountSummaries = [];
        let totalUnreconciledTransactions = 0;
        let totalReconciledTransactions = 0;
        let accountsWithUnreconciledTransactions = 0;
        for (const account of allAccounts) {
            try {
                const summary = this.getReconciliationSummary(account.account_id);
                accountSummaries.push(summary);
                totalUnreconciledTransactions += summary.unreconciledCount;
                totalReconciledTransactions += summary.reconciledTransactions.length;
                if (summary.unreconciledCount > 0) {
                    accountsWithUnreconciledTransactions++;
                }
            }
            catch (error) {
                console.error(`Error getting reconciliation summary for account ${account.account_id}:`, error);
            }
        }
        return {
            totalAccounts: allAccounts.length,
            accountsWithUnreconciledTransactions,
            totalUnreconciledTransactions,
            totalReconciledTransactions,
            accountSummaries
        };
    }
    /**
     * Administrative function to unlock a reconciled transaction
     * WARNING: This should only be used in exceptional circumstances
     * @param transactionId Transaction ID to unlock
     * @param reason Administrative reason for unlocking
     */
    adminUnlockTransaction(transactionId, reason) {
        if (!reason || reason.trim().length === 0) {
            throw new Error('Administrative reason is required for unlocking reconciled transactions');
        }
        console.warn(`🚨 ADMIN OVERRIDE: Unlocking reconciled transaction ${transactionId}`);
        console.warn(`Reason: ${reason}`);
        console.warn('This action compromises accounting integrity and should be audited');
        this.transactionRepository.adminUnlockTransaction(transactionId, reason);
    }
    /**
     * Validate that all reconciled transactions are properly locked
     * @returns Validation results
     */
    validateReconciliationIntegrity() {
        const reconciledTransactions = this.transactionRepository.getReconciledTransactions();
        const issues = [];
        let lockedCount = 0;
        for (const transaction of reconciledTransactions) {
            if (!transaction.is_locked) {
                issues.push({
                    transactionId: transaction.transaction_id,
                    issue: 'Transaction is marked as reconciled but not locked'
                });
            }
            else {
                lockedCount++;
            }
            if (!transaction.reconciled_at) {
                issues.push({
                    transactionId: transaction.transaction_id,
                    issue: 'Transaction is reconciled but missing reconciled_at timestamp'
                });
            }
        }
        return {
            valid: issues.length === 0,
            issues,
            reconciledCount: reconciledTransactions.length,
            lockedCount
        };
    }
}
exports.ReconciliationService = ReconciliationService;
//# sourceMappingURL=ReconciliationService.js.map