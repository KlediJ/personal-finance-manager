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

export interface AccountDetails {
  account_id: number;
  credit_limit?: number;
  interest_rate?: number;
  statement_date?: number;
  due_date?: number;
  minimum_payment?: number;
  grace_period_days?: number;
  account_number_masked?: string;
  institution_name?: string;
  account_details_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnhancedAccount extends Account {
  details?: AccountDetails;
}
