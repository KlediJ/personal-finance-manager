"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestExpenseRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class InterestExpenseRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('interest_expenses');
    }
    mapToEntity(row) {
        return {
            expense_id: row.expense_id,
            account_id: row.account_id,
            transaction_id: row.transaction_id,
            expense_type: row.expense_type,
            period_start: row.period_start,
            period_end: row.period_end,
            average_balance: row.average_balance,
            interest_rate: row.interest_rate,
            interest_amount: row.interest_amount,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
    getExpensesByAccount(accountId) {
        return this.findBy('account_id', accountId);
    }
    getExpensesByType(expenseType) {
        return this.findBy('expense_type', expenseType);
    }
    getExpensesByDateRange(startDate, endDate) {
        const query = `
      SELECT * FROM interest_expenses
      WHERE period_start >= ? AND period_end <= ?
      ORDER BY period_start ASC
    `;
        return this.runQuery(query, [startDate, endDate]);
    }
    getExpensesWithSummary() {
        const query = `
      SELECT 
        ie.*,
        a.name as account_name,
        c.name as category_name
      FROM interest_expenses ie
      LEFT JOIN accounts a ON ie.account_id = a.account_id
      LEFT JOIN transactions t ON ie.transaction_id = t.transaction_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      ORDER BY ie.period_start DESC
    `;
        const statement = this.db.prepare(query);
        const rows = statement.all();
        return rows.map((row) => {
            const expense = this.mapToEntity(row);
            const startDate = new Date(expense.period_start);
            const endDate = new Date(expense.period_end);
            const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            const dailyRate = expense.interest_rate / 365;
            const annualProjection = expense.interest_amount * (365 / daysInPeriod);
            return {
                ...expense,
                account_name: row.account_name,
                category_name: row.category_name,
                days_in_period: daysInPeriod,
                daily_interest_rate: dailyRate,
                annual_projection: annualProjection,
            };
        });
    }
    getTotalInterestByAccount(accountId, year) {
        let query = `
      SELECT SUM(interest_amount) as total
      FROM interest_expenses
      WHERE account_id = ?
    `;
        const params = [accountId];
        if (year) {
            query += ` AND strftime('%Y', period_start) = ?`;
            params.push(year.toString());
        }
        const statement = this.db.prepare(query);
        const result = statement.get(...params);
        return result?.total || 0;
    }
    getTotalInterestByType(expenseType, year) {
        let query = `
      SELECT SUM(interest_amount) as total
      FROM interest_expenses
      WHERE expense_type = ?
    `;
        const params = [expenseType];
        if (year) {
            query += ` AND strftime('%Y', period_start) = ?`;
            params.push(year.toString());
        }
        const statement = this.db.prepare(query);
        const result = statement.get(...params);
        return result?.total || 0;
    }
    getMonthlyInterestTrend(accountId, months = 12) {
        const query = `
      SELECT 
        strftime('%Y-%m', period_start) as month,
        SUM(interest_amount) as amount
      FROM interest_expenses
      WHERE account_id = ?
      AND period_start >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', period_start)
      ORDER BY month ASC
    `;
        const statement = this.db.prepare(query);
        const results = statement.all(accountId);
        return results.map((row) => ({
            month: row.month,
            amount: row.amount,
        }));
    }
    calculateCreditCardInterestAnalysis(accountId) {
        // Get account details
        const accountQuery = `
      SELECT 
        a.*,
        ad.credit_limit,
        ad.interest_rate,
        ad.minimum_payment
      FROM accounts a
      LEFT JOIN account_details ad ON a.account_id = ad.account_id
      WHERE a.account_id = ? AND a.type = 'credit_card'
    `;
        const accountStatement = this.db.prepare(accountQuery);
        const accountData = accountStatement.get(accountId);
        if (!accountData)
            return null;
        // Get current month interest
        const currentMonthQuery = `
      SELECT SUM(interest_amount) as current_month_interest
      FROM interest_expenses
      WHERE account_id = ?
      AND strftime('%Y-%m', period_start) = strftime('%Y-%m', 'now')
    `;
        const currentMonthStatement = this.db.prepare(currentMonthQuery);
        const currentMonthResult = currentMonthStatement.get(accountId);
        // Get YTD interest
        const ytdQuery = `
      SELECT SUM(interest_amount) as ytd_interest
      FROM interest_expenses
      WHERE account_id = ?
      AND strftime('%Y', period_start) = strftime('%Y', 'now')
    `;
        const ytdStatement = this.db.prepare(ytdQuery);
        const ytdResult = ytdStatement.get(accountId);
        const currentBalance = accountData.current_balance;
        const creditLimit = accountData.credit_limit || 0;
        const interestRate = accountData.interest_rate || 0;
        const minimumPayment = accountData.minimum_payment || currentBalance * 0.02;
        const utilizationRate = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
        const currentMonthInterest = currentMonthResult?.current_month_interest || 0;
        const ytdInterest = ytdResult?.ytd_interest || 0;
        const projectedAnnualInterest = currentMonthInterest * 12;
        // Calculate payoff scenarios
        const payoffScenarios = this.calculatePayoffScenarios(currentBalance, interestRate, minimumPayment);
        return {
            account_id: accountId,
            account_name: accountData.name,
            current_balance: currentBalance,
            credit_limit: creditLimit,
            utilization_rate: utilizationRate,
            interest_rate: interestRate,
            minimum_payment: minimumPayment,
            current_month_interest: currentMonthInterest,
            ytd_interest: ytdInterest,
            projected_annual_interest: projectedAnnualInterest,
            payoff_scenarios: payoffScenarios,
        };
    }
    calculatePayoffScenarios(balance, annualRate, minimumPayment) {
        const scenarios = [];
        const monthlyRate = annualRate / 100 / 12;
        // Scenario 1: Minimum payments only
        scenarios.push(this.calculatePayoffScenario('Minimum Payment Only', balance, monthlyRate, minimumPayment));
        // Scenario 2: Minimum + $50
        scenarios.push(this.calculatePayoffScenario('Minimum + $50', balance, monthlyRate, minimumPayment + 50));
        // Scenario 3: Minimum + $100
        scenarios.push(this.calculatePayoffScenario('Minimum + $100', balance, monthlyRate, minimumPayment + 100));
        // Scenario 4: Double minimum
        scenarios.push(this.calculatePayoffScenario('Double Minimum', balance, monthlyRate, minimumPayment * 2));
        return scenarios;
    }
    calculatePayoffScenario(scenarioName, balance, monthlyRate, monthlyPayment) {
        let remainingBalance = balance;
        let totalInterest = 0;
        let months = 0;
        const maxMonths = 600; // 50 years max
        while (remainingBalance > 0.01 && months < maxMonths) {
            const interestPayment = remainingBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
            if (principalPayment <= 0) {
                // Payment doesn't cover interest - balance will never be paid off
                return {
                    scenario_name: scenarioName,
                    monthly_payment: monthlyPayment,
                    months_to_payoff: Infinity,
                    total_interest_paid: Infinity,
                    total_amount_paid: Infinity,
                };
            }
            remainingBalance -= principalPayment;
            totalInterest += interestPayment;
            months++;
        }
        return {
            scenario_name: scenarioName,
            monthly_payment: monthlyPayment,
            months_to_payoff: months,
            total_interest_paid: totalInterest,
            total_amount_paid: balance + totalInterest,
        };
    }
    recordInterestExpense(accountId, expenseType, periodStart, periodEnd, averageBalance, interestRate, interestAmount, transactionId) {
        return this.create({
            account_id: accountId,
            transaction_id: transactionId,
            expense_type: expenseType,
            period_start: periodStart,
            period_end: periodEnd,
            average_balance: averageBalance,
            interest_rate: interestRate,
            interest_amount: interestAmount,
        });
    }
}
exports.InterestExpenseRepository = InterestExpenseRepository;
