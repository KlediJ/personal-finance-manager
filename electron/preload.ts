import { contextBridge, ipcRenderer } from 'electron';
import { Account } from '../src/data-storage/models/Account';
import { Transaction } from '../src/data-storage/models/Transaction';
import { Category } from '../src/data-storage/models/Category';
import { Payee } from '../src/data-storage/models/Payee';
import { Budget } from '../src/data-storage/models/Budget';
import { RecurringBill, BillPayment } from '../src/data-storage/models/RecurringBill';
import { LoanDetails, AmortizationSchedule } from '../src/data-storage/models/LoanDetails';
import { InterestExpense, InterestExpenseType } from '../src/data-storage/models/InterestExpense';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get environment information
  getEnvironment: () => ipcRenderer.invoke('app:getEnvironment')
});

contextBridge.exposeInMainWorld('api', {
  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getActive: () => ipcRenderer.invoke('accounts:getActive'),
    getById: (id: number) => ipcRenderer.invoke('accounts:getById', id),
    create: (account: Account) => ipcRenderer.invoke('accounts:create', account),
    update: (id: number, account: Account) => ipcRenderer.invoke('accounts:update', id, account),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
    getTotalBalance: () => ipcRenderer.invoke('accounts:getTotalBalance'),
    getDetails: (accountId: number) =>
      ipcRenderer.invoke('accounts:getDetails', accountId),
    saveDetails: (details: any) =>
      ipcRenderer.invoke('accounts:saveDetails', details)
  },
  transactions: {
    getAll: () => ipcRenderer.invoke('transactions:getAll'),
    getById: (id: number) => ipcRenderer.invoke('transactions:getById', id),
    getByAccountId: (accountId: number) => ipcRenderer.invoke('transactions:getByAccountId', accountId),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('transactions:getByDateRange', startDate, endDate),
    getRecent: (limit: number) => ipcRenderer.invoke('transactions:getRecent', limit),
    searchByDescription: (term: string) => ipcRenderer.invoke('transactions:searchByDescription', term),
    create: (transaction: Transaction) => ipcRenderer.invoke('transactions:create', transaction),
    update: (id: number, transaction: Transaction) => 
      ipcRenderer.invoke('transactions:update', id, transaction),
    delete: (id: number) => ipcRenderer.invoke('transactions:delete', id),
    bulkDelete: (ids: number[]) => ipcRenderer.invoke('transactions:bulkDelete', ids),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('transactions:getByCategory', categoryId),
    getByType: (type: string) => ipcRenderer.invoke('transactions:getByType', type),
    getByStatus: (status: string) => ipcRenderer.invoke('transactions:getByStatus', status),
    getMonthlyActivity: (month: string, accountId?: number) => 
      ipcRenderer.invoke('transactions:getMonthlyActivity', month, accountId),
    autoCategorizeMonth: (month: string, accountId?: number) =>
      ipcRenderer.invoke('transactions:autoCategorizeMonth', month, accountId),
    createTransfer: (fromAccountId: number, toAccountId: number, amount: number, description?: string, date?: string) => 
      ipcRenderer.invoke('transactions:createTransfer', fromAccountId, toAccountId, amount, description, date),
    recalculateBalances: () => ipcRenderer.invoke('transactions:recalculateBalances'),
    bulkAssignPayee: (transactionIds: number[], payeeId: number) => 
      ipcRenderer.invoke('transactions:bulkAssignPayee', transactionIds, payeeId),
    autoAssignPayees: () => ipcRenderer.invoke('transactions:autoAssignPayees'),
    backfillPayees: () => ipcRenderer.invoke('transactions:backfillPayees')
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    getById: (id: number) => ipcRenderer.invoke('categories:getById', id),
    getByType: (type: string) => ipcRenderer.invoke('categories:getByType', type),
    getParents: () => ipcRenderer.invoke('categories:getParents'),
    getSubcategories: (parentId: number) => ipcRenderer.invoke('categories:getSubcategories', parentId),
    getHierarchy: () => ipcRenderer.invoke('categories:getHierarchy'),
    create: (category: Category) => ipcRenderer.invoke('categories:create', category),
    update: (id: number, category: Category) => ipcRenderer.invoke('categories:update', id, category),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },

  debug: {
    getCategories: () => ipcRenderer.invoke('debug:getCategories'),
    migrateCategories: () => ipcRenderer.invoke('debug:migrateCategories'),
    seedFeedbackFromWF: () => ipcRenderer.invoke('debug:seedFeedbackFromWF')
  },

  payees: {
    getAll: () => {
      console.log('Preload: Calling payees:getAll');
      return ipcRenderer.invoke('payees:getAll');
    },
    getById: (id: number) => {
      console.log('Preload: Calling payees:getById', id);
      return ipcRenderer.invoke('payees:getById', id);
    },
    create: (payee: Payee) => {
      console.log('Preload: Calling payees:create', payee);
      return ipcRenderer.invoke('payees:create', payee);
    },
    update: (id: number, payee: Payee) => {
      console.log('Preload: Calling payees:update', id, payee);
      return ipcRenderer.invoke('payees:update', id, payee);
    },
    delete: (id: number) => {
      console.log('Preload: Calling payees:delete', id);
      return ipcRenderer.invoke('payees:delete', id);
    },
    bulkDelete: (ids: number[]) => {
      console.log('Preload: Calling payees:bulkDelete', ids);
      return ipcRenderer.invoke('payees:bulkDelete', ids);
    },
    getEnhanced: () => {
      console.log('Preload: Calling payees:getEnhanced');
      return ipcRenderer.invoke('payees:getEnhanced');
    },
    createIfNotExists: (payee: Payee) => {
      console.log('Preload: Calling payees:createIfNotExists', payee);
      return ipcRenderer.invoke('payees:createIfNotExists', payee);
    }
  },
  
  database: {
    // You can add database diagnostic methods here in the future
    getStats: () => "SQLite database is active"
  },
  
  budgets: {
    getAll: () => ipcRenderer.invoke('budgets:getAll'),
    getAllWithCategories: () => {
      console.log('Preload: Calling budgets:getAllWithCategories');
      return ipcRenderer.invoke('budgets:getAllWithCategories');
    },
    getById: (id: number) => ipcRenderer.invoke('budgets:getById', id),
    getByPeriod: (period: string) => ipcRenderer.invoke('budgets:getByPeriod', period),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('budgets:getByDateRange', startDate, endDate),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('budgets:getByCategory', categoryId),
    getCurrentBudgets: () => ipcRenderer.invoke('budgets:getCurrentBudgets'),
    getCurrentBudgetsWithCategories: () => ipcRenderer.invoke('budgets:getCurrentBudgetsWithCategories'),
    getBudgetProgress: (date?: string) => {
      console.log('Preload: Calling budgets:getBudgetProgress', date);
      return ipcRenderer.invoke('budgets:getBudgetProgress', date);
    },
    create: (budget: Budget) => ipcRenderer.invoke('budgets:create', budget),
    update: (id: number, budget: Budget) => ipcRenderer.invoke('budgets:update', id, budget),
    delete: (id: number) => ipcRenderer.invoke('budgets:delete', id)
  },
  
  // Import/Export operations
  import: {
    // File selection dialog
    showFileDialog: (options?: any) => ipcRenderer.invoke('import:showFileDialog', options),
    
    // File parsing
    parseCSV: (filePath: string) => ipcRenderer.invoke('import:parseCSV', filePath),
    parseExcel: (filePath: string) => ipcRenderer.invoke('import:parseExcel', filePath),
    
    // Data validation and import
    validateTransactions: (data: any[], mappings: Record<string, string>) => 
      ipcRenderer.invoke('import:validateTransactions', data, mappings),
    saveTransactions: (transactions: Transaction[]) => 
      ipcRenderer.invoke('import:saveTransactions', transactions)
  },
  
  export: {
    // File save dialog
    showSaveDialog: (options?: { format?: 'csv' | 'excel' }) => 
      ipcRenderer.invoke('export:showSaveDialog', options),
    
    // Export generation
    transactionsToCSV: (options: { filePath: string, filters?: any }) => 
      ipcRenderer.invoke('export:transactionsToCSV', options),
    transactionsToExcel: (options: { filePath: string, filters?: any }) => 
      ipcRenderer.invoke('export:transactionsToExcel', options)
  },
  
  // AI Services
  ai: {
    // Status and initialization
    getStatus: () => ipcRenderer.invoke('ai:getStatus'),
    updateContext: () => ipcRenderer.invoke('ai:updateContext'),
    clearModels: () => ipcRenderer.invoke('ai:clearModels'),
    
    // Model Management
    preloadModels: () => ipcRenderer.invoke('ai:preloadModels'),
    getModelStatus: () => ipcRenderer.invoke('ai:getModelStatus'),
    loadModel: (modelName: string) => ipcRenderer.invoke('ai:loadModel', modelName),
    unloadModel: (modelName: string) => ipcRenderer.invoke('ai:unloadModel', modelName),
    
    // Transaction categorization
    categorizeTransaction: (transaction: Transaction) => 
      ipcRenderer.invoke('ai:categorizeTransaction', transaction),
    batchCategorizeTransactions: (transactions: Transaction[]) =>
      ipcRenderer.invoke('ai:batchCategorizeTransactions', transactions),
    learnFromFeedback: (feedback: any) =>
      ipcRenderer.invoke('ai:learnFromFeedback', feedback),
    addCategorizationRule: (payload: any) =>
      ipcRenderer.invoke('ai:addCategorizationRule', payload),
    
    // Query processing
    processQuery: (query: string) => ipcRenderer.invoke('ai:processQuery', query),
    
    // Financial Analysis
    analyzeFinancialHealth: () => ipcRenderer.invoke('ai:analyzeFinancialHealth'),
    optimizeLoans: () => ipcRenderer.invoke('ai:optimizeLoans'),
    forecastBills: () => ipcRenderer.invoke('ai:forecastBills'),
    
    // Smart Automation
    createPayeeFromTransaction: (transaction: Transaction) => 
      ipcRenderer.invoke('ai:createPayeeFromTransaction', transaction),
    
    // Data helpers
    getUncategorizedTransactions: () => ipcRenderer.invoke('ai:getUncategorizedTransactions'),
    getStatistics: () => ipcRenderer.invoke('ai:getStatistics'),
    
    // Progress listeners
    onCategorizationProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ai:categorization-progress', (event, progress) => callback(progress));
    },
    removeCategorizationProgressListener: () => {
      ipcRenderer.removeAllListeners('ai:categorization-progress');
    }
  },

  // Bills Management
  bills: {
    getAll: () => ipcRenderer.invoke('bills:getAll'),
    getActive: () => ipcRenderer.invoke('bills:getActive'),
    getById: (id: number) => ipcRenderer.invoke('bills:getById', id),
    create: (bill: RecurringBill) => ipcRenderer.invoke('bills:create', bill),
    update: (id: number, bill: RecurringBill) => ipcRenderer.invoke('bills:update', id, bill),
    delete: (id: number) => ipcRenderer.invoke('bills:delete', id),
    getByPayee: (payeeId: number) => ipcRenderer.invoke('bills:getByPayee', payeeId),
    getByAccount: (accountId: number) => ipcRenderer.invoke('bills:getByAccount', accountId),
    getUpcoming: (daysAhead?: number) => ipcRenderer.invoke('bills:getUpcoming', daysAhead),
    getWithSummary: () => ipcRenderer.invoke('bills:getWithSummary'),
    getOverdue: () => ipcRenderer.invoke('bills:getOverdue')
  },

  // Bill Payments
  billPayments: {
    getAll: () => ipcRenderer.invoke('billPayments:getAll'),
    getById: (id: number) => ipcRenderer.invoke('billPayments:getById', id),
    create: (payment: BillPayment) => ipcRenderer.invoke('billPayments:create', payment),
    update: (id: number, payment: BillPayment) => ipcRenderer.invoke('billPayments:update', id, payment),
    delete: (id: number) => ipcRenderer.invoke('billPayments:delete', id),
    getByBill: (billId: number) => ipcRenderer.invoke('billPayments:getByBill', billId),
    getOverdue: () => ipcRenderer.invoke('billPayments:getOverdue'),
    getUpcoming: (daysAhead?: number) => ipcRenderer.invoke('billPayments:getUpcoming', daysAhead),
    markPaid: (paymentId: number, transactionId: number, amountPaid: number) => 
      ipcRenderer.invoke('billPayments:markPaid', paymentId, transactionId, amountPaid),
    markOverdue: (paymentId: number, daysLate: number, lateFee?: number) => 
      ipcRenderer.invoke('billPayments:markOverdue', paymentId, daysLate, lateFee)
  },

  // Loans Management
  loans: {
    getAll: () => ipcRenderer.invoke('loans:getAll'),
    getById: (id: number) => ipcRenderer.invoke('loans:getById', id),
    create: (loan: LoanDetails) => ipcRenderer.invoke('loans:create', loan),
    update: (id: number, loan: LoanDetails) => ipcRenderer.invoke('loans:update', id, loan),
    delete: (id: number) => ipcRenderer.invoke('loans:delete', id),
    getByAccount: (accountId: number) => ipcRenderer.invoke('loans:getByAccount', accountId),
    getByType: (loanType: string) => ipcRenderer.invoke('loans:getByType', loanType),
    getActiveLoan: (accountId: number) => ipcRenderer.invoke('loans:getActiveLoan', accountId),
    getWithSummary: () => ipcRenderer.invoke('loans:getWithSummary'),
    updateBalance: (loanId: number, newBalance: number) => 
      ipcRenderer.invoke('loans:updateBalance', loanId, newBalance),
    generateAmortizationSchedule: (loanId: number) => 
      ipcRenderer.invoke('loans:generateAmortizationSchedule', loanId)
  },

  // Amortization Schedule
  amortization: {
    getAll: () => ipcRenderer.invoke('amortization:getAll'),
    getById: (id: number) => ipcRenderer.invoke('amortization:getById', id),
    create: (schedule: AmortizationSchedule) => ipcRenderer.invoke('amortization:create', schedule),
    update: (id: number, schedule: AmortizationSchedule) => 
      ipcRenderer.invoke('amortization:update', id, schedule),
    delete: (id: number) => ipcRenderer.invoke('amortization:delete', id),
    getByLoan: (loanId: number) => ipcRenderer.invoke('amortization:getByLoan', loanId),
    getActualPayments: (loanId: number) => ipcRenderer.invoke('amortization:getActualPayments', loanId),
    markPaymentActual: (scheduleId: number, transactionId: number) => 
      ipcRenderer.invoke('amortization:markPaymentActual', scheduleId, transactionId),
    bulkInsert: (scheduleItems: Omit<AmortizationSchedule, 'schedule_id'>[]) => 
      ipcRenderer.invoke('amortization:bulkInsert', scheduleItems)
  },

  // Interest Expenses
  interest: {
    getAll: () => ipcRenderer.invoke('interest:getAll'),
    getById: (id: number) => ipcRenderer.invoke('interest:getById', id),
    create: (expense: InterestExpense) => ipcRenderer.invoke('interest:create', expense),
    update: (id: number, expense: InterestExpense) => ipcRenderer.invoke('interest:update', id, expense),
    delete: (id: number) => ipcRenderer.invoke('interest:delete', id),
    getByAccount: (accountId: number) => ipcRenderer.invoke('interest:getByAccount', accountId),
    getByType: (expenseType: InterestExpenseType) => ipcRenderer.invoke('interest:getByType', expenseType),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('interest:getByDateRange', startDate, endDate),
    getWithSummary: () => ipcRenderer.invoke('interest:getWithSummary'),
    getTotalByAccount: (accountId: number, year?: number) => 
      ipcRenderer.invoke('interest:getTotalByAccount', accountId, year),
    getTotalByType: (expenseType: InterestExpenseType, year?: number) => 
      ipcRenderer.invoke('interest:getTotalByType', expenseType, year),
    getMonthlyTrend: (accountId: number, months?: number) => 
      ipcRenderer.invoke('interest:getMonthlyTrend', accountId, months),
    getCreditCardAnalysis: (accountId: number) => 
      ipcRenderer.invoke('interest:getCreditCardAnalysis', accountId),
    recordExpense: (params: {
      accountId: number;
      expenseType: InterestExpenseType;
      periodStart: string;
      periodEnd: string;
      averageBalance: number;
      interestRate: number;
      interestAmount: number;
      transactionId?: number;
    }) => ipcRenderer.invoke('interest:recordExpense', params)
  }
});
