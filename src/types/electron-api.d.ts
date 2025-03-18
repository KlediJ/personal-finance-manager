import { Account } from '../data-storage/models/Account';
import { Transaction } from '../data-storage/models/Transaction';

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
        getByCategory: (categoryId: number) => Promise<Transaction[]>;
        getByType: (type: string) => Promise<Transaction[]>;
        getByStatus: (status: string) => Promise<Transaction[]>;
      };
    };
  }
}

export {};
