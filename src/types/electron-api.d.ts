import { Account } from '../data-storage/models/Account';
import { Transaction } from '../data-storage/models/Transaction';
import { Category } from '../data-storage/models/Category';
import { Budget } from '../data-storage/models/Budget';

declare global {
  interface Window {
    api: {
      accounts: {
        getAll: () => Promise<Account[]>;
        getActive: () => Promise<Account[]>;
        getById: (id: number) => Promise<Account | null>;
        create: (account: Account) => Promise<{ id: number, success: boolean }>;
        update: (id: number, account: Account) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
        getTotalBalance: () => Promise<number>;
      };
      transactions: {
        getAll: () => Promise<Transaction[]>;
        getById: (id: number) => Promise<Transaction | null>;
        getByAccountId: (accountId: number) => Promise<Transaction[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<Transaction[]>;
        getRecent: (limit: number) => Promise<Transaction[]>;
        searchByDescription: (term: string) => Promise<Transaction[]>;
        create: (transaction: Transaction) => Promise<{ id: number, success: boolean }>;
        update: (id: number, transaction: Transaction) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
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
      };
      categories: {
        getAll: () => Promise<Category[]>;
        getById: (id: number) => Promise<Category | null>;
        getByType: (type: string) => Promise<Category[]>;
        getParents: () => Promise<Category[]>;
        getSubcategories: (parentId: number) => Promise<Category[]>;
        getHierarchy: () => Promise<{[key: number]: {category: Category, subcategories: Category[]}}>;
        create: (category: Category) => Promise<{ id: number, success: boolean }>;
        update: (id: number, category: Category) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
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
        getStatus: () => Promise<{ status: string; message: string; features?: any; error?: string }>;
        updateContext: () => Promise<{ success: boolean; message?: string; error?: string }>;
        clearModels: () => Promise<{ success: boolean; message?: string; error?: string }>;
        categorizeTransaction: (transaction: any) => Promise<{ success: boolean; predictions?: any[]; error?: string }>;
        batchCategorizeTransactions: (transactions: any[]) => Promise<{ success: boolean; results?: any; error?: string }>;
        learnFromFeedback: (feedback: any) => Promise<{ success: boolean; message?: string; error?: string }>;
        processQuery: (query: string) => Promise<{ success: boolean; result?: any; error?: string }>;
        getUncategorizedTransactions: () => Promise<{ success: boolean; transactions?: any[]; error?: string }>;
        getStatistics: () => Promise<{ success: boolean; stats?: any; error?: string }>;
        onCategorizationProgress: (callback: (progress: number) => void) => void;
        removeCategorizationProgressListener: () => void;
      };
    };
  }
}

export {};
