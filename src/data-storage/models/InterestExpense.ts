export enum InterestExpenseType {
  CREDIT_CARD = 'credit_card',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  OVERDRAFT = 'overdraft',
  LINE_OF_CREDIT = 'line_of_credit'
}

export interface InterestExpense {
  expense_id?: number;
  account_id: number;
  transaction_id?: number;
  expense_type: InterestExpenseType;
  period_start: string;
  period_end: string;
  average_balance: number;
  interest_rate: number;
  interest_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface InterestExpenseSummary extends InterestExpense {
  account_name?: string;
  category_name?: string;
  days_in_period?: number;
  daily_interest_rate?: number;
  annual_projection?: number;
}

export interface CreditCardInterestAnalysis {
  account_id: number;
  account_name: string;
  current_balance: number;
  credit_limit: number;
  utilization_rate: number;
  interest_rate: number;
  minimum_payment: number;
  current_month_interest: number;
  ytd_interest: number;
  projected_annual_interest: number;
  payoff_scenarios: PayoffScenario[];
}

export interface PayoffScenario {
  scenario_name: string;
  monthly_payment: number;
  months_to_payoff: number;
  total_interest_paid: number;
  total_amount_paid: number;
}