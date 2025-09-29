import { BaseRepository } from './BaseRepository';
import { JournalEntry, JournalEntryType } from '../models/JournalEntry';

export class JournalEntryRepository extends BaseRepository<JournalEntry> {
  constructor() {
    super('journal_entries');
  }
  
  protected mapToEntity(row: any): JournalEntry {
    return {
      journal_entry_id: row.journal_entry_id,
      transaction_id: row.transaction_id,
      account_id: row.account_id,
      entry_type: row.entry_type as JournalEntryType,
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
  public getByTransactionId(transactionId: number): JournalEntry[] {
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
  public getByAccountId(accountId: number): JournalEntry[] {
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
  public calculateAccountBalance(accountId: number): number {
    const query = `
      SELECT 
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits
      FROM ${this.tableName}
      WHERE account_id = ?
    `;
    
    const result = this.db.prepare(query).get(accountId) as { 
      total_debits: number | null; 
      total_credits: number | null; 
    };
    
    const debits = result?.total_debits || 0;
    const credits = result?.total_credits || 0;
    
    return debits - credits;
  }
  
  /**
   * Create paired journal entries for double-entry bookkeeping
   */
  public createDoubleEntry(
    transactionId: number,
    debitAccountId: number,
    creditAccountId: number,
    amount: number,
    description?: string
  ): { debitId: number; creditId: number } {
    const debitEntry: JournalEntry = {
      transaction_id: transactionId,
      account_id: debitAccountId,
      entry_type: JournalEntryType.DEBIT,
      amount: Math.abs(amount),
      description: description || `Debit for transaction ${transactionId}`,
    };
    
    const creditEntry: JournalEntry = {
      transaction_id: transactionId,
      account_id: creditAccountId,
      entry_type: JournalEntryType.CREDIT,
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
  public deleteByTransactionId(transactionId: number): boolean {
    const query = `DELETE FROM ${this.tableName} WHERE transaction_id = ?`;
    const result = this.db.prepare(query).run(transactionId);
    return result.changes > 0;
  }
  
  /**
   * Verify double-entry balance for a transaction
   */
  public verifyTransactionBalance(transactionId: number): boolean {
    const query = `
      SELECT 
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits
      FROM ${this.tableName}
      WHERE transaction_id = ?
    `;
    
    const result = this.db.prepare(query).get(transactionId) as { 
      total_debits: number | null; 
      total_credits: number | null; 
    };
    
    const debits = result?.total_debits || 0;
    const credits = result?.total_credits || 0;
    
    return Math.abs(debits - credits) < 0.01; // Allow for small floating point errors
  }
}