import { BaseRepository } from './BaseRepository';
import { Budget, BudgetPeriod } from '../models/Budget';
import { Category } from '../models/Category';

export class BudgetRepository extends BaseRepository<Budget> {
  constructor() {
    super('budgets');
  }
  
  protected mapToEntity(row: any): Budget {
    return {
      budget_id: row.budget_id,
      category_id: row.category_id,
      amount: row.amount,
      period: row.period as BudgetPeriod,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  /**
   * Get all budgets with category information
   */
  public getAllWithCategories(): any[] {
    const query = `
      SELECT b.*, c.name as category_name, c.type as category_type
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
    `;
    
    const rows = this.db.prepare(query).all();
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      category_name: row.category_name,
      category_type: row.category_type
    }));
  }
  
  /**
   * Get budgets for a specific period
   */
  public getByPeriod(period: BudgetPeriod): Budget[] {
    return this.findBy('period', period);
  }
  
  /**
   * Get budgets for a date range
   */
  public getByDateRange(startDate: string, endDate: string): Budget[] {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE 
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
    `;
    
    return this.runQuery(query, [
      endDate, startDate,
      startDate, endDate,
      startDate, endDate
    ]);
  }
  
  /**
   * Get budgets for a specific category
   */
  public getByCategory(categoryId: number): Budget[] {
    return this.findBy('category_id', categoryId);
  }
  
  /**
   * Get the current active budget for a category
   */
  public getCurrentForCategory(categoryId: number): Budget | null {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE category_id = ? AND start_date <= ? AND end_date >= ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    return this.runQuerySingle(query, [categoryId, today, today]);
  }
  
  /**
   * Get all current active budgets
   */
  public getCurrentBudgets(): Budget[] {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE start_date <= ? AND end_date >= ?
    `;
    
    return this.runQuery(query, [today, today]);
  }
  
  /**
   * Get all current active budgets with category information
   */
  public getCurrentBudgetsWithCategories(): any[] {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT b.*, c.name as category_name, c.type as category_type
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.start_date <= ? AND b.end_date >= ?
    `;
    
    const rows = this.db.prepare(query).all(today, today);
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      category_name: row.category_name,
      category_type: row.category_type
    }));
  }
  
  /**
   * Get budget progress (spent amount vs budget amount)
   * The function returns information on budget progress for each category
   */
  public getBudgetProgress(date: string = new Date().toISOString().split('T')[0]): any[] {
    // Get the first day of the month for the given date
    const month = date.substring(0, 7);
    const startOfMonth = `${month}-01`;
    
    // Get the last day of the month
    const year = parseInt(month.split('-')[0]);
    const monthNumber = parseInt(month.split('-')[1]);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const endOfMonth = `${month}-${lastDay}`;
    
    const query = `
      SELECT 
        b.budget_id, 
        b.category_id, 
        b.amount as budget_amount, 
        c.name as category_name,
        c.type as category_type,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions
          WHERE category_id = b.category_id
          AND date >= ?
          AND date <= ?
        ) as spent_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.period = 'monthly'
      AND b.start_date <= ?
      AND b.end_date >= ?
    `;
    
    const rows = this.db.prepare(query).all(
      startOfMonth, endOfMonth, date, date
    );
    
    return rows.map((row: any) => {
      // For expense categories, the spent amount is typically negative
      // We take the absolute value for easier comparison with budget
      const spent = row.category_type === 'expense' 
        ? Math.abs(row.spent_amount) 
        : row.spent_amount;
        
      return {
        budget_id: row.budget_id,
        category_id: row.category_id,
        category_name: row.category_name,
        category_type: row.category_type,
        budget_amount: row.budget_amount,
        spent_amount: spent,
        remaining_amount: row.budget_amount - spent,
        percentage: (spent / row.budget_amount) * 100
      };
    });
  }
}
