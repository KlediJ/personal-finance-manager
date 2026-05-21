import { DatabaseManager } from '../database/DatabaseManager';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { Transaction, TransactionSubtype, TransactionType } from '../models/Transaction';
import { Account, AccountType } from '../models/Account';
import { JournalEntry, JournalEntryType } from '../models/JournalEntry';
import { JournalEntryRepository } from '../repositories/JournalEntryRepository';
import { VirtualAccountManager } from './VirtualAccountManager';

export class AccountingService {
  private journalEntryRepository: JournalEntryRepository;
  private virtualAccountManager: VirtualAccountManager;
  
  constructor() {
    this.journalEntryRepository = new JournalEntryRepository();
    this.virtualAccountManager = new VirtualAccountManager();
  }
  
  /**
   * Create a transaction with proper double-entry accounting
   */
  public createTransaction(transaction: Transaction): { transactionId: number; success: boolean } {
    const dbManager = DatabaseManager.getInstance();
    const db = DatabaseConnection.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    const accountRepo = dbManager.getAccountRepository();
    const payeeRepo = dbManager.getPayeeRepository();
    
    // Wrap all operations in a database transaction for atomicity
    return db.transaction(() => {
      // Handle payee creation/assignment if needed
      if (transaction.payee_name && !transaction.payee_id) {
        // Try to find existing payee by name
        const existingPayee = payeeRepo.findByName(transaction.payee_name);
        if (existingPayee) {
          transaction.payee_id = existingPayee.payee_id;
        } else {
          // Create new payee
          const newPayeeId = payeeRepo.create({
            name: transaction.payee_name,
            default_category_id: transaction.category_id
          });
          transaction.payee_id = newPayeeId;
          console.log(`Created new payee: ${transaction.payee_name} with ID: ${newPayeeId}`);
        }
      }
      
      // Start transaction
      const transactionId = transactionRepo.create(transaction);
      
      // Create journal entries based on transaction type
      this.createJournalEntries(transactionId, transaction);
      
      // Update account balances
      this.updateAccountBalances(transaction);
      
      return { transactionId, success: true };
    })();
  }
  
  /**
   * Update a transaction and its journal entries
   */
  public updateTransaction(transactionId: number, transaction: Transaction): boolean {
    const dbManager = DatabaseManager.getInstance();
    const db = DatabaseConnection.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    const payeeRepo = dbManager.getPayeeRepository();
    
    // Wrap all operations in a database transaction for atomicity
    return db.transaction(() => {
      // Get the original transaction to reverse its effects
      const originalTransaction = transactionRepo.getById(transactionId);
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (
        this.isTransferTransaction(originalTransaction) ||
        this.isTransferTransaction(transaction)
      ) {
        throw new Error('Transfers cannot be edited individually. Delete and recreate the transfer instead.');
      }
      
      // Handle payee creation/assignment if needed
      if (transaction.payee_name && !transaction.payee_id) {
        // Try to find existing payee by name
        const existingPayee = payeeRepo.findByName(transaction.payee_name);
        if (existingPayee) {
          transaction.payee_id = existingPayee.payee_id;
        } else {
          // Create new payee
          const newPayeeId = payeeRepo.create({
            name: transaction.payee_name,
            default_category_id: transaction.category_id
          });
          transaction.payee_id = newPayeeId;
          console.log(`Created new payee during update: ${transaction.payee_name} with ID: ${newPayeeId}`);
        }
      }
      
      // Reverse the original transaction's effects
      this.reverseTransaction(originalTransaction);
      
      // Delete existing journal entries
      this.journalEntryRepository.deleteByTransactionId(transactionId);
      
      // Update the transaction
      const success = transactionRepo.update(transactionId, transaction);
      
      if (success) {
        // Create new journal entries
        this.createJournalEntries(transactionId, transaction);
        
        // Update account balances
        this.updateAccountBalances(transaction);
      }
      
      return success;
    })();
  }
  
  /**
   * Delete a transaction and reverse its accounting effects
   */
  public deleteTransaction(transactionId: number): boolean {
    const dbManager = DatabaseManager.getInstance();
    const db = DatabaseConnection.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    
    // Wrap all operations in a database transaction for atomicity
    return db.transaction(() => {
      // Get the transaction to reverse its effects
      const transaction = transactionRepo.getById(transactionId);
      if (!transaction) {
        return false;
      }

      if (this.isTransferTransaction(transaction)) {
        return this.deleteTransferTransactions(transaction);
      }
      
      // Reverse the transaction's effects
      this.reverseTransaction(transaction);
      
      // Delete journal entries
      this.journalEntryRepository.deleteByTransactionId(transactionId);
      
      // Delete the transaction
      return transactionRepo.delete(transactionId);
    })();
  }
  
  /**
   * Create journal entries based on transaction type
   */
  private createJournalEntries(transactionId: number, transaction: Transaction): void {
    const dbManager = DatabaseManager.getInstance();
    const accountRepo = dbManager.getAccountRepository();
    
    const account = accountRepo.getById(transaction.account_id);
    if (!account) {
      throw new Error('Account not found');
    }
    
    const amount = Math.abs(transaction.amount);
    
    switch (transaction.transaction_type) {
      case TransactionType.INCOME:
        this.createIncomeJournalEntries(
          transactionId, 
          account, 
          amount, 
          transaction.description, 
          transaction.category_id || undefined
        );
        break;
        
      case TransactionType.EXPENSE:
        this.createExpenseJournalEntries(
          transactionId, 
          account, 
          amount, 
          transaction.description, 
          transaction.category_id || undefined
        );
        break;
        
      case TransactionType.TRANSFER:
        // Transfer logic will be handled separately
        break;
    }
  }
  
  /**
   * Create journal entries for income transactions
   */
  private createIncomeJournalEntries(
    transactionId: number,
    account: Account,
    amount: number,
    description?: string,
    categoryId?: number
  ): void {
    // For cash basis accounting:
    // Debit: Asset account (increase cash/bank balance)
    // Credit: Income account (virtual income category account)
    
    const incomeAccountId = this.virtualAccountManager.getOrCreateVirtualIncomeAccount(categoryId);
    
    this.journalEntryRepository.createDoubleEntry(
      transactionId,
      account.account_id, // Debit the asset account
      incomeAccountId,    // Credit the income account
      amount,
      description
    );
  }
  
  /**
   * Create journal entries for expense transactions
   */
  private createExpenseJournalEntries(
    transactionId: number,
    account: Account,
    amount: number,
    description?: string,
    categoryId?: number
  ): void {
    // For cash basis accounting:
    // Debit: Expense account (virtual expense category account)
    // Credit: Asset account (decrease cash/bank balance)
    
    const expenseAccountId = this.virtualAccountManager.getOrCreateVirtualExpenseAccount(categoryId);
    
    this.journalEntryRepository.createDoubleEntry(
      transactionId,
      expenseAccountId,   // Debit the expense account
      account.account_id, // Credit the asset account
      amount,
      description
    );
  }
  
  /**
   * Create transfer between two accounts
   */
  public createTransfer(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description?: string,
    date?: string
  ): { fromTransactionId: number; toTransactionId: number; success: boolean } {
    const dbManager = DatabaseManager.getInstance();
    const db = DatabaseConnection.getInstance();
    
    // Wrap all operations in a database transaction for atomicity
    return db.transaction(() =>
      this.createTransferRecords(fromAccountId, toAccountId, amount, description, date)
    )();
  }

