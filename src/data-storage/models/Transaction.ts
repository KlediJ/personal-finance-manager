export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  RECONCILED = 'reconciled'
}

export interface Transaction {
  transaction_id?: number;
  account_id: number;
  date: string;
  amount: number;
  description?: string;
  category_id?: number | null;
  transaction_type: TransactionType;
  status: TransactionStatus;
  payee_id?: number | null;
  created_at?: string;
  updated_at?: string;
}
