"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProcessor = void 0;
const Transaction_1 = require("../../data-storage/models/Transaction");
class QueryProcessor {
    constructor(context) {
        this.context = context;
    }
    async processQuery(query) {
        const normalizedQuery = query.toLowerCase().trim();
        try {
            // Pattern matching for different query types
            if (this.isSpendingQuery(normalizedQuery)) {
                return this.handleSpendingQuery(normalizedQuery);
            }
            if (this.isIncomeQuery(normalizedQuery)) {
                return this.handleIncomeQuery(normalizedQuery);
            }
            if (this.isCategoryQuery(normalizedQuery)) {
                return this.handleCategoryQuery(normalizedQuery);
            }
            if (this.isTrendQuery(normalizedQuery)) {
                return this.handleTrendQuery(normalizedQuery);
            }
            if (this.isTransactionSearchQuery(normalizedQuery)) {
                return this.handleTransactionSearchQuery(normalizedQuery);
            }
            if (this.isBudgetQuery(normalizedQuery)) {
                return this.handleBudgetQuery(normalizedQuery);
            }
            if (this.isAccountQuery(normalizedQuery)) {
                return this.handleAccountQuery(normalizedQuery);
            }
            // Default fallback
            return this.handleGeneralQuery(normalizedQuery);
        }
        catch (error) {
            return {
                type: 'text',
                content: 'I encountered an error processing your query. Please try rephrasing it.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    isSpendingQuery(query) {
        return query.includes('spend') || query.includes('spent') || query.includes('expense');
    }
    isIncomeQuery(query) {
        return query.includes('income') || query.includes('earned') || query.includes('salary') || query.includes('wages');
    }
    isCategoryQuery(query) {
        return query.includes('category') || query.includes('categories');
    }
    isTrendQuery(query) {
        return query.includes('trend') || query.includes('over time') || query.includes('pattern');
    }
    isTransactionSearchQuery(query) {
        return query.includes('transaction') || query.includes('above') || query.includes('below') || query.includes('find');
    }
    isBudgetQuery(query) {
        return query.includes('budget') || query.includes('overspend') || query.includes('under budget');
    }
    isAccountQuery(query) {
        return query.includes('account') || query.includes('balance');
    }
    handleSpendingQuery(query) {
        const timeFrame = this.extractTimeFrame(query);
        const category = this.extractCategory(query);
        const amount = this.extractAmount(query);
        let filteredTransactions = this.context.transactions.filter(t => t.transaction_type === Transaction_1.TransactionType.EXPENSE);
        // Apply time filter
        if (timeFrame) {
            filteredTransactions = this.filterByTimeFrame(filteredTransactions, timeFrame);
        }
        // Apply category filter
        if (category) {
            filteredTransactions = filteredTransactions.filter(t => t.category_id === category.category_id);
        }
        // Apply amount filter
        if (amount) {
            filteredTransactions = filteredTransactions.filter(t => {
                if (amount.operator === 'above' || amount.operator === '>') {
                    return t.amount > amount.value;
                }
                else if (amount.operator === 'below' || amount.operator === '<') {
                    return t.amount < amount.value;
                }
                return true;
            });
        }
        const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        // Generate response
        let content = `You spent ${this.formatCurrency(totalSpent)}`;
        if (timeFrame) {
            content += ` ${timeFrame.description}`;
        }
        if (category) {
            content += ` on ${category.name}`;
        }
        content += '.';
        // Add breakdown if no specific category was requested
        if (!category && filteredTransactions.length > 0) {
            const categoryBreakdown = this.getCategoryBreakdown(filteredTransactions);
            content += ' Here\'s the breakdown by category:';
            return {
                type: 'summary',
                content,
                data: {
                    total: totalSpent,
                    categories: categoryBreakdown,
                    transactionCount: filteredTransactions.length
                }
            };
        }
        return {
            type: 'text',
            content,
            data: {
                total: totalSpent,
                transactionCount: filteredTransactions.length
            }
        };
    }
    handleIncomeQuery(query) {
        const timeFrame = this.extractTimeFrame(query);
        let filteredTransactions = this.context.transactions.filter(t => t.transaction_type === Transaction_1.TransactionType.INCOME);
        if (timeFrame) {
            filteredTransactions = this.filterByTimeFrame(filteredTransactions, timeFrame);
        }
        const totalIncome = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        let content = `Your total income is ${this.formatCurrency(totalIncome)}`;
        if (timeFrame) {
            content += ` ${timeFrame.description}`;
        }
        content += '.';
        // Add income source breakdown
        const sources = this.getIncomeSourceBreakdown(filteredTransactions);
        return {
            type: 'summary',
            content,
            data: {
                totalIncome,
                sources,
                transactionCount: filteredTransactions.length
            }
        };
    }
    handleCategoryQuery(query) {
        const timeFrame = this.extractTimeFrame(query);
        let filteredTransactions = this.context.transactions.filter(t => t.transaction_type === Transaction_1.TransactionType.EXPENSE);
        if (timeFrame) {
            filteredTransactions = this.filterByTimeFrame(filteredTransactions, timeFrame);
        }
        const categoryBreakdown = this.getCategoryBreakdown(filteredTransactions);
        let content = `Here's your spending breakdown by category`;
        if (timeFrame) {
            content += ` ${timeFrame.description}`;
        }
        content += ':';
        return {
            type: 'summary',
            content,
            data: {
                categories: categoryBreakdown,
                total: filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
            }
        };
    }
    handleTrendQuery(query) {
        const timeFrame = this.extractTimeFrame(query) || { months: 6, description: 'over the last 6 months' };
        const monthlyData = this.getMonthlyTrend(timeFrame.months || 6);
        return {
            type: 'chart',
            content: `Here's your spending trend ${timeFrame.description}:`,
            data: {
                labels: monthlyData.map(d => d.month),
                spending: monthlyData.map(d => d.spending),
                income: monthlyData.map(d => d.income)
            }
        };
    }
    handleTransactionSearchQuery(query) {
        const amount = this.extractAmount(query);
        const timeFrame = this.extractTimeFrame(query);
        const category = this.extractCategory(query);
        let filteredTransactions = this.context.transactions;
        if (amount) {
            filteredTransactions = filteredTransactions.filter(t => {
                if (amount.operator === 'above' || amount.operator === '>') {
                    return t.amount > amount.value;
                }
                else if (amount.operator === 'below' || amount.operator === '<') {
                    return t.amount < amount.value;
                }
                return true;
            });
        }
        if (timeFrame) {
            filteredTransactions = this.filterByTimeFrame(filteredTransactions, timeFrame);
        }
        if (category) {
            filteredTransactions = filteredTransactions.filter(t => t.category_id === category.category_id);
        }
        // Sort by amount (descending)
        filteredTransactions.sort((a, b) => b.amount - a.amount);
        // Take top 10
        const topTransactions = filteredTransactions.slice(0, 10);
        let content = 'Here are the transactions matching your criteria:';
        return {
            type: 'table',
            content,
            data: {
                transactions: topTransactions.map(t => ({
                    id: t.transaction_id,
                    date: t.date,
                    description: t.description || 'No description',
                    amount: t.amount,
                    category: this.getCategoryName(t.category_id),
                    account: this.getAccountName(t.account_id)
                }))
            }
        };
    }
    handleBudgetQuery(query) {
        // This would integrate with budget data once available
        return {
            type: 'text',
            content: 'Budget analysis is not yet implemented. Please check back soon!'
        };
    }
    handleAccountQuery(query) {
        const accountBalances = this.context.accounts.map(account => ({
            name: account.name,
            type: account.type,
            balance: account.current_balance
        }));
        const totalBalance = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);
        return {
            type: 'summary',
            content: `Your total account balance is ${this.formatCurrency(totalBalance)}. Here's the breakdown:`,
            data: {
                totalBalance,
                accounts: accountBalances
            }
        };
    }
    handleGeneralQuery(query) {
        const suggestions = [
            'How much did I spend on groceries last month?',
            'What\'s my total income for this year?',
            'Show me my largest expenses this month',
            'What\'s my spending trend over the last 6 months?',
            'Which categories am I spending the most on?'
        ];
        return {
            type: 'text',
            content: 'I can help you analyze your financial data. Here are some things you can ask me:',
            data: {
                suggestions
            }
        };
    }
    extractTimeFrame(query) {
        // Month patterns
        if (query.includes('last month') || query.includes('past month')) {
            return { months: 1, description: 'last month' };
        }
        if (query.includes('this month')) {
            return { months: 0, description: 'this month' };
        }
        if (query.includes('last 3 months')) {
            return { months: 3, description: 'over the last 3 months' };
        }
        if (query.includes('last 6 months')) {
            return { months: 6, description: 'over the last 6 months' };
        }
        if (query.includes('this year')) {
            return { months: 12, description: 'this year' };
        }
        // Week patterns
        if (query.includes('last week') || query.includes('past week')) {
            return { days: 7, description: 'last week' };
        }
        if (query.includes('this week')) {
            return { days: 0, description: 'this week' };
        }
        return null;
    }
    extractCategory(query) {
        // Try to match category names in the query
        for (const category of this.context.categories) {
            const categoryName = category.name.toLowerCase();
            if (query.includes(categoryName)) {
                return category;
            }
            // Check for common aliases
            const aliases = this.getCategoryAliases(categoryName);
            for (const alias of aliases) {
                if (query.includes(alias)) {
                    return category;
                }
            }
        }
        return null;
    }
    getCategoryAliases(categoryName) {
        const aliases = {
            'food': ['grocery', 'groceries', 'supermarket', 'restaurant', 'dining'],
            'transportation': ['gas', 'fuel', 'car', 'auto', 'uber', 'taxi'],
            'entertainment': ['movie', 'netflix', 'games', 'music'],
            'shopping': ['amazon', 'clothes', 'clothing', 'retail'],
            'utilities': ['electric', 'water', 'internet', 'phone', 'cable'],
            'healthcare': ['medical', 'doctor', 'hospital', 'pharmacy']
        };
        return aliases[categoryName] || [];
    }
    extractAmount(query) {
        // Look for patterns like "above $100", "over 50", "more than $200"
        const abovePatterns = [
            /above \$?(\d+(?:\.\d{2})?)/,
            /over \$?(\d+(?:\.\d{2})?)/,
            /more than \$?(\d+(?:\.\d{2})?)/,
            /greater than \$?(\d+(?:\.\d{2})?)/,
            />\s*\$?(\d+(?:\.\d{2})?)/
        ];
        const belowPatterns = [
            /below \$?(\d+(?:\.\d{2})?)/,
            /under \$?(\d+(?:\.\d{2})?)/,
            /less than \$?(\d+(?:\.\d{2})?)/,
            /<\s*\$?(\d+(?:\.\d{2})?)/
        ];
        for (const pattern of abovePatterns) {
            const match = query.match(pattern);
            if (match) {
                return { value: parseFloat(match[1]), operator: 'above' };
            }
        }
        for (const pattern of belowPatterns) {
            const match = query.match(pattern);
            if (match) {
                return { value: parseFloat(match[1]), operator: 'below' };
            }
        }
        return null;
    }
    filterByTimeFrame(transactions, timeFrame) {
        const now = new Date();
        let startDate;
        if (timeFrame.months !== undefined) {
            if (timeFrame.months === 0) {
                // This month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            else {
                // Last N months
                startDate = new Date(now.getFullYear(), now.getMonth() - timeFrame.months, 1);
            }
        }
        else if (timeFrame.days !== undefined) {
            if (timeFrame.days === 0) {
                // This week
                const dayOfWeek = now.getDay();
                startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
            }
            else {
                // Last N days
                startDate = new Date(now.getTime() - (timeFrame.days * 24 * 60 * 60 * 1000));
            }
        }
        else {
            return transactions;
        }
        return transactions.filter(t => new Date(t.date) >= startDate);
    }
    getCategoryBreakdown(transactions) {
        const categoryMap = new Map();
        for (const transaction of transactions) {
            const categoryId = transaction.category_id;
            const categoryName = this.getCategoryName(categoryId);
            if (!categoryMap.has(categoryId || 0)) {
                categoryMap.set(categoryId || 0, {
                    name: categoryName,
                    amount: 0,
                    count: 0
                });
            }
            const entry = categoryMap.get(categoryId || 0);
            entry.amount += transaction.amount;
            entry.count++;
        }
        return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
    }
    getIncomeSourceBreakdown(transactions) {
        const sourceMap = new Map();
        for (const transaction of transactions) {
            const source = transaction.description || 'Unknown';
            sourceMap.set(source, (sourceMap.get(source) || 0) + transaction.amount);
        }
        return Array.from(sourceMap.entries())
            .map(([source, amount]) => ({ source, amount }))
            .sort((a, b) => b.amount - a.amount);
    }
    getMonthlyTrend(months) {
        const now = new Date();
        const result = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toLocaleString('default', { month: 'short' });
            const monthTransactions = this.context.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
            });
            const spending = monthTransactions
                .filter(t => t.transaction_type === Transaction_1.TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);
            const income = monthTransactions
                .filter(t => t.transaction_type === Transaction_1.TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);
            result.push({ month: monthStr, spending, income });
        }
        return result;
    }
    getCategoryName(categoryId) {
        if (!categoryId)
            return 'Uncategorized';
        const category = this.context.categories.find(c => c.category_id === categoryId);
        return category ? category.name : 'Unknown Category';
    }
    getAccountName(accountId) {
        const account = this.context.accounts.find(a => a.account_id === accountId);
        return account ? account.name : 'Unknown Account';
    }
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
}
exports.QueryProcessor = QueryProcessor;
//# sourceMappingURL=QueryProcessor.js.map