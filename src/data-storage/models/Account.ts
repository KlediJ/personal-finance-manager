export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  CASH = 'cash'
}

export interface Account {
  account_id: number;
  name: string;
  type: AccountType;
  opening_balance: number;
  current_balance: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
