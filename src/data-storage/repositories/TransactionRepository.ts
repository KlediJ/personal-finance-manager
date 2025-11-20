import { BaseRepository } from './BaseRepository';
import { Transaction, TransactionType, TransactionStatus, TransactionSubtype } from '../models/Transaction';

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
      category_name: row.category_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Credit Card Transaction Logic enhancements - Phase 2
      transaction_subtype: row.transaction_subtype as TransactionSubtype
    };
  }
  
  /**
   * Get all transactions with payee and category information
   */
  public getAll(): Transaction[] {
    const query = `
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
    return this.runQuery(query, []);
  }

  /**
   * Get transactions by account ID
   */
  public getByAccountId(accountId: number): Transaction[] {
    const query = `
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
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
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.status = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
    return this.runQuery(query, [status]);
  }

  /**
   * Get all transactions for a given month (YYYY-MM) with related info,
   * optionally filtered by account.
   */
  public getByMonth(month: string, accountId?: number): Transaction[] {
    const startDate = `${month}-01`;
    // SQLite strftime trick to get first day of next month
    const endDateExpr = `date(?, '+1 month')`;

    let query = `
      SELECT t.*, 
             p.name as payee_name, 
             c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.date >= ? 
        AND t.date < ${endDateExpr}
    `;

    const params: any[] = [startDate, startDate];

    if (typeof accountId === 'number') {
      query += ` AND t.account_id = ?`;
      params.push(accountId);
    }

    query += ` ORDER BY t.date ASC, t.transaction_id ASC`;

    return this.runQuery(query, params);
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

  // Credit Card Transaction Logic enhancements - Phase 2
  
  /**
   * Get transactions by subtype
   */
  public getBySubtype(subtype: TransactionSubtype): Transaction[] {
    return this.findBy('transaction_subtype', subtype);
  }

  /**
   * Get credit card purchases for an account
   */
  public getCreditCardPurchases(accountId: number): Transaction[] {
    const query = `
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.account_id = ? AND t.transaction_subtype = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
    return this.runQuery(query, [accountId, TransactionSubtype.CREDIT_CARD_PURCHASE]);
  }

  /**
   * Get credit card payments for an account
   */
  public getCreditCardPayments(accountId: number): Transaction[] {
    const query = `
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.account_id = ? AND t.transaction_subtype = ?
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
    return this.runQuery(query, [accountId, TransactionSubtype.CREDIT_CARD_PAYMENT]);
  }

  /**
   * Create a credit card purchase transaction
   */
  public createCreditCardPurchase(
    accountId: number,
    date: string,
    amount: number,
    description: string,
    categoryId?: number,
    payeeId?: number
  ): number {
    const transaction: Transaction = {
      account_id: accountId,
      date,
      amount: Math.abs(amount), // Ensure positive amount for credit card purchases
      description,
      category_id: categoryId || null,
      transaction_type: TransactionType.EXPENSE,
      transaction_subtype: TransactionSubtype.CREDIT_CARD_PURCHASE,
      status: TransactionStatus.PENDING,
      payee_id: payeeId || null
    };
    
    return this.create(transaction);
  }

  /**
   * Create a credit card payment transaction
   */
  public createCreditCardPayment(
    creditCardAccountId: number,
    paymentAmount: number,
    date: string,
    description: string = 'Credit Card Payment'
  ): number {
    const transaction: Transaction = {
      account_id: creditCardAccountId,
      date,
      amount: -Math.abs(paymentAmount), // Negative amount reduces credit card balance
      description,
      transaction_type: TransactionType.TRANSFER,
      transaction_subtype: TransactionSubtype.CREDIT_CARD_PAYMENT,
      status: TransactionStatus.PENDING
    };
    
    return this.create(transaction);
  }

  /**
   * Get credit card balance summary
   */
  public getCreditCardBalanceSummary(accountId: number): any {
    const query = `
      SELECT 
        SUM(CASE WHEN transaction_subtype = ? THEN amount ELSE 0 END) as total_purchases,
        SUM(CASE WHEN transaction_subtype = ? THEN amount ELSE 0 END) as total_payments,
        SUM(amount) as current_balance
      FROM ${this.tableName}
      WHERE account_id = ?
    `;
    
    return this.db.prepare(query).get(
      TransactionSubtype.CREDIT_CARD_PURCHASE,
      TransactionSubtype.CREDIT_CARD_PAYMENT,
      accountId
    );
  }

  /**
   * Get transactions that need proper subtype classification
   */
  public getTransactionsNeedingSubtypeClassification(): Transaction[] {
    const query = `
      SELECT t.*, p.name as payee_name, c.name as category_name, a.is_liability
      FROM ${this.tableName} t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN accounts a ON t.account_id = a.account_id
      WHERE t.transaction_subtype = 'standard' AND a.is_liability = 1
      ORDER BY t.date DESC
    `;
    
    return this.runQuery(query, []);
  }
}
