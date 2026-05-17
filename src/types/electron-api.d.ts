import { Account } from '../data-storage/models/Account';
import { Transaction } from '../data-storage/models/Transaction';
import { Category } from '../data-storage/models/Category';
import { Budget } from '../data-storage/models/Budget';
import { Payee, EnhancedPayee } from '../data-storage/models/Payee';
import { RecurringBill, BillPayment, BillSummary } from '../data-storage/models/RecurringBill';
import { LoanDetails, AmortizationSchedule, LoanSummary } from '../data-storage/models/LoanDetails';
import { InterestExpense, InterestExpenseSummary, InterestExpenseType, CreditCardInterestAnalysis } from '../data-storage/models/InterestExpense';

declare global {
  interface Window {
      api: {
      accounts: {
        getAll: () => Promise<Account[]>;
        getActive: () => Promise<Account[]>;
        getById: (id: number) => Promise<Account | null>;
        create: (account: Account) => Promise<{ id: number, success: boolean }>;
        update: (id: number, account: Account) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean, error?: string }>;
        getTotalBalance: () => Promise<number>;
        getDetails: (accountId: number) => Promise<any | null>;
        saveDetails: (details: any) => Promise<{ success: boolean; error?: string }>;
      };
      transactions: {
        getAll: () => Promise<Transaction[]>;
        getById: (id: number) => Promise<Transaction | null>;
        getByAccountId: (accountId: number) => Promise<Transaction[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<Transaction[]>;
        getRecent: (limit: number) => Promise<Transaction[]>;
        searchByDescription: (term: string) => Promise<Transaction[]>;
        create: (transaction: Transaction) => Promise<{ transactionId: number, success: boolean }>;
        update: (id: number, transaction: Transaction) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        createTransfer: (fromAccountId: number, toAccountId: number, amount: number, description?: string, date?: string) => Promise<{ fromTransactionId: number, toTransactionId: number, success: boolean }>;
        bulkAssignPayee: (transactionIds: number[], payeeId: number) => Promise<{ success: boolean, count: number }>;
        autoAssignPayees: () => Promise<{ success: boolean, count: number }>;
        backfillPayees: () => Promise<{ success: boolean, processedCount: number, payeeExtractedCount: number, newPayeeCount: number, existingPayeeCount: number, message: string }>;
        recalculateBalances: () => Promise<{ success: boolean }>;
        bulkDelete: (ids: number[]) => Promise<{ 
          success?: boolean, 
          partialSuccess?: boolean, 
          count?: number, 
          totalCount?: number, 
          errors?: Array<{id: number, error: string}>, 
          error?: string 
        }>;
        getByCategory: (categoryId: number) => Promise<Transaction[]>;
        getByType: (type: string) => Promise<Transaction[]>;
        getByStatus: (status: string) => Promise<Transaction[]>;
        getMonthlyActivity: (month: string, accountId?: number) => Promise<{
          success: boolean;
          transactions?: Transaction[];
          categoryTotals?: Array<{ category_name: string; total_amount: number }>;
          merchantTotals?: Array<{ payee_name: string; total_amount: number }>;
          error?: string;
        }>;
        autoCategorizeMonth: (month: string, accountId?: number) => Promise<{
          success: boolean;
          updatedCount?: number;
          totalConsidered?: number;
          message?: string;
          error?: string;
        }>;
      };
      categories: {
        getAll: () => Promise<Category[]>;
        getById: (id: number) => Promise<Category | null>;
        getByType: (type: string) => Promise<Category[]>;
        getParents: () => Promise<Category[]>;
        getSubcategories: (parentId: number) => Promise<Category[]>;
        getHierarchy: () => Promise<{[key: number]: {category: Category, subcategories: Category[]}}>;
        create: (category: Category) => Promise<{ id?: number, success: boolean, error?: string }>;
        update: (id: number, category: Category) => Promise<{ success: boolean, error?: string }>;
        delete: (id: number) => Promise<{ success: boolean, error?: string }>;
        bulkDelete: (ids: number[]) => Promise<{ success: boolean, deletedCount: number, error?: string }>;
      };

      payees: {
        getAll: () => Promise<Payee[]>;
        getById: (id: number) => Promise<Payee | null>;
        create: (payee: Payee) => Promise<{ id?: number, success: boolean, error?: string }>;
        createIfNotExists: (payee: Payee) => Promise<{ id: number, created: boolean, success: boolean, error?: string }>;
        findByName: (name: string) => Promise<{ payee: Payee | null, success: boolean, error?: string }>;
        update: (id: number, payee: Payee) => Promise<{ success: boolean, error?: string }>;
        delete: (id: number) => Promise<{ success: boolean, error?: string }>;
        bulkDelete: (ids: number[]) => Promise<{ success: boolean, deletedCount: number, error?: string }>;
        getEnhanced: () => Promise<EnhancedPayee[]>;
      };
      
      database: {
        getStats: () => string;
      };
      
      budgets: {
        getAll: () => Promise<Budget[]>;
        getAllWithCategories: () => Promise<any[]>;
        getById: (id: number) => Promise<Budget | null>;
        getByPeriod: (period: string) => Promise<Budget[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<Budget[]>;
        getByCategory: (categoryId: number) => Promise<Budget[]>;
        getCurrentBudgets: () => Promise<Budget[]>;
        getCurrentBudgetsWithCategories: () => Promise<any[]>;
        getBudgetProgress: (date?: string) => Promise<any[]>;
        create: (budget: Budget) => Promise<{ id: number, success: boolean }>;
        update: (id: number, budget: Budget) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
      };
      import: {
        showFileDialog: (options?: any) => Promise<{ canceled: boolean, filePath?: string }>;
        parseCSV: (filePath: string) => Promise<{ success: boolean, data: any[], meta: any, errors?: any[] }>;
        parseExcel: (filePath: string) => Promise<{ success: boolean, sheets: { name: string, headers: string[], data: any[] }[] }>;
        validateTransactions: (data: any[], mappings: Record<string, string>) => Promise<{
          success: boolean,
          validTransactions: Transaction[],
          errors: Array<{ row: number, errors: Record<string, string> }>,
          stats: { total: number, valid: number, invalid: number }
        }>;
        saveTransactions: (transactions: Transaction[]) => Promise<{
          success: boolean,
          count?: number,
          error?: string
        }>;
      };
      export: {
        showSaveDialog: (options?: { format?: 'csv' | 'excel', defaultPath?: string }) => Promise<{ canceled: boolean, filePath?: string }>;
        transactionsToCSV: (options: { filePath: string, filters?: any }) => Promise<{
          success: boolean,
          path?: string,
          count?: number,
          error?: string
        }>;
        transactionsToExcel: (options: { filePath: string, filters?: any }) => Promise<{
          success: boolean,
          path?: string,
          count?: number,
          error?: string
        }>;
      };
      
      ai: {
        // Status & Setup
        getStatus: () => Promise<{ 
          status: 'loading' | 'ready' | 'error'; 
          message: string; 
          features?: any; 
          accuracy?: any;
          models?: any;
          memory?: any;
          error?: string;
        }>;
        updateContext: () => Promise<{ success: boolean; message?: string; error?: string }>;
        clearModels: () => Promise<{ success: boolean; message?: string; error?: string }>;
        
        // Model Management
        preloadModels: () => Promise<{ success: boolean; message?: string; error?: string }>;
        getModelStatus: () => Promise<{ 
          success: boolean; 
          statuses?: any[]; 
          memoryUsage?: any; 
          error?: string; 
        }>;
        loadModel: (modelName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
        unloadModel: (modelName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
        
        // Enhanced Transaction Processing
        categorizeTransaction: (transaction: Transaction) => Promise<{ 
          success: boolean; 
          enhanced?: boolean;
          predictions?: any[]; 
          payeeExtraction?: any;
          extractedInfo?: any;
          confidence?: number;
          error?: string; 
        }>;
        batchCategorizeTransactions: (transactions: Transaction[]) => Promise<{ 
          success: boolean; 
          results?: { [key: number]: any }; 
          error?: string; 
        }>;
        learnFromFeedback: (feedback: any) => Promise<{ success: boolean; message?: string; error?: string }>;
        addCategorizationRule: (payload: any) => Promise<{
          success: boolean;
          ruleId?: number;
          updatedCount?: number;
          error?: string;
        }>;
        
        // Enhanced Query Processing
        processQuery: (query: string) => Promise<{ 
          success: boolean; 
          enhanced?: boolean;
          result?: any; 
          modelUsed?: string;
          processingTime?: number;
          confidence?: number;
          error?: string; 
        }>;
        
        // Financial Analysis
        analyzeFinancialHealth: () => Promise<{
          success: boolean;
          analysis?: any;
          modelUsed?: string;
          processingTime?: number;
          error?: string;
        }>;
        optimizeLoans: () => Promise<{
          success: boolean;
          optimization?: any;
          modelUsed?: string;
          processingTime?: number;
          error?: string;
        }>;
        forecastBills: () => Promise<{
          success: boolean;
          forecast?: any;
          modelUsed?: string;
          processingTime?: number;
          error?: string;
        }>;
        
        // Smart Automation
        createPayeeFromTransaction: (transaction: Transaction) => Promise<{
          success: boolean;
          payee?: any;
          confidence?: number;
          categoryPredictions?: any[];
          extractedInfo?: any;
          message?: string;
          error?: string;
        }>;
        
        // Chat Interface (for testing AI intelligence)
        chat: (messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>) => Promise<{
          success: boolean;
          response?: string;
          error?: string;
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
          modelUsed?: string;
          enhanced?: boolean;
        }>;
        
        // Legacy / Utility Functions
        getUncategorizedTransactions: () => Promise<{ success: boolean; transactions?: any[]; error?: string }>;
        getStatistics: () => Promise<{ success: boolean; stats?: any; error?: string }>;
        onCategorizationProgress: (callback: (progress: number) => void) => void;
        removeCategorizationProgressListener: () => void;
      };

      // Bills Management
      bills: {
        getAll: () => Promise<RecurringBill[]>;
        getActive: () => Promise<RecurringBill[]>;
        getById: (id: number) => Promise<RecurringBill | null>;
        create: (bill: RecurringBill) => Promise<{ id: number, success: boolean }>;
        update: (id: number, bill: RecurringBill) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getByPayee: (payeeId: number) => Promise<RecurringBill[]>;
        getByAccount: (accountId: number) => Promise<RecurringBill[]>;
        getUpcoming: (daysAhead?: number) => Promise<RecurringBill[]>;
        getWithSummary: () => Promise<BillSummary[]>;
        getOverdue: () => Promise<BillSummary[]>;
      };

      // Bill Payments
      billPayments: {
        getAll: () => Promise<BillPayment[]>;
        getById: (id: number) => Promise<BillPayment | null>;
        create: (payment: BillPayment) => Promise<{ id: number, success: boolean }>;
        update: (id: number, payment: BillPayment) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getByBill: (billId: number) => Promise<BillPayment[]>;
        getOverdue: () => Promise<BillPayment[]>;
        getUpcoming: (daysAhead?: number) => Promise<BillPayment[]>;
        markPaid: (paymentId: number, transactionId: number, amountPaid: number) => Promise<{ success: boolean }>;
        markOverdue: (paymentId: number, daysLate: number, lateFee?: number) => Promise<{ success: boolean }>;
      };

      // Loans Management
      loans: {
        getAll: () => Promise<LoanDetails[]>;
        getById: (id: number) => Promise<LoanDetails | null>;
        create: (loan: LoanDetails) => Promise<{ id: number, success: boolean }>;
        update: (id: number, loan: LoanDetails) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getByAccount: (accountId: number) => Promise<LoanDetails[]>;
        getByType: (loanType: string) => Promise<LoanDetails[]>;
        getActiveLoan: (accountId: number) => Promise<LoanDetails | null>;
        getWithSummary: () => Promise<LoanSummary[]>;
        updateBalance: (loanId: number, newBalance: number) => Promise<{ success: boolean }>;
        generateAmortizationSchedule: (loanId: number) => Promise<{ schedule: AmortizationSchedule[], success: boolean }>;
      };

      // Amortization Schedule
      amortization: {
        getAll: () => Promise<AmortizationSchedule[]>;
        getById: (id: number) => Promise<AmortizationSchedule | null>;
        create: (schedule: AmortizationSchedule) => Promise<{ id: number, success: boolean }>;
        update: (id: number, schedule: AmortizationSchedule) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getByLoan: (loanId: number) => Promise<AmortizationSchedule[]>;
        getActualPayments: (loanId: number) => Promise<AmortizationSchedule[]>;
        markPaymentActual: (scheduleId: number, transactionId: number) => Promise<{ success: boolean }>;
        bulkInsert: (scheduleItems: Omit<AmortizationSchedule, 'schedule_id'>[]) => Promise<{ success: boolean }>;
      };

      // Interest Expenses
      interest: {
        getAll: () => Promise<InterestExpense[]>;
        getById: (id: number) => Promise<InterestExpense | null>;
        create: (expense: InterestExpense) => Promise<{ id: number, success: boolean }>;
        update: (id: number, expense: InterestExpense) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getByAccount: (accountId: number) => Promise<InterestExpense[]>;
        getByType: (expenseType: InterestExpenseType) => Promise<InterestExpense[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<InterestExpense[]>;
        getWithSummary: () => Promise<InterestExpenseSummary[]>;
        getTotalByAccount: (accountId: number, year?: number) => Promise<number>;
        getTotalByType: (expenseType: InterestExpenseType, year?: number) => Promise<number>;
        getMonthlyTrend: (accountId: number, months?: number) => Promise<Array<{month: string, amount: number}>>;
        getCreditCardAnalysis: (accountId: number) => Promise<CreditCardInterestAnalysis | null>;
        recordExpense: (params: {
          accountId: number;
          expenseType: InterestExpenseType;
          periodStart: string;
          periodEnd: string;
          averageBalance: number;
          interestRate: number;
          interestAmount: number;
          transactionId?: number;
        }) => Promise<{ id: number, success: boolean }>;
      };

    };
  }
}

export {};
