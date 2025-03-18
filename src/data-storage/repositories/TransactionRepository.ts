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
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  /**
   * Get transactions by account ID
   */
  public getByAccountId(accountId: number): Transaction[] {
    return this.findBy('account_id', accountId);
  }
  
  /**
   * Get transactions by date range
   */
  public getByDateRange(startDate: string, endDate: string): Transaction[] {
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
  public getRecent(limit: number): Transaction[] {
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
  public searchByDescription(term: string): Transaction[] {
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
  public getByCategory(categoryId: number): Transaction[] {
    return this.findBy('category_id', categoryId);
  }
  
  /**
   * Get transactions by type (income, expense, transfer)
   */
  public getByType(type: string): Transaction[] {
    return this.findBy('transaction_type', type);
  }
  
  /**
   * Get transactions by status (pending, cleared, reconciled)
   */
  public getByStatus(status: string): Transaction[] {
    return this.findBy('status', status);
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