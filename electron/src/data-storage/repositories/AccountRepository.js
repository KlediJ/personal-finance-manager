"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class AccountRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('accounts');
    }
    mapToEntity(row) {
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
            // Chart of Accounts enhancements - Phase 1
            account_class: row.account_class,
            account_code: row.account_code,
            is_liability: Boolean(row.is_liability),
            // Phase 3 - Accounting Service Enhancement
            is_virtual: Boolean(row.is_virtual)
        };
    }
    // Custom methods specific to accounts
    /**
     * Get all active accounts
     */
    getActiveAccounts() {
        return this.findBy('active', 1);
    }
    /**
     * Update account balance
     */
    updateBalance(accountId, newBalance) {
        const account = this.getById(accountId);
        if (!account)
            return false;
        return this.update(accountId, {
            ...account,
            current_balance: newBalance
        });
    }
    /**
     * Get total balance across all accounts
     */
    getTotalBalance() {
        const query = `
      SELECT SUM(current_balance) as total 
      FROM accounts 
      WHERE active = 1
    `;
        const result = this.db.prepare(query).get();
        return result?.total || 0;
    }
    /**
     * Get accounts by type
     */
    getAccountsByType(type) {
        return this.findBy('type', type);
    }
    // Chart of Accounts enhancements - Phase 1
    /**
     * Get accounts by account class (Asset, Liability, Equity, etc.)
     */
    getAccountsByClass(accountClass) {
        return this.findBy('account_class', accountClass);
    }
    /**
     * Get asset accounts (checking, savings, etc.)
     */
    getAssetAccounts() {
        return this.getAccountsByClass('Asset');
    }
    /**
     * Get liability accounts (credit cards, loans, etc.)
     */
    getLiabilityAccounts() {
        return this.getAccountsByClass('Liability');
    }
    /**
     * Get net worth calculation (Assets - Liabilities)
     */
    getNetWorth() {
        const query = `
      SELECT 
        SUM(CASE WHEN account_class = 'Asset' THEN current_balance ELSE 0 END) as assets,
        SUM(CASE WHEN account_class = 'Liability' THEN current_balance ELSE 0 END) as liabilities
      FROM accounts 
      WHERE active = 1
    `;
        const result = this.db.prepare(query).get();
        const assets = result?.assets || 0;
        const liabilities = result?.liabilities || 0;
        return assets - liabilities;
    }
    /**
     * Get Chart of Accounts summary
     */
    getChartOfAccountsSummary() {
        const query = `
      SELECT 
        account_class,
        account_code,
        COUNT(*) as account_count,
        SUM(current_balance) as total_balance
      FROM accounts 
      WHERE active = 1
      GROUP BY account_class, account_code
      ORDER BY account_code
    `;
        return this.db.prepare(query).all();
    }
}
exports.AccountRepository = AccountRepository;
//# sourceMappingURL=AccountRepository.js.map