export enum BudgetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual'
}

export interface Budget {
  budget_id?: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}
