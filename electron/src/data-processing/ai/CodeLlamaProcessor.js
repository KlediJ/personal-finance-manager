"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeLlamaProcessor = void 0;
class CodeLlamaProcessor {
    constructor(context) {
        this.context = context;
    }
    async processComplexQuery(query) {
        const normalizedQuery = query.toLowerCase().trim();
        // Analyze query intent and complexity
        const intent = this.analyzeQueryIntent(normalizedQuery);
        // Route to appropriate analysis method
        switch (intent.type) {
            case 'debt_analysis':
                return await this.analyzeDebtSituation(normalizedQuery);
            case 'loan_optimization':
                return await this.optimizeLoanPayments(normalizedQuery);
            case 'bill_forecast':
                return await this.forecastBillPayments(normalizedQuery);
            case 'spending_analysis':
                return await this.analyzeSpendingPatterns(normalizedQuery);
            case 'relationship_analysis':
                return await this.analyzeFinancialRelationships(normalizedQuery);
            case 'interest_analysis':
                return await this.analyzeInterestExpenses(normalizedQuery);
            case 'credit_utilization':
                return await this.analyzeCreditUtilization(normalizedQuery);
            case 'financial_health':
                return await this.assessFinancialHealth(normalizedQuery);
            default:
                return await this.handleGeneralQuery(normalizedQuery);
        }
    }
    analyzeQueryIntent(query) {
        const intents = [
            { type: 'debt_analysis', patterns: [/\b(debt|owe|outstanding|balance|total.*debt)\b/i] },
            { type: 'loan_optimization', patterns: [/\b(loan|pay.*off|payoff|optimization|strategy)\b/i] },
            { type: 'bill_forecast', patterns: [/\b(bill|due|upcoming|forecast|predict)\b/i] },
            { type: 'spending_analysis', patterns: [/\b(spend|spending|expense|pattern|trend)\b/i] },
            { type: 'relationship_analysis', patterns: [/\b(relationship|connected|linked|associated)\b/i] },
            { type: 'interest_analysis', patterns: [/\b(interest|rate|cost.*borrowing|finance.*charge)\b/i] },
            { type: 'credit_utilization', patterns: [/\b(credit|utilization|limit|usage)\b/i] },
            { type: 'financial_health', patterns: [/\b(health|score|rating|overall|summary)\b/i] }
        ];
        for (const intent of intents) {
            if (intent.patterns.some(pattern => pattern.test(query))) {
                return { type: intent.type, confidence: 0.8 };
            }
        }
        return { type: 'general', confidence: 0.5 };
    }
    async analyzeDebtSituation(query) {
        // Analyze all debt-related accounts and transactions
        const debtAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('credit') ||
            acc.type.toLowerCase().includes('loan'));
        const totalDebt = debtAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
        const highestDebt = debtAccounts.reduce((max, acc) => Math.abs(acc.current_balance) > Math.abs(max.current_balance) ? acc : max);
        // Calculate debt-to-income ratio
        const monthlyIncome = this.calculateMonthlyIncome();
        const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;
        const analysis = {
            totalDebt,
            highestDebtAccount: highestDebt.name,
            highestDebtAmount: Math.abs(highestDebt.current_balance),
            debtToIncomeRatio,
            accountBreakdown: debtAccounts.map(acc => ({
                name: acc.name,
                balance: Math.abs(acc.current_balance),
                type: acc.type
            }))
        };
        const actionItems = [
            debtToIncomeRatio > 40 ? 'Consider debt consolidation - your debt-to-income ratio is high' : '',
            'Focus on paying off the highest interest rate debt first',
            'Consider increasing monthly payments to reduce total interest paid',
            'Track progress monthly to stay motivated'
        ].filter(item => item);
        return {
            type: 'analysis',
            content: `You have $${totalDebt.toFixed(2)} in total debt across ${debtAccounts.length} accounts. Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(1)}%.`,
            data: analysis,
            confidence: 0.9,
            actionItems
        };
    }
    async optimizeLoanPayments(query) {
        const loanAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('loan'));
        if (loanAccounts.length === 0) {
            return {
                type: 'insight',
                content: 'No loan accounts found in your financial data.',
                confidence: 0.9
            };
        }
        const optimization = {
            currentLoans: loanAccounts.map(acc => ({
                name: acc.name,
                balance: Math.abs(acc.current_balance),
                estimatedRate: this.estimateInterestRate(acc),
                monthlyPayment: this.estimateMonthlyPayment(acc)
            })),
            totalMonthlyPayments: 0,
            potentialSavings: 0,
            recommendations: []
        };
        // Calculate current total monthly payments
        optimization.totalMonthlyPayments = optimization.currentLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
        // Generate optimization recommendations
        const recommendations = [
            'Consider making extra payments toward the highest interest rate loan',
            'Refinance if you can secure a lower interest rate',
            'Consider loan consolidation if it reduces your overall rate',
            'Set up automatic payments to avoid late fees'
        ];
        optimization.recommendations = recommendations;
        return {
            type: 'recommendation',
            content: `You have ${loanAccounts.length} loans with total monthly payments of $${optimization.totalMonthlyPayments.toFixed(2)}.`,
            data: optimization,
            confidence: 0.85,
            actionItems: recommendations
        };
    }
    async forecastBillPayments(query) {
        // Analyze recurring transactions to forecast upcoming bills
        const recurringTransactions = this.identifyRecurringTransactions();
        const upcomingBills = this.forecastUpcomingBills(recurringTransactions);
        const forecast = {
            next30Days: upcomingBills.filter(bill => bill.daysUntilDue <= 30),
            next90Days: upcomingBills.filter(bill => bill.daysUntilDue <= 90),
            totalNext30Days: 0,
            totalNext90Days: 0,
            patterns: this.analyzeBillPatterns(recurringTransactions)
        };
        forecast.totalNext30Days = forecast.next30Days.reduce((sum, bill) => sum + bill.amount, 0);
        forecast.totalNext90Days = forecast.next90Days.reduce((sum, bill) => sum + bill.amount, 0);
        return {
            type: 'forecast',
            content: `You have $${forecast.totalNext30Days.toFixed(2)} in bills due in the next 30 days and $${forecast.totalNext90Days.toFixed(2)} in the next 90 days.`,
            data: forecast,
            confidence: 0.8,
            actionItems: [
                'Set up automatic payments for fixed bills',
                'Review variable bills for potential savings',
                'Create a bill calendar to track due dates'
            ]
        };
    }
    async analyzeSpendingPatterns(query) {
        const expenses = this.context.transactions.filter(t => t.amount < 0);
        const categorySpending = this.calculateCategorySpending(expenses);
        const monthlyTrends = this.calculateMonthlyTrends(expenses);
        const seasonalPatterns = this.identifySeasonalPatterns(expenses);
        const analysis = {
            totalMonthlySpending: this.calculateAverageMonthlySpending(expenses),
            topCategories: categorySpending.slice(0, 5),
            monthlyTrends,
            seasonalPatterns,
            anomalies: this.identifySpendingAnomalies(expenses)
        };
        return {
            type: 'analysis',
            content: `Your average monthly spending is $${analysis.totalMonthlySpending.toFixed(2)} with the highest expenses in ${analysis.topCategories[0]?.name || 'unknown'}.`,
            data: analysis,
            confidence: 0.9,
            actionItems: [
                'Review top spending categories for potential savings',
                'Set up budget alerts for overspending',
                'Consider automating savings to reduce discretionary spending'
            ]
        };
    }
    async analyzeFinancialRelationships(query) {
        const relationships = {
            accountPayeeConnections: this.mapAccountPayeeRelationships(),
            categoricalSpending: this.mapCategoryPayeeRelationships(),
            billAccountConnections: this.mapBillAccountRelationships(),
            networkAnalysis: this.analyzeTransactionNetwork()
        };
        return {
            type: 'insight',
            content: 'Financial relationship analysis shows your spending patterns and account usage.',
            data: relationships,
            confidence: 0.8,
            actionItems: [
                'Consolidate similar payments to reduce transaction fees',
                'Consider dedicated accounts for specific bill categories',
                'Review automated payment setups'
            ]
        };
    }
    async analyzeInterestExpenses(query) {
        const interestTransactions = this.context.transactions.filter(t => t.description?.toLowerCase().includes('interest') ||
            t.description?.toLowerCase().includes('finance charge'));
        const monthlyInterest = this.calculateMonthlyInterest(interestTransactions);
        const annualInterest = monthlyInterest * 12;
        const interestByAccount = this.groupInterestByAccount(interestTransactions);
        const analysis = {
            monthlyInterest,
            annualInterest,
            interestByAccount,
            highestInterestAccount: this.findHighestInterestAccount(interestByAccount),
            potentialSavings: this.calculatePotentialInterestSavings(interestByAccount)
        };
        return {
            type: 'calculation',
            content: `You're paying approximately $${monthlyInterest.toFixed(2)} per month in interest charges ($${annualInterest.toFixed(2)} annually).`,
            data: analysis,
            confidence: 0.85,
            actionItems: [
                'Focus on paying down high-interest debt first',
                'Consider balance transfers to lower rate cards',
                'Make more than minimum payments to reduce principal faster'
            ]
        };
    }
    async analyzeCreditUtilization(query) {
        const creditAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('credit'));
        if (creditAccounts.length === 0) {
            return {
                type: 'insight',
                content: 'No credit accounts found in your financial data.',
                confidence: 0.9
            };
        }
        const utilization = creditAccounts.map(acc => {
            // Assuming credit accounts have negative balances and we need to estimate limits
            const balance = Math.abs(acc.current_balance);
            const estimatedLimit = this.estimateCreditLimit(acc);
            const utilizationRate = estimatedLimit > 0 ? (balance / estimatedLimit) * 100 : 0;
            return {
                accountName: acc.name,
                balance,
                estimatedLimit,
                utilizationRate
            };
        });
        const averageUtilization = utilization.reduce((sum, u) => sum + u.utilizationRate, 0) / utilization.length;
        return {
            type: 'analysis',
            content: `Your average credit utilization is ${averageUtilization.toFixed(1)}%. Keeping it below 30% is recommended for good credit health.`,
            data: { utilization, averageUtilization },
            confidence: 0.8,
            actionItems: [
                averageUtilization > 30 ? 'Work on reducing credit utilization below 30%' : '',
                'Consider paying down balances before statement dates',
                'Monitor utilization monthly to maintain good credit scores'
            ].filter(item => item)
        };
    }
    async assessFinancialHealth(query) {
        const healthMetrics = {
            debtToIncomeRatio: this.calculateDebtToIncomeRatio(),
            emergencyFundCoverage: this.calculateEmergencyFundCoverage(),
            savingsRate: this.calculateSavingsRate(),
            creditUtilization: this.calculateOverallCreditUtilization(),
            budgetAdherence: this.calculateBudgetAdherence(),
            netWorth: this.calculateNetWorth()
        };
        const overallScore = this.calculateFinancialHealthScore(healthMetrics);
        const recommendations = this.generateHealthRecommendations(healthMetrics);
        return {
            type: 'analysis',
            content: `Your financial health score is ${overallScore}/100. ${overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Needs improvement'}.`,
            data: { healthMetrics, overallScore },
            confidence: 0.9,
            actionItems: recommendations
        };
    }
    async handleGeneralQuery(query) {
        return {
            type: 'insight',
            content: 'I can help you analyze your financial data in depth. Try asking about debt analysis, loan optimization, spending patterns, or financial health.',
            confidence: 0.6,
            actionItems: [
                'Ask about your debt situation for detailed analysis',
                'Request loan optimization strategies',
                'Inquire about spending patterns and trends'
            ]
        };
    }
    // Helper methods for calculations
    calculateMonthlyIncome() {
        const incomeTransactions = this.context.transactions.filter(t => t.amount > 0);
        const recent3Months = incomeTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return transactionDate >= threeMonthsAgo;
        });
        const totalIncome = recent3Months.reduce((sum, t) => sum + t.amount, 0);
        return totalIncome / 3;
    }
    estimateInterestRate(account) {
        // Simplified interest rate estimation based on account type
        if (account.type.toLowerCase().includes('credit'))
            return 0.18;
        if (account.type.toLowerCase().includes('loan'))
            return 0.06;
        return 0.05;
    }
    estimateMonthlyPayment(account) {
        const balance = Math.abs(account.current_balance);
        const rate = this.estimateInterestRate(account);
        // Simplified payment calculation
        return Math.max(balance * 0.02, 25); // Minimum 2% of balance or $25
    }
    identifyRecurringTransactions() {
        // Simplified recurring transaction identification
        const transactionGroups = new Map();
        this.context.transactions.forEach(t => {
            if (t.description) {
                const key = t.description.toLowerCase().replace(/\d+/g, '').trim();
                if (!transactionGroups.has(key)) {
                    transactionGroups.set(key, []);
                }
                transactionGroups.get(key).push(t);
            }
        });
        return Array.from(transactionGroups.entries())
            .filter(([_, transactions]) => transactions.length >= 3)
            .map(([description, transactions]) => ({
            description,
            transactions,
            frequency: this.calculateFrequency(transactions),
            averageAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
        }));
    }
    forecastUpcomingBills(recurringTransactions) {
        return recurringTransactions.map(rt => {
            const lastTransaction = rt.transactions[rt.transactions.length - 1];
            const lastDate = new Date(lastTransaction.date);
            const nextDueDate = new Date(lastDate);
            nextDueDate.setDate(nextDueDate.getDate() + rt.frequency);
            const now = new Date();
            const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                description: rt.description,
                amount: rt.averageAmount,
                daysUntilDue,
                nextDueDate
            };
        });
    }
    calculateFrequency(transactions) {
        if (transactions.length < 2)
            return 30;
        const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
        const intervals = [];
        for (let i = 1; i < dates.length; i++) {
            const interval = Math.ceil((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
            intervals.push(interval);
        }
        return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
    analyzeBillPatterns(recurringTransactions) {
        return {
            averageMonthlyBills: recurringTransactions.length,
            totalMonthlyRecurring: recurringTransactions.reduce((sum, rt) => sum + rt.averageAmount, 0),
            mostExpensiveBill: recurringTransactions.reduce((max, rt) => rt.averageAmount > max.averageAmount ? rt : max, recurringTransactions[0])
        };
    }
    calculateCategorySpending(expenses) {
        const categoryMap = new Map();
        expenses.forEach(expense => {
            if (expense.category_id) {
                const category = this.context.categories.find(c => c.category_id === expense.category_id);
                const categoryName = category ? category.name : 'Unknown';
                if (!categoryMap.has(expense.category_id)) {
                    categoryMap.set(expense.category_id, { name: categoryName, total: 0, count: 0 });
                }
                const entry = categoryMap.get(expense.category_id);
                entry.total += Math.abs(expense.amount);
                entry.count++;
            }
        });
        return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
    }
    calculateMonthlyTrends(expenses) {
        const monthlyMap = new Map();
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, 0);
            }
            monthlyMap.set(monthKey, monthlyMap.get(monthKey) + Math.abs(expense.amount));
        });
        return Array.from(monthlyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount }));
    }
    identifySeasonalPatterns(expenses) {
        const monthlyAverages = new Map();
        // Group by month (1-12)
        expenses.forEach(expense => {
            const month = new Date(expense.date).getMonth() + 1;
            if (!monthlyAverages.has(month)) {
                monthlyAverages.set(month, 0);
            }
            monthlyAverages.set(month, monthlyAverages.get(month) + Math.abs(expense.amount));
        });
        // Calculate averages
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return Array.from(monthlyAverages.entries())
            .map(([month, total]) => ({
            month: monthNames[month - 1],
            average: total / this.getMonthOccurrences(month, expenses)
        }));
    }
    getMonthOccurrences(month, expenses) {
        const years = new Set();
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            if (date.getMonth() + 1 === month) {
                years.add(date.getFullYear());
            }
        });
        return years.size || 1;
    }
    identifySpendingAnomalies(expenses) {
        const amounts = expenses.map(e => Math.abs(e.amount));
        const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);
        return expenses
            .filter(expense => Math.abs(expense.amount) > mean + (2 * stdDev))
            .map(expense => ({
            date: expense.date,
            amount: Math.abs(expense.amount),
            description: expense.description,
            deviation: Math.abs(expense.amount) - mean
        }));
    }
    calculateAverageMonthlySpending(expenses) {
        const monthlyTotals = this.calculateMonthlyTrends(expenses);
        return monthlyTotals.reduce((sum, month) => sum + month.amount, 0) / monthlyTotals.length;
    }
    mapAccountPayeeRelationships() {
        const relationships = new Map();
        this.context.transactions.forEach(t => {
            if (t.payee_id) {
                const payee = this.context.payees.find(p => p.payee_id === t.payee_id);
                const account = this.context.accounts.find(a => a.account_id === t.account_id);
                if (payee && account) {
                    const key = `${account.name}`;
                    if (!relationships.has(key)) {
                        relationships.set(key, new Set());
                    }
                    relationships.get(key).add(payee.name);
                }
            }
        });
        return Array.from(relationships.entries()).map(([account, payees]) => ({
            account,
            payees: Array.from(payees)
        }));
    }
    mapCategoryPayeeRelationships() {
        const relationships = new Map();
        this.context.transactions.forEach(t => {
            if (t.category_id && t.payee_id) {
                const category = this.context.categories.find(c => c.category_id === t.category_id);
                const payee = this.context.payees.find(p => p.payee_id === t.payee_id);
                if (category && payee) {
                    const key = category.name;
                    if (!relationships.has(key)) {
                        relationships.set(key, new Set());
                    }
                    relationships.get(key).add(payee.name);
                }
            }
        });
        return Array.from(relationships.entries()).map(([category, payees]) => ({
            category,
            payees: Array.from(payees)
        }));
    }
    mapBillAccountRelationships() {
        // This would use the bills data when available
        return [];
    }
    analyzeTransactionNetwork() {
        return {
            totalTransactions: this.context.transactions.length,
            uniquePayees: new Set(this.context.transactions.map(t => t.payee_id).filter(id => id)).size,
            accountsUsed: new Set(this.context.transactions.map(t => t.account_id)).size,
            categoriesUsed: new Set(this.context.transactions.map(t => t.category_id).filter(id => id)).size
        };
    }
    calculateMonthlyInterest(interestTransactions) {
        const recent3Months = interestTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return transactionDate >= threeMonthsAgo;
        });
        const totalInterest = recent3Months.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return totalInterest / 3;
    }
    groupInterestByAccount(interestTransactions) {
        const accountMap = new Map();
        interestTransactions.forEach(t => {
            if (!accountMap.has(t.account_id)) {
                accountMap.set(t.account_id, 0);
            }
            accountMap.set(t.account_id, accountMap.get(t.account_id) + Math.abs(t.amount));
        });
        return Array.from(accountMap.entries()).map(([accountId, total]) => {
            const account = this.context.accounts.find(a => a.account_id === accountId);
            return {
                accountName: account ? account.name : 'Unknown',
                totalInterest: total
            };
        });
    }
    findHighestInterestAccount(interestByAccount) {
        if (interestByAccount.length === 0)
            return 'None';
        return interestByAccount.reduce((max, acc) => acc.totalInterest > max.totalInterest ? acc : max).accountName;
    }
    calculatePotentialInterestSavings(interestByAccount) {
        // Simplified calculation - assumes 20% reduction with optimization
        const totalInterest = interestByAccount.reduce((sum, acc) => sum + acc.totalInterest, 0);
        return totalInterest * 0.2;
    }
    estimateCreditLimit(account) {
        // Simplified credit limit estimation
        const balance = Math.abs(account.current_balance);
        return balance * 3; // Assume current balance is roughly 30% of limit
    }
    calculateDebtToIncomeRatio() {
        const monthlyIncome = this.calculateMonthlyIncome();
        const debtAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('credit') || acc.type.toLowerCase().includes('loan'));
        const totalDebt = debtAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
        return monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;
    }
    calculateEmergencyFundCoverage() {
        const monthlyExpenses = this.calculateAverageMonthlySpending(this.context.transactions.filter(t => t.amount < 0));
        const savingsAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('saving') || acc.type.toLowerCase().includes('checking'));
        const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
        return monthlyExpenses > 0 ? totalSavings / monthlyExpenses : 0;
    }
    calculateSavingsRate() {
        const monthlyIncome = this.calculateMonthlyIncome();
        const monthlyExpenses = this.calculateAverageMonthlySpending(this.context.transactions.filter(t => t.amount < 0));
        return monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    }
    calculateOverallCreditUtilization() {
        const creditAccounts = this.context.accounts.filter(acc => acc.type.toLowerCase().includes('credit'));
        if (creditAccounts.length === 0)
            return 0;
        const totalBalance = creditAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
        const totalLimit = creditAccounts.reduce((sum, acc) => sum + this.estimateCreditLimit(acc), 0);
        return totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    }
    calculateBudgetAdherence() {
        // Simplified budget adherence calculation
        // This would need actual budget data to be accurate
        return 75; // Placeholder
    }
    calculateNetWorth() {
        return this.context.accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    }
    calculateFinancialHealthScore(metrics) {
        let score = 0;
        let components = 0;
        // Debt-to-income ratio (0-25 points)
        if (metrics.debtToIncomeRatio <= 20)
            score += 25;
        else if (metrics.debtToIncomeRatio <= 36)
            score += 15;
        else if (metrics.debtToIncomeRatio <= 50)
            score += 10;
        components++;
        // Emergency fund (0-25 points)
        if (metrics.emergencyFundCoverage >= 6)
            score += 25;
        else if (metrics.emergencyFundCoverage >= 3)
            score += 15;
        else if (metrics.emergencyFundCoverage >= 1)
            score += 10;
        components++;
        // Savings rate (0-25 points)
        if (metrics.savingsRate >= 20)
            score += 25;
        else if (metrics.savingsRate >= 10)
            score += 15;
        else if (metrics.savingsRate >= 5)
            score += 10;
        components++;
        // Credit utilization (0-25 points)
        if (metrics.creditUtilization <= 10)
            score += 25;
        else if (metrics.creditUtilization <= 30)
            score += 15;
        else if (metrics.creditUtilization <= 50)
            score += 10;
        components++;
        return Math.round(score);
    }
    generateHealthRecommendations(metrics) {
        const recommendations = [];
        if (metrics.debtToIncomeRatio > 36) {
            recommendations.push('Focus on debt reduction - your debt-to-income ratio is high');
        }
        if (metrics.emergencyFundCoverage < 3) {
            recommendations.push('Build emergency fund to cover 3-6 months of expenses');
        }
        if (metrics.savingsRate < 10) {
            recommendations.push('Increase savings rate to at least 10% of income');
        }
        if (metrics.creditUtilization > 30) {
            recommendations.push('Reduce credit utilization below 30%');
        }
        return recommendations;
    }
    updateContext(newContext) {
        this.context = newContext;
    }
}
exports.CodeLlamaProcessor = CodeLlamaProcessor;
