export enum ReportType {
  INCOME_EXPENSE = 'income_expense',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
  BUDGET_VS_ACTUAL = 'budget_vs_actual',
  CATEGORY_SPENDING = 'category_spending'
}

export interface Report {
  report_id?: number;
  name: string;
  report_type: ReportType;
  parameters?: string; // JSON string
  created_at?: string;
  updated_at?: string;
}
