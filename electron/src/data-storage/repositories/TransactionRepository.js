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
            payee_name: row.payee_name,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
    /**
     * Get all transactions with payee information
     */
    getAll() {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, []);
    }
    /**
     * Get transactions by account ID
     */
    getByAccountId(accountId) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.account_id = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [accountId]);
    }
    /**
     * Get transactions by date range
     */
    getByDateRange(startDate, endDate) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [startDate, endDate]);
    }
    /**
     * Get recent transactions with a limit
     */
    getRecent(limit) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      ORDER BY t.date DESC, t.transaction_id DESC
      LIMIT ?
    `;
        return this.runQuery(query, [limit]);
    }
    /**
     * Search transactions by description
     */
    searchByDescription(term) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.description LIKE ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [`%${term}%`]);
    }
    /**
     * Get transactions by category
     */
    getByCategory(categoryId) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.category_id = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [categoryId]);
    }
    /**
     * Get transactions by type (income, expense, transfer)
     */
    getByType(type) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.transaction_type = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [type]);
    }
    /**
     * Get transactions by status (pending, cleared, reconciled)
     */
    getByStatus(status) {
        const query = `
      SELECT t.*, p.name as payee_name 
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      WHERE t.status = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
        return this.runQuery(query, [status]);
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