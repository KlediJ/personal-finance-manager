export enum BillFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual'
}

export enum BillPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial'
}

export interface RecurringBill {
  bill_id?: number;
  payee_id: number;
  category_id: number;
  account_id: number;
  bill_name: string;
  amount: number;
  frequency: BillFrequency;
  due_day: number;
  start_date: string;
  end_date?: string;
  is_fixed_amount: boolean;
  auto_pay: boolean;
  reminder_days: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillPayment {
  payment_id?: number;
  bill_id: number;
  transaction_id?: number;
  due_date: string;
  amount_due: number;
  amount_paid?: number;
  payment_date?: string;
  status: BillPaymentStatus;
  days_late: number;
  late_fee: number;
  created_at?: string;
  updated_at?: string;
}

export interface BillSummary extends RecurringBill {
  payee_name?: string;
  category_name?: string;
  account_name?: string;
  next_due_date?: string;
  last_payment_date?: string;
  total_overdue?: number;
  upcoming_payments?: BillPayment[];
}