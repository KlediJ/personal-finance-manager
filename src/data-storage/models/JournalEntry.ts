export enum JournalEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit'
}

export interface JournalEntry {
  journal_entry_id?: number;
  transaction_id: number;
  account_id: number;
  entry_type: JournalEntryType;
  amount: number;
  description?: string;
  reference_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryPair {
  debit_entry: JournalEntry;
  credit_entry: JournalEntry;
}