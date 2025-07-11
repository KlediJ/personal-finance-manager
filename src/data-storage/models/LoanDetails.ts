export enum LoanType {
  MORTGAGE = 'mortgage',
  AUTO = 'auto',
  PERSONAL = 'personal',
  STUDENT = 'student',
  BUSINESS = 'business',
  HOME_EQUITY = 'home_equity'
}

export enum PaymentFrequency {
  MONTHLY = 'monthly',
  BIWEEKLY = 'biweekly',
  WEEKLY = 'weekly',
  QUARTERLY = 'quarterly'
}

export interface LoanDetails {
  loan_id?: number;
  account_id: number;
  loan_type: LoanType;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  payment_amount: number;
  payment_frequency: PaymentFrequency;
  start_date: string;
  maturity_date: string;
  escrow_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AmortizationSchedule {
  schedule_id?: number;
  loan_id: number;
  payment_number: number;
  payment_date: string;
  payment_amount: number;
  principal_amount: number;
  interest_amount: number;
  remaining_balance: number;
  escrow_amount?: number;
  is_actual_payment: boolean;
  transaction_id?: number;
  created_at?: string;
}

export interface LoanSummary extends LoanDetails {
  account_name?: string;
  total_interest_paid?: number;
  total_principal_paid?: number;
  next_payment_date?: string;
  next_payment_principal?: number;
  next_payment_interest?: number;
  payments_remaining?: number;
  payoff_date?: string;
  early_payoff_savings?: number;
}