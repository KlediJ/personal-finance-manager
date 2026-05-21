"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Get environment information
    getEnvironment: () => electron_1.ipcRenderer.invoke('app:getEnvironment')
});
electron_1.contextBridge.exposeInMainWorld('api', {
    accounts: {
        getAll: () => electron_1.ipcRenderer.invoke('accounts:getAll'),
        getActive: () => electron_1.ipcRenderer.invoke('accounts:getActive'),
        getById: (id) => electron_1.ipcRenderer.invoke('accounts:getById', id),
        create: (account) => electron_1.ipcRenderer.invoke('accounts:create', account),
        update: (id, account) => electron_1.ipcRenderer.invoke('accounts:update', id, account),
        delete: (id) => electron_1.ipcRenderer.invoke('accounts:delete', id),
        getTotalBalance: () => electron_1.ipcRenderer.invoke('accounts:getTotalBalance'),
        getDetails: (accountId) => electron_1.ipcRenderer.invoke('accounts:getDetails', accountId),
        saveDetails: (details) => electron_1.ipcRenderer.invoke('accounts:saveDetails', details)
    },
    transactions: {
        getAll: () => electron_1.ipcRenderer.invoke('transactions:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('transactions:getById', id),
        getByAccountId: (accountId) => electron_1.ipcRenderer.invoke('transactions:getByAccountId', accountId),
        getByDateRange: (startDate, endDate) => electron_1.ipcRenderer.invoke('transactions:getByDateRange', startDate, endDate),
        getRecent: (limit) => electron_1.ipcRenderer.invoke('transactions:getRecent', limit),
        searchByDescription: (term) => electron_1.ipcRenderer.invoke('transactions:searchByDescription', term),
        create: (transaction) => electron_1.ipcRenderer.invoke('transactions:create', transaction),
        update: (id, transaction) => electron_1.ipcRenderer.invoke('transactions:update', id, transaction),
        delete: (id) => electron_1.ipcRenderer.invoke('transactions:delete', id),
        bulkDelete: (ids) => electron_1.ipcRenderer.invoke('transactions:bulkDelete', ids),
        getByCategory: (categoryId) => electron_1.ipcRenderer.invoke('transactions:getByCategory', categoryId),
        getByType: (type) => electron_1.ipcRenderer.invoke('transactions:getByType', type),
        getByStatus: (status) => electron_1.ipcRenderer.invoke('transactions:getByStatus', status),
        getPendingTransferReview: () => electron_1.ipcRenderer.invoke('transactions:getPendingTransferReview'),
        setPendingTransferReview: (transactionId, pending) => electron_1.ipcRenderer.invoke('transactions:setPendingTransferReview', transactionId, pending),
        getMonthlyActivity: (month, accountId) => electron_1.ipcRenderer.invoke('transactions:getMonthlyActivity', month, accountId),
        autoCategorizeMonth: (month, accountId) => electron_1.ipcRenderer.invoke('transactions:autoCategorizeMonth', month, accountId),
        createTransfer: (fromAccountId, toAccountId, amount, description, date) => electron_1.ipcRenderer.invoke('transactions:createTransfer', fromAccountId, toAccountId, amount, description, date),
        convertPendingTransfer: (transactionId, fromAccountId, toAccountId) => electron_1.ipcRenderer.invoke('transactions:convertPendingTransfer', transactionId, fromAccountId, toAccountId),
        recalculateBalances: () => electron_1.ipcRenderer.invoke('transactions:recalculateBalances'),
        bulkAssignPayee: (transactionIds, payeeId) => electron_1.ipcRenderer.invoke('transactions:bulkAssignPayee', transactionIds, payeeId),
        autoAssignPayees: () => electron_1.ipcRenderer.invoke('transactions:autoAssignPayees'),
        backfillPayees: () => electron_1.ipcRenderer.invoke('transactions:backfillPayees')
    },
    categories: {
        getAll: () => electron_1.ipcRenderer.invoke('categories:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('categories:getById', id),
        getByType: (type) => electron_1.ipcRenderer.invoke('categories:getByType', type),
        getParents: () => electron_1.ipcRenderer.invoke('categories:getParents'),
        getSubcategories: (parentId) => electron_1.ipcRenderer.invoke('categories:getSubcategories', parentId),
        getHierarchy: () => electron_1.ipcRenderer.invoke('categories:getHierarchy'),
        create: (category) => electron_1.ipcRenderer.invoke('categories:create', category),
        update: (id, category) => electron_1.ipcRenderer.invoke('categories:update', id, category),
        delete: (id) => electron_1.ipcRenderer.invoke('categories:delete', id),
        bulkDelete: (ids) => electron_1.ipcRenderer.invoke('categories:bulkDelete', ids)
    },
    payees: {
        getAll: () => electron_1.ipcRenderer.invoke('payees:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('payees:getById', id),
        create: (payee) => electron_1.ipcRenderer.invoke('payees:create', payee),
        update: (id, payee) => electron_1.ipcRenderer.invoke('payees:update', id, payee),
        delete: (id) => electron_1.ipcRenderer.invoke('payees:delete', id),
        bulkDelete: (ids) => electron_1.ipcRenderer.invoke('payees:bulkDelete', ids),
        getEnhanced: () => electron_1.ipcRenderer.invoke('payees:getEnhanced'),
        createIfNotExists: (payee) => electron_1.ipcRenderer.invoke('payees:createIfNotExists', payee)
    },
    database: {
        // You can add database diagnostic methods here in the future
        getStats: () => "SQLite database is active"
    },
    budgets: {
        getAll: () => electron_1.ipcRenderer.invoke('budgets:getAll'),
        getAllWithCategories: () => electron_1.ipcRenderer.invoke('budgets:getAllWithCategories'),
        getById: (id) => electron_1.ipcRenderer.invoke('budgets:getById', id),
        getByPeriod: (period) => electron_1.ipcRenderer.invoke('budgets:getByPeriod', period),
        getByDateRange: (startDate, endDate) => electron_1.ipcRenderer.invoke('budgets:getByDateRange', startDate, endDate),
        getByCategory: (categoryId) => electron_1.ipcRenderer.invoke('budgets:getByCategory', categoryId),
        getCurrentBudgets: () => electron_1.ipcRenderer.invoke('budgets:getCurrentBudgets'),
        getCurrentBudgetsWithCategories: () => electron_1.ipcRenderer.invoke('budgets:getCurrentBudgetsWithCategories'),
        getBudgetProgress: (date) => electron_1.ipcRenderer.invoke('budgets:getBudgetProgress', date),
        create: (budget) => electron_1.ipcRenderer.invoke('budgets:create', budget),
        update: (id, budget) => electron_1.ipcRenderer.invoke('budgets:update', id, budget),
        delete: (id) => electron_1.ipcRenderer.invoke('budgets:delete', id)
    },
    // Import/Export operations
    import: {
        // File selection dialog
        showFileDialog: (options) => electron_1.ipcRenderer.invoke('import:showFileDialog', options),
        // File parsing
        parseCSV: (filePath) => electron_1.ipcRenderer.invoke('import:parseCSV', filePath),
        parseExcel: (filePath) => electron_1.ipcRenderer.invoke('import:parseExcel', filePath),
        // Data validation and import
        validateTransactions: (data, mappings) => electron_1.ipcRenderer.invoke('import:validateTransactions', data, mappings),
        saveTransactions: (transactions) => electron_1.ipcRenderer.invoke('import:saveTransactions', transactions)
    },
    export: {
        // File save dialog
        showSaveDialog: (options) => electron_1.ipcRenderer.invoke('export:showSaveDialog', options),
        // Export generation
        transactionsToCSV: (options) => electron_1.ipcRenderer.invoke('export:transactionsToCSV', options),
        transactionsToExcel: (options) => electron_1.ipcRenderer.invoke('export:transactionsToExcel', options)
    },
    // AI Services
    ai: {
        // Status and initialization
        getStatus: () => electron_1.ipcRenderer.invoke('ai:getStatus'),
        updateContext: () => electron_1.ipcRenderer.invoke('ai:updateContext'),
        clearModels: () => electron_1.ipcRenderer.invoke('ai:clearModels'),
        // Model Management
        preloadModels: () => electron_1.ipcRenderer.invoke('ai:preloadModels'),
        getModelStatus: () => electron_1.ipcRenderer.invoke('ai:getModelStatus'),
        loadModel: (modelName) => electron_1.ipcRenderer.invoke('ai:loadModel', modelName),
        unloadModel: (modelName) => electron_1.ipcRenderer.invoke('ai:unloadModel', modelName),
        // Transaction categorization
        categorizeTransaction: (transaction) => electron_1.ipcRenderer.invoke('ai:categorizeTransaction', transaction),
        batchCategorizeTransactions: (transactions) => electron_1.ipcRenderer.invoke('ai:batchCategorizeTransactions', transactions),
        learnFromFeedback: (feedback) => electron_1.ipcRenderer.invoke('ai:learnFromFeedback', feedback),
        addCategorizationRule: (payload) => electron_1.ipcRenderer.invoke('ai:addCategorizationRule', payload),
        // Query processing
        processQuery: (query) => electron_1.ipcRenderer.invoke('ai:processQuery', query),
        // Financial Analysis
        analyzeFinancialHealth: () => electron_1.ipcRenderer.invoke('ai:analyzeFinancialHealth'),
        optimizeLoans: () => electron_1.ipcRenderer.invoke('ai:optimizeLoans'),
        forecastBills: () => electron_1.ipcRenderer.invoke('ai:forecastBills'),
        // Smart Automation
        createPayeeFromTransaction: (transaction) => electron_1.ipcRenderer.invoke('ai:createPayeeFromTransaction', transaction),
        // Data helpers
        getUncategorizedTransactions: () => electron_1.ipcRenderer.invoke('ai:getUncategorizedTransactions'),
        getStatistics: () => electron_1.ipcRenderer.invoke('ai:getStatistics'),
        // Progress listeners
        onCategorizationProgress: (callback) => {
            electron_1.ipcRenderer.on('ai:categorization-progress', (event, progress) => callback(progress));
        },
        removeCategorizationProgressListener: () => {
            electron_1.ipcRenderer.removeAllListeners('ai:categorization-progress');
        }
    },
    // Bills Management
    bills: {
        getAll: () => electron_1.ipcRenderer.invoke('bills:getAll'),
        getActive: () => electron_1.ipcRenderer.invoke('bills:getActive'),
        getById: (id) => electron_1.ipcRenderer.invoke('bills:getById', id),
        create: (bill) => electron_1.ipcRenderer.invoke('bills:create', bill),
        update: (id, bill) => electron_1.ipcRenderer.invoke('bills:update', id, bill),
        delete: (id) => electron_1.ipcRenderer.invoke('bills:delete', id),
        getByPayee: (payeeId) => electron_1.ipcRenderer.invoke('bills:getByPayee', payeeId),
        getByAccount: (accountId) => electron_1.ipcRenderer.invoke('bills:getByAccount', accountId),
        getUpcoming: (daysAhead) => electron_1.ipcRenderer.invoke('bills:getUpcoming', daysAhead),
        getWithSummary: () => electron_1.ipcRenderer.invoke('bills:getWithSummary'),
        getOverdue: () => electron_1.ipcRenderer.invoke('bills:getOverdue')
    },
    // Bill Payments
    billPayments: {
        getAll: () => electron_1.ipcRenderer.invoke('billPayments:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('billPayments:getById', id),
        create: (payment) => electron_1.ipcRenderer.invoke('billPayments:create', payment),
        update: (id, payment) => electron_1.ipcRenderer.invoke('billPayments:update', id, payment),
        delete: (id) => electron_1.ipcRenderer.invoke('billPayments:delete', id),
        getByBill: (billId) => electron_1.ipcRenderer.invoke('billPayments:getByBill', billId),
        getOverdue: () => electron_1.ipcRenderer.invoke('billPayments:getOverdue'),
        getUpcoming: (daysAhead) => electron_1.ipcRenderer.invoke('billPayments:getUpcoming', daysAhead),
        markPaid: (paymentId, transactionId, amountPaid) => electron_1.ipcRenderer.invoke('billPayments:markPaid', paymentId, transactionId, amountPaid),
        markOverdue: (paymentId, daysLate, lateFee) => electron_1.ipcRenderer.invoke('billPayments:markOverdue', paymentId, daysLate, lateFee)
    },
    // Loans Management
    loans: {
        getAll: () => electron_1.ipcRenderer.invoke('loans:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('loans:getById', id),
        create: (loan) => electron_1.ipcRenderer.invoke('loans:create', loan),
        update: (id, loan) => electron_1.ipcRenderer.invoke('loans:update', id, loan),
        delete: (id) => electron_1.ipcRenderer.invoke('loans:delete', id),
        getByAccount: (accountId) => electron_1.ipcRenderer.invoke('loans:getByAccount', accountId),
        getByType: (loanType) => electron_1.ipcRenderer.invoke('loans:getByType', loanType),
        getActiveLoan: (accountId) => electron_1.ipcRenderer.invoke('loans:getActiveLoan', accountId),
        getWithSummary: () => electron_1.ipcRenderer.invoke('loans:getWithSummary'),
        updateBalance: (loanId, newBalance) => electron_1.ipcRenderer.invoke('loans:updateBalance', loanId, newBalance),
        generateAmortizationSchedule: (loanId) => electron_1.ipcRenderer.invoke('loans:generateAmortizationSchedule', loanId)
    },
    // Amortization Schedule
    amortization: {
        getAll: () => electron_1.ipcRenderer.invoke('amortization:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('amortization:getById', id),
        create: (schedule) => electron_1.ipcRenderer.invoke('amortization:create', schedule),
        update: (id, schedule) => electron_1.ipcRenderer.invoke('amortization:update', id, schedule),
        delete: (id) => electron_1.ipcRenderer.invoke('amortization:delete', id),
        getByLoan: (loanId) => electron_1.ipcRenderer.invoke('amortization:getByLoan', loanId),
        getActualPayments: (loanId) => electron_1.ipcRenderer.invoke('amortization:getActualPayments', loanId),
        markPaymentActual: (scheduleId, transactionId) => electron_1.ipcRenderer.invoke('amortization:markPaymentActual', scheduleId, transactionId),
        bulkInsert: (scheduleItems) => electron_1.ipcRenderer.invoke('amortization:bulkInsert', scheduleItems)
    },
    // Interest Expenses
    interest: {
        getAll: () => electron_1.ipcRenderer.invoke('interest:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('interest:getById', id),
        create: (expense) => electron_1.ipcRenderer.invoke('interest:create', expense),
        update: (id, expense) => electron_1.ipcRenderer.invoke('interest:update', id, expense),
        delete: (id) => electron_1.ipcRenderer.invoke('interest:delete', id),
        getByAccount: (accountId) => electron_1.ipcRenderer.invoke('interest:getByAccount', accountId),
        getByType: (expenseType) => electron_1.ipcRenderer.invoke('interest:getByType', expenseType),
        getByDateRange: (startDate, endDate) => electron_1.ipcRenderer.invoke('interest:getByDateRange', startDate, endDate),
        getWithSummary: () => electron_1.ipcRenderer.invoke('interest:getWithSummary'),
        getTotalByAccount: (accountId, year) => electron_1.ipcRenderer.invoke('interest:getTotalByAccount', accountId, year),
        getTotalByType: (expenseType, year) => electron_1.ipcRenderer.invoke('interest:getTotalByType', expenseType, year),
        getMonthlyTrend: (accountId, months) => electron_1.ipcRenderer.invoke('interest:getMonthlyTrend', accountId, months),
        getCreditCardAnalysis: (accountId) => electron_1.ipcRenderer.invoke('interest:getCreditCardAnalysis', accountId),
        recordExpense: (params) => electron_1.ipcRenderer.invoke('interest:recordExpense', params)
    }
});
