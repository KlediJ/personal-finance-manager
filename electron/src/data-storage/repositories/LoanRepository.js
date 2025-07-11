"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmortizationScheduleRepository = exports.LoanRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const LoanDetails_1 = require("../models/LoanDetails");
class LoanRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('loan_details');
    }
    mapToEntity(row) {
        return {
            loan_id: row.loan_id,
            account_id: row.account_id,
            loan_type: row.loan_type,
            original_amount: row.original_amount,
            current_balance: row.current_balance,
            interest_rate: row.interest_rate,
            term_months: row.term_months,
            payment_amount: row.payment_amount,
            payment_frequency: row.payment_frequency,
            start_date: row.start_date,
            maturity_date: row.maturity_date,
            escrow_amount: row.escrow_amount,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
    getLoansByAccount(accountId) {
        return this.findBy('account_id', accountId);
    }
    getLoansByType(loanType) {
        return this.findBy('loan_type', loanType);
    }
    getActiveLoan(accountId) {
        const query = `
      SELECT * FROM loan_details
      WHERE account_id = ? AND current_balance > 0
      ORDER BY created_at DESC
      LIMIT 1
    `;
        return this.runQuerySingle(query, [accountId]);
    }
    getLoansWithSummary() {
        const query = `
      SELECT 
        ld.*,
        a.name as account_name
      FROM loan_details ld
      LEFT JOIN accounts a ON ld.account_id = a.account_id
      WHERE ld.current_balance > 0
      ORDER BY ld.maturity_date ASC
    `;
        const statement = this.db.prepare(query);
        const rows = statement.all();
        return rows.map((row) => {
            const loanDetails = this.mapToEntity(row);
            const summary = this.calculateLoanSummary(loanDetails);
            return {
                ...loanDetails,
                account_name: row.account_name,
                ...summary,
            };
        });
    }
    calculateLoanSummary(loan) {
        const now = new Date();
        const startDate = new Date(loan.start_date);
        const maturityDate = new Date(loan.maturity_date);
        // Calculate payments made
        const totalPayments = loan.original_amount - loan.current_balance;
        const monthlyRate = loan.interest_rate / 100 / 12;
        const totalInterestScheduled = this.calculateTotalInterest(loan);
        // Calculate next payment date
        const nextPaymentDate = this.calculateNextPaymentDate(loan, now);
        // Calculate remaining payments
        const paymentsRemaining = Math.ceil(loan.current_balance / loan.payment_amount);
        // Calculate early payoff savings
        const earlyPayoffSavings = this.calculateEarlyPayoffSavings(loan);
        return {
            total_principal_paid: loan.original_amount - loan.current_balance,
            next_payment_date: nextPaymentDate,
            payments_remaining: paymentsRemaining,
            payoff_date: maturityDate.toISOString().split('T')[0],
            early_payoff_savings: earlyPayoffSavings,
        };
    }
    calculateTotalInterest(loan) {
        const monthlyRate = loan.interest_rate / 100 / 12;
        const totalPayments = loan.payment_amount * loan.term_months;
        return totalPayments - loan.original_amount;
    }
    calculateNextPaymentDate(loan, fromDate) {
        const startDate = new Date(loan.start_date);
        const monthsSinceStart = Math.floor((fromDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        let nextPaymentDate = new Date(startDate);
        switch (loan.payment_frequency) {
            case LoanDetails_1.PaymentFrequency.MONTHLY:
                nextPaymentDate.setMonth(startDate.getMonth() + monthsSinceStart + 1);
                break;
            case LoanDetails_1.PaymentFrequency.BIWEEKLY:
                const biweeklyPeriods = Math.floor(monthsSinceStart * 2);
                nextPaymentDate = new Date(startDate.getTime() + ((biweeklyPeriods + 1) * 14 * 24 * 60 * 60 * 1000));
                break;
            case LoanDetails_1.PaymentFrequency.WEEKLY:
                const weeklyPeriods = Math.floor(monthsSinceStart * 4);
                nextPaymentDate = new Date(startDate.getTime() + ((weeklyPeriods + 1) * 7 * 24 * 60 * 60 * 1000));
                break;
            case LoanDetails_1.PaymentFrequency.QUARTERLY:
                nextPaymentDate.setMonth(startDate.getMonth() + ((Math.floor(monthsSinceStart / 3) + 1) * 3));
                break;
        }
        return nextPaymentDate.toISOString().split('T')[0];
    }
    calculateEarlyPayoffSavings(loan) {
        // Calculate interest savings if paid off today
        const remainingMonths = Math.ceil(loan.current_balance / loan.payment_amount);
        const totalRemainingPayments = loan.payment_amount * remainingMonths;
        return totalRemainingPayments - loan.current_balance;
    }
    updateLoanBalance(loanId, newBalance) {
        return this.update(loanId, { current_balance: newBalance });
    }
    generateAmortizationSchedule(loanId) {
        const loan = this.getById(loanId);
        if (!loan)
            return [];
        const schedule = [];
        const monthlyRate = loan.interest_rate / 100 / 12;
        let remainingBalance = loan.current_balance;
        let paymentNumber = 1;
        const paymentDate = new Date(loan.start_date);
        while (remainingBalance > 0.01 && paymentNumber <= loan.term_months) {
            const interestAmount = remainingBalance * monthlyRate;
            const principalAmount = Math.min(loan.payment_amount - interestAmount, remainingBalance);
            remainingBalance -= principalAmount;
            schedule.push({
                loan_id: loanId,
                payment_number: paymentNumber,
                payment_date: paymentDate.toISOString().split('T')[0],
                payment_amount: loan.payment_amount,
                principal_amount: principalAmount,
                interest_amount: interestAmount,
                remaining_balance: remainingBalance,
                escrow_amount: loan.escrow_amount,
                is_actual_payment: false,
            });
            paymentNumber++;
            paymentDate.setMonth(paymentDate.getMonth() + 1);
        }
        return schedule;
    }
}
exports.LoanRepository = LoanRepository;
class AmortizationScheduleRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('amortization_schedule');
    }
    mapToEntity(row) {
        return {
            schedule_id: row.schedule_id,
            loan_id: row.loan_id,
            payment_number: row.payment_number,
            payment_date: row.payment_date,
            payment_amount: row.payment_amount,
            principal_amount: row.principal_amount,
            interest_amount: row.interest_amount,
            remaining_balance: row.remaining_balance,
            escrow_amount: row.escrow_amount,
            is_actual_payment: Boolean(row.is_actual_payment),
            transaction_id: row.transaction_id,
            created_at: row.created_at,
        };
    }
    getScheduleByLoan(loanId) {
        const query = `
      SELECT * FROM amortization_schedule
      WHERE loan_id = ?
      ORDER BY payment_number ASC
    `;
        return this.runQuery(query, [loanId]);
    }
    getActualPayments(loanId) {
        const query = `
      SELECT * FROM amortization_schedule
      WHERE loan_id = ? AND is_actual_payment = 1
      ORDER BY payment_number ASC
    `;
        return this.runQuery(query, [loanId]);
    }
    markPaymentActual(scheduleId, transactionId) {
        return this.update(scheduleId, {
            is_actual_payment: true,
            transaction_id: transactionId,
        });
    }
    bulkInsertSchedule(scheduleItems) {
        const statement = this.db.prepare(`
      INSERT INTO amortization_schedule (
        loan_id, payment_number, payment_date, payment_amount,
        principal_amount, interest_amount, remaining_balance,
        escrow_amount, is_actual_payment, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        try {
            const transaction = this.db.transaction(() => {
                for (const item of scheduleItems) {
                    statement.run(item.loan_id, item.payment_number, item.payment_date, item.payment_amount, item.principal_amount, item.interest_amount, item.remaining_balance, item.escrow_amount, item.is_actual_payment ? 1 : 0, item.transaction_id);
                }
            });
            transaction();
            return true;
        }
        catch (error) {
            console.error('Error inserting amortization schedule:', error);
            return false;
        }
    }
}
exports.AmortizationScheduleRepository = AmortizationScheduleRepository;
//# sourceMappingURL=LoanRepository.js.map