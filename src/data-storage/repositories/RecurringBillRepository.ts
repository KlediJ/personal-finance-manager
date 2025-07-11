import { BaseRepository } from './BaseRepository';
import { RecurringBill, BillPayment, BillSummary, BillFrequency, BillPaymentStatus } from '../models/RecurringBill';

export class RecurringBillRepository extends BaseRepository<RecurringBill> {
  constructor() {
    super('recurring_bills');
  }

  protected mapToEntity(row: any): RecurringBill {
    return {
      bill_id: row.bill_id,
      payee_id: row.payee_id,
      category_id: row.category_id,
      account_id: row.account_id,
      bill_name: row.bill_name,
      amount: row.amount,
      frequency: row.frequency as BillFrequency,
      due_day: row.due_day,
      start_date: row.start_date,
      end_date: row.end_date,
      is_fixed_amount: Boolean(row.is_fixed_amount),
      auto_pay: Boolean(row.auto_pay),
      reminder_days: row.reminder_days,
      active: Boolean(row.active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public getActiveBills(): RecurringBill[] {
    return this.findBy('active', 1);
  }

  public getBillsByPayee(payeeId: number): RecurringBill[] {
    return this.findBy('payee_id', payeeId);
  }

  public getBillsByAccount(accountId: number): RecurringBill[] {
    return this.findBy('account_id', accountId);
  }

  public getBillsByCategory(categoryId: number): RecurringBill[] {
    return this.findBy('category_id', categoryId);
  }

  public getUpcomingBills(daysAhead: number = 30): RecurringBill[] {
    const today = new Date();
    const endDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    const query = `
      SELECT rb.* FROM recurring_bills rb
      WHERE rb.active = 1
      AND (rb.end_date IS NULL OR rb.end_date > ?)
      ORDER BY rb.due_day ASC
    `;
    
    return this.runQuery(query, [today.toISOString().split('T')[0]]);
  }

  public getBillsWithSummary(): BillSummary[] {
    const query = `
      SELECT 
        rb.*,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name
      FROM recurring_bills rb
      LEFT JOIN payees p ON rb.payee_id = p.payee_id
      LEFT JOIN categories c ON rb.category_id = c.category_id
      LEFT JOIN accounts a ON rb.account_id = a.account_id
      WHERE rb.active = 1
      ORDER BY rb.due_day ASC
    `;
    
    const statement = this.db.prepare(query);
    const rows = statement.all();
    
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      payee_name: row.payee_name,
      category_name: row.category_name,
      account_name: row.account_name,
      next_due_date: this.calculateNextDueDate(row),
      last_payment_date: this.getLastPaymentDate(row.bill_id),
    }));
  }

  public getOverdueBills(): BillSummary[] {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        rb.*,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        SUM(CASE WHEN bp.status = 'overdue' THEN bp.amount_due ELSE 0 END) as total_overdue
      FROM recurring_bills rb
      LEFT JOIN payees p ON rb.payee_id = p.payee_id
      LEFT JOIN categories c ON rb.category_id = c.category_id
      LEFT JOIN accounts a ON rb.account_id = a.account_id
      LEFT JOIN bill_payments bp ON rb.bill_id = bp.bill_id
      WHERE rb.active = 1
      AND bp.status = 'overdue'
      GROUP BY rb.bill_id
      ORDER BY total_overdue DESC
    `;
    
    const statement = this.db.prepare(query);
    const rows = statement.all();
    
    return rows.map((row: any) => ({
      ...this.mapToEntity(row),
      payee_name: row.payee_name,
      category_name: row.category_name,
      account_name: row.account_name,
      total_overdue: row.total_overdue || 0,
    }));
  }

  private calculateNextDueDate(billData: any): string {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let nextDueDate = new Date(currentYear, currentMonth, billData.due_day);
    
    // If the due date has passed this month, move to next month
    if (nextDueDate <= today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
    
    // Handle different frequencies
    switch (billData.frequency) {
      case 'weekly':
        // For weekly bills, calculate based on start date
        const startDate = new Date(billData.start_date);
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        nextDueDate = new Date(startDate.getTime() + ((weeksSinceStart + 1) * 7 * 24 * 60 * 60 * 1000));
        break;
      case 'biweekly':
        // Similar logic for biweekly
        const biweeklyStart = new Date(billData.start_date);
        const daysSinceBiweeklyStart = Math.floor((today.getTime() - biweeklyStart.getTime()) / (24 * 60 * 60 * 1000));
        const biweeksSinceStart = Math.floor(daysSinceBiweeklyStart / 14);
        nextDueDate = new Date(biweeklyStart.getTime() + ((biweeksSinceStart + 1) * 14 * 24 * 60 * 60 * 1000));
        break;
      case 'quarterly':
        // For quarterly, add 3 months
        nextDueDate = new Date(currentYear, currentMonth + 3, billData.due_day);
        break;
      case 'annual':
        // For annual, add 1 year
        nextDueDate = new Date(currentYear + 1, currentMonth, billData.due_day);
        break;
      default:
        // Monthly is already handled above
        break;
    }
    
    return nextDueDate.toISOString().split('T')[0];
  }

  private getLastPaymentDate(billId: number): string | undefined {
    const query = `
      SELECT MAX(payment_date) as last_payment_date
      FROM bill_payments
      WHERE bill_id = ? AND status = 'paid'
    `;
    
    const statement = this.db.prepare(query);
    const result = statement.get(billId) as { last_payment_date: string } | undefined;
    
    return result?.last_payment_date;
  }
}

export class BillPaymentRepository extends BaseRepository<BillPayment> {
  constructor() {
    super('bill_payments');
  }

  protected mapToEntity(row: any): BillPayment {
    return {
      payment_id: row.payment_id,
      bill_id: row.bill_id,
      transaction_id: row.transaction_id,
      due_date: row.due_date,
      amount_due: row.amount_due,
      amount_paid: row.amount_paid,
      payment_date: row.payment_date,
      status: row.status as BillPaymentStatus,
      days_late: row.days_late,
      late_fee: row.late_fee,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public getPaymentsByBill(billId: number): BillPayment[] {
    return this.findBy('bill_id', billId);
  }

  public getOverduePayments(): BillPayment[] {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM bill_payments
      WHERE status = 'overdue'
      OR (status = 'pending' AND due_date < ?)
      ORDER BY due_date ASC
    `;
    
    return this.runQuery(query, [today]);
  }

  public getUpcomingPayments(daysAhead: number = 7): BillPayment[] {
    const today = new Date();
    const endDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    const query = `
      SELECT * FROM bill_payments
      WHERE status = 'pending'
      AND due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `;
    
    return this.runQuery(query, [
      today.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]);
  }

  public markPaymentPaid(paymentId: number, transactionId: number, amountPaid: number): boolean {
    const paymentDate = new Date().toISOString().split('T')[0];
    
    return this.update(paymentId, {
      status: BillPaymentStatus.PAID,
      transaction_id: transactionId,
      amount_paid: amountPaid,
      payment_date: paymentDate,
    });
  }

  public markPaymentOverdue(paymentId: number, daysLate: number, lateFee: number = 0): boolean {
    return this.update(paymentId, {
      status: BillPaymentStatus.OVERDUE,
      days_late: daysLate,
      late_fee: lateFee,
    });
  }
}