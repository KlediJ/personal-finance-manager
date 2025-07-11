"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class TransactionRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('transactions');
    }
    mapToEntity(row) {
        return {
            transaction_id: row.transaction_id,
            account_id: row.account_id,
            date: row.date,
            amount: row.amount,
            description: row.description,
            category_id: row.category_id,
            transaction_type: row.transaction_type,
            status: row.status,
            payee_id: row.payee_id,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
    /**
     * Get transactions by account ID
     */
    getByAccountId(accountId) {
        return this.findBy('account_id', accountId);
    }
    /**
     * Get transactions by date range
     */
    getByDateRange(startDate, endDate) {
        const query = `
      SELECT * FROM ${this.tableName}
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `;
        return this.runQuery(query, [startDate, endDate]);
    }
    /**
     * Get recent transactions with a limit
     */
    getRecent(limit) {
        const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY date DESC, transaction_id DESC
      LIMIT ?
    `;
        return this.runQuery(query, [limit]);
    }
    /**
     * Search transactions by description
     */
    searchByDescription(term) {
        const query = `
      SELECT * FROM ${this.tableName}
      WHERE description LIKE ?
      ORDER BY date DESC
    `;
        return this.runQuery(query, [`%${term}%`]);
    }
    /**
     * Get transactions by category
     */
    getByCategory(categoryId) {
        return this.findBy('category_id', categoryId);
    }
    /**
     * Get transactions by type (income, expense, transfer)
     */
    getByType(type) {
        return this.findBy('transaction_type', type);
    }
    /**
     * Get transactions by status (pending, cleared, reconciled)
     */
    getByStatus(status) {
        return this.findBy('status', status);
    }
    /**
     * Get income/expense summary by month
     */
    getMonthlySummary(year) {
        const query = `
      SELECT 
        strftime('%m', date) as month,
        transaction_type,
        SUM(amount) as total
      FROM ${this.tableName}
      WHERE strftime('%Y', date) = ?
      GROUP BY month, transaction_type
      ORDER BY month
    `;
        return this.db.prepare(query).all(year.toString());
    }
    /**
     * Get transactions sum by category within date range
     */
    getSumByCategory(startDate, endDate) {
        const query = `
      SELECT 
        category_id,
        SUM(amount) as total
      FROM ${this.tableName}
      WHERE date >= ? AND date <= ?
      GROUP BY category_id
      ORDER BY total DESC
    `;
        return this.db.prepare(query).all(startDate, endDate);
    }
}
exports.TransactionRepository = TransactionRepository;
//# sourceMappingURL=TransactionRepository.js.map