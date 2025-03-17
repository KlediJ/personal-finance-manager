import { Account } from '../data-storage/models/Account';

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
    };
  }
}

export {};
