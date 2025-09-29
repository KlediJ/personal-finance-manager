"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntryRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const JournalEntry_1 = require("../models/JournalEntry");
class JournalEntryRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('journal_entries');
    }
    mapToEntity(row) {
        return {
            journal_entry_id: row.journal_entry_id,
            transaction_id: row.transaction_id,
            account_id: row.account_id,
            entry_type: row.entry_type,
            amount: row.amount,
            description: row.description,
            reference_number: row.reference_number,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
    /**
     * Get all journal entries for a specific transaction
     */
    getByTransactionId(transactionId) {
        const query = `
      SELECT * FROM ${this.tableName}
      WHERE transaction_id = ?
      ORDER BY entry_type DESC
    `;
        return this.runQuery(query, [transactionId]);
    }
    /**
     * Get all journal entries for a specific account
     */
    getByAccountId(accountId) {
        const query = `
      SELECT * FROM ${this.tableName}
      WHERE account_id = ?
      ORDER BY created_at DESC
    `;
        return this.runQuery(query, [accountId]);
    }
    /**
     * Calculate account balance from journal entries
     */
    calculateAccountBalance(accountId) {
        const query = `
      SELECT 
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits
      FROM ${this.tableName}
      WHERE account_id = ?
    `;
        const result = this.db.prepare(query).get(accountId);
        const debits = result?.total_debits || 0;
        const credits = result?.total_credits || 0;
        return debits - credits;
    }
    /**
     * Create paired journal entries for double-entry bookkeeping
     */
    createDoubleEntry(transactionId, debitAccountId, creditAccountId, amount, description) {
        const debitEntry = {
            transaction_id: transactionId,
            account_id: debitAccountId,
            entry_type: JournalEntry_1.JournalEntryType.DEBIT,
            amount: Math.abs(amount),
            description: description || `Debit for transaction ${transactionId}`,
        };
        const creditEntry = {
            transaction_id: transactionId,
            account_id: creditAccountId,
            entry_type: JournalEntry_1.JournalEntryType.CREDIT,
            amount: Math.abs(amount),
            description: description || `Credit for transaction ${transactionId}`,
        };
        const debitId = this.create(debitEntry);
        const creditId = this.create(creditEntry);
        return { debitId, creditId };
    }
    /**
     * Delete all journal entries for a transaction
     */
    deleteByTransactionId(transactionId) {
        const query = `DELETE FROM ${this.tableName} WHERE transaction_id = ?`;
        const result = this.db.prepare(query).run(transactionId);
        return result.changes > 0;
    }
    /**
     * Verify double-entry balance for a transaction
     */
    verifyTransactionBalance(transactionId) {
        const query = `
      SELECT 
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits
      FROM ${this.tableName}
      WHERE transaction_id = ?
    `;
        const result = this.db.prepare(query).get(transactionId);
        const debits = result?.total_debits || 0;
        const credits = result?.total_credits || 0;
        return Math.abs(debits - credits) < 0.01; // Allow for small floating point errors
    }
}
exports.JournalEntryRepository = JournalEntryRepository;
//# sourceMappingURL=JournalEntryRepository.js.map