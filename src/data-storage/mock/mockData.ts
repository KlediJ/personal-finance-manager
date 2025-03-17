import { Account, AccountType } from '../models/Account';

// Mock data for development
export const mockAccounts: Account[] = [
  {
    account_id: 1,
    name: 'Checking Account',
    type: AccountType.CHECKING,
    opening_balance: 1000,
    current_balance: 850.75,
    currency: 'USD',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 2,
    name: 'Savings Account',
    type: AccountType.SAVINGS,
    opening_balance: 5000,
    current_balance: 5125.50,
    currency: 'USD',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 3,
    name: 'Credit Card',
    type: AccountType.CREDIT_CARD,
    opening_balance: 0,
    current_balance: -450.25,
    currency: 'USD',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock service for development
export const mockAccountsService = {
  getAll: () => Promise.resolve(mockAccounts),
  getActive: () => Promise.resolve(mockAccounts.filter(a => a.active)),
  getById: (id: number) => Promise.resolve(mockAccounts.find(a => a.account_id === id) || null),
  create: (account: Account) => Promise.resolve({ id: Math.max(...mockAccounts.map(a => a.account_id)) + 1, success: true }),
  update: (_id: number, _account: Account) => Promise.resolve({ success: true }),
  delete: (_id: number) => Promise.resolve({ success: true }),
  getTotalBalance: () => Promise.resolve(mockAccounts.reduce((sum, account) => sum + account.current_balance, 0))
};

// Simulate API if running in browser
if (typeof window !== 'undefined' && !window.api) {
  window.api = {
    accounts: mockAccountsService
  };
}
