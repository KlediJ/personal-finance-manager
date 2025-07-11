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
            updated_at: row.updated_at
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
}
exports.AccountRepository = AccountRepository;
//# sourceMappingURL=AccountRepository.js.map