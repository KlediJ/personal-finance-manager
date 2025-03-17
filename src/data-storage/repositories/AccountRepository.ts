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
      updated_at: row.updated_at
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
}