  /**
   * Convert a previously imported regular transaction into a linked transfer.
   */
  public convertPendingTransferReview(
    transactionId: number,
    fromAccountId: number,
    toAccountId: number
  ): { fromTransactionId: number; toTransactionId: number; success: boolean } {
    const dbManager = DatabaseManager.getInstance();
    const db = DatabaseConnection.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();

    return db.transaction(() => {
      const transaction = transactionRepo.getById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.pending_transfer_review) {
        throw new Error('Transaction is not pending transfer review');
      }

      if (this.isTransferTransaction(transaction)) {
        throw new Error('Transaction is already a transfer');
      }

      // Remove the previously imported regular transaction before replacing it
      // with the linked transfer pair.
      this.reverseTransaction(transaction);
      this.journalEntryRepository.deleteByTransactionId(transactionId);
      transactionRepo.delete(transactionId);

      return this.createTransferRecords(
        fromAccountId,
        toAccountId,
        Math.abs(transaction.amount),
        transaction.description,
        transaction.date
      );
    })();
  }
  
  /**
   * Update account balances based on journal entries
   */
  private updateAccountBalances(transaction: Transaction): void {
    this.updateAccountBalance(transaction.account_id);
  }

  private createTransferRecords(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description?: string,
    date?: string
  ): { fromTransactionId: number; toTransactionId: number; success: boolean } {
    const dbManager = DatabaseManager.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    const accountRepo = dbManager.getAccountRepository();

    const fromAccount = accountRepo.getById(fromAccountId);
    const toAccount = accountRepo.getById(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('One or both accounts not found');
    }

    const transferDate = date || new Date().toISOString().split('T')[0];
    const transferAmount = Math.abs(amount);

    const fromTransaction: Transaction = {
      account_id: fromAccountId,
      date: transferDate,
      amount: -transferAmount,
      description: description || `Transfer to ${toAccount.name}`,
      transaction_type: TransactionType.TRANSFER,
      transaction_subtype: TransactionSubtype.INTERNAL_TRANSFER,
      status: 'cleared' as any,
      pending_transfer_review: false
    };

    const toTransaction: Transaction = {
      account_id: toAccountId,
      date: transferDate,
      amount: transferAmount,
      description: description || `Transfer from ${fromAccount.name}`,
      transaction_type: TransactionType.TRANSFER,
      transaction_subtype: TransactionSubtype.INTERNAL_TRANSFER,
      status: 'cleared' as any,
      pending_transfer_review: false
    };

    const fromTransactionId = transactionRepo.create(fromTransaction);
    const toTransactionId = transactionRepo.create(toTransaction);

    transactionRepo.update(fromTransactionId, {
      linked_transaction_id: toTransactionId
    });
    transactionRepo.update(toTransactionId, {
      linked_transaction_id: fromTransactionId
    });

    this.journalEntryRepository.createDoubleEntry(
      fromTransactionId,
      toAccountId,
      fromAccountId,
      transferAmount,
      description || 'Account transfer'
    );

    this.updateAccountBalance(fromAccountId);
    this.updateAccountBalance(toAccountId);

    return { fromTransactionId, toTransactionId, success: true };
  }
  
  /**
   * Update a single account's balance from journal entries
   */
  private updateAccountBalance(accountId: number): void {
    const dbManager = DatabaseManager.getInstance();
    const accountRepo = dbManager.getAccountRepository();
    
    const account = accountRepo.getById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Calculate balance from journal entries
    const calculatedBalance = this.journalEntryRepository.calculateAccountBalance(accountId);
    
    // Add opening balance to the calculated balance
    const newBalance = account.opening_balance + calculatedBalance;
    
    // Update the account balance
    accountRepo.updateBalance(accountId, newBalance);
  }
  
  /**
   * Reverse the effects of a transaction
   */
  private reverseTransaction(transaction: Transaction): void {
    // Create a reverse transaction to undo the effects
    const reverseTransaction: Transaction = {
      ...transaction,
      amount: -transaction.amount
    };
    
    // Update account balance
    const dbManager = DatabaseManager.getInstance();
    const accountRepo = dbManager.getAccountRepository();
    const account = accountRepo.getById(transaction.account_id);
    
    if (account) {
      const newBalance = account.current_balance - transaction.amount;
      accountRepo.updateBalance(transaction.account_id, newBalance);
    }
  }

  private isTransferTransaction(transaction: Partial<Transaction> | null | undefined): boolean {
    if (!transaction) {
      return false;
    }

    return (
      transaction.transaction_type === TransactionType.TRANSFER ||
      transaction.transaction_subtype === TransactionSubtype.INTERNAL_TRANSFER ||
      typeof transaction.linked_transaction_id === 'number'
    );
  }

  private findTransferPair(transaction: Transaction): Transaction | null {
    const dbManager = DatabaseManager.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    const db = DatabaseConnection.getInstance();

    if (typeof transaction.linked_transaction_id === 'number') {
      return transactionRepo.getById(transaction.linked_transaction_id);
    }

    if (!transaction.transaction_id) {
      return null;
    }

    const pairRow = db.prepare(`
      SELECT t.*, p.name as payee_name, c.name as category_name
      FROM transactions t
      LEFT JOIN payees p ON t.payee_id = p.payee_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.transaction_id != ?
        AND t.transaction_type = ?
        AND t.account_id != ?
        AND t.date = ?
        AND t.amount = ?
      ORDER BY ABS(t.transaction_id - ?) ASC
      LIMIT 1
    `).get(
      transaction.transaction_id,
      TransactionType.TRANSFER,
      transaction.account_id,
      transaction.date,
      -transaction.amount,
      transaction.transaction_id
    ) as Transaction | undefined;

    return pairRow || null;
  }

  private deleteTransferTransactions(transaction: Transaction): boolean {
    const dbManager = DatabaseManager.getInstance();
    const transactionRepo = dbManager.getTransactionRepository();
    const pair = this.findTransferPair(transaction);

    const transactionIds = new Set<number>();
    const accountIds = new Set<number>();

    if (transaction.transaction_id) {
      transactionIds.add(transaction.transaction_id);
    }
    accountIds.add(transaction.account_id);

    if (pair?.transaction_id) {
      transactionIds.add(pair.transaction_id);
      accountIds.add(pair.account_id);
    }

    for (const id of transactionIds) {
      this.journalEntryRepository.deleteByTransactionId(id);
    }

    let deletedAny = false;
    for (const id of transactionIds) {
      deletedAny = transactionRepo.delete(id) || deletedAny;
    }

    for (const accountId of accountIds) {
      this.updateAccountBalance(accountId);
    }

    return deletedAny;
  }
  
  /**
   * Initialize accounting system and migrate any existing placeholder accounts
   * This should be called once during application startup
   */
  public initializeAccounting(): { success: boolean; migrationResults?: any } {
    try {
      // Run the migration to convert any existing placeholder accounts
      const migrationResults = this.virtualAccountManager.migratePlaceholderAccounts();
      
      console.log('Accounting system initialized successfully', migrationResults);
      return { success: true, migrationResults };
    } catch (error) {
      console.error('Error initializing accounting system:', error);
      return { success: false };
    }
  }
  
  /**
   * Recalculate all account balances from journal entries
   */
  public recalculateAllBalances(): void {
    const dbManager = DatabaseManager.getInstance();
    const accountRepo = dbManager.getAccountRepository();
    
    const accounts = accountRepo.getAll();
    
    accounts.forEach(account => {
      this.updateAccountBalance(account.account_id);
    });
  }
}
