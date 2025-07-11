import { BaseRepository } from './BaseRepository';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';

export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super('transactions');
  }
  
  protected mapToEntity(row: any): Transaction {
    return {
      transaction_id: row.transaction_id,
      account_id: row.account_id,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category_id: row.category_id,
      transaction_type: row.transaction_type as TransactionType,
      status: row.status as TransactionStatus,
      payee_id: row.payee_id,
      payee_name: row.payee_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  /**
   * Get all transactions with payee information
   */
  public getAll(): Transaction[] {
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
  public getByAccountId(accountId: number): Transaction[] {
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
  public getByDateRange(startDate: string, endDate: string): Transaction[] {
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
  public getRecent(limit: number): Transaction[] {
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
  public searchByDescription(term: string): Transaction[] {
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
  public getByCategory(categoryId: number): Transaction[] {
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
  public getByType(type: string): Transaction[] {
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
  public getByStatus(status: string): Transaction[] {
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
  public getMonthlySummary(year: number): any[] {
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
  public getSumByCategory(startDate: string, endDate: string): any[] {
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