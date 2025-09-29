import { BaseRepository } from './BaseRepository';
import { Account } from '../models/Account';

export class AccountRepository extends BaseRepository<Account> {
  constructor() {
    super('accounts');
  }
  
  protected mapToEntity(row: any): Account {
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
      is_liability: Boolean(row.is_liability)
    };
  }
  
  // Custom methods specific to accounts
  
  /**
   * Get all active accounts
   */
  public getActiveAccounts(): Account[] {
    return this.findBy('active', 1);
  }
  
  /**
   * Update account balance
   */
  public updateBalance(accountId: number, newBalance: number): boolean {
    const account = this.getById(accountId);
    if (!account) return false;
    
    return this.update(accountId, { 
      ...account, 
      current_balance: newBalance 
    });
  }
  
  /**
   * Get total balance across all accounts
   */
  public getTotalBalance(): number {
    const query = `
      SELECT SUM(current_balance) as total 
      FROM accounts 
      WHERE active = 1
    `;
    
    const result = this.db.prepare(query).get() as { total: number | null };
    return result?.total || 0;
  }
  
  /**
   * Get accounts by type
   */
  public getAccountsByType(type: string): Account[] {
    return this.findBy('type', type);
  }

  // Chart of Accounts enhancements - Phase 1
  
  /**
   * Get accounts by account class (Asset, Liability, Equity, etc.)
   */
  public getAccountsByClass(accountClass: string): Account[] {
    return this.findBy('account_class', accountClass);
  }

  /**
   * Get asset accounts (checking, savings, etc.)
   */
  public getAssetAccounts(): Account[] {
    return this.getAccountsByClass('Asset');
  }

  /**
   * Get liability accounts (credit cards, loans, etc.)
   */
  public getLiabilityAccounts(): Account[] {
    return this.getAccountsByClass('Liability');
  }

  /**
   * Get net worth calculation (Assets - Liabilities)
   */
  public getNetWorth(): number {
    const query = `
      SELECT 
        SUM(CASE WHEN account_class = 'Asset' THEN current_balance ELSE 0 END) as assets,
        SUM(CASE WHEN account_class = 'Liability' THEN current_balance ELSE 0 END) as liabilities
      FROM accounts 
      WHERE active = 1
    `;
    
    const result = this.db.prepare(query).get() as { assets: number | null; liabilities: number | null };
    const assets = result?.assets || 0;
    const liabilities = result?.liabilities || 0;
    
    return assets - liabilities;
  }

  /**
   * Get Chart of Accounts summary
   */
  public getChartOfAccountsSummary(): any[] {
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
