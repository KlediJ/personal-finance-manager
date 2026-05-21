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

export enum TransactionSubtype {
  STANDARD = 'standard',
  CREDIT_CARD_PURCHASE = 'credit_card_purchase',
  CREDIT_CARD_PAYMENT = 'credit_card_payment',
  CREDIT_CARD_REFUND = 'credit_card_refund',
  LOAN_PAYMENT = 'loan_payment',
  LOAN_ADVANCE = 'loan_advance',
  INTERNAL_TRANSFER = 'internal_transfer'
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
  payee_name?: string;
  category_name?: string;
  created_at?: string;
  updated_at?: string;
  // Credit Card Transaction Logic enhancements - Phase 2
  transaction_subtype?: TransactionSubtype;
  linked_transaction_id?: number | null;
  pending_transfer_review?: boolean;
}
