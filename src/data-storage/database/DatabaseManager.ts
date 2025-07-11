import { DatabaseConnection } from './DatabaseConnection';
import { SchemaInitializer } from './SchemaInitializer';
import { AccountRepository } from '../repositories/AccountRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { PayeeRepository } from '../repositories/PayeeRepository';
import { BudgetRepository } from '../repositories/BudgetRepository';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private initialized: boolean = false;
  
  // Repositories
  private accountRepository: AccountRepository;
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  private payeeRepository: PayeeRepository;
  private budgetRepository: BudgetRepository;
  
  private constructor() {
    console.log('DatabaseManager constructor called - initializing repositories');
    
    // Initialize repositories
    this.accountRepository = new AccountRepository();
    console.log('✓ Account repository created');
    
    this.transactionRepository = new TransactionRepository();
    console.log('✓ Transaction repository created');
    
    this.categoryRepository = new CategoryRepository();
    console.log('✓ Category repository created');
    
    this.payeeRepository = new PayeeRepository();
    console.log('✓ Payee repository created');
    
    try {
      this.budgetRepository = new BudgetRepository();
      console.log('✓ Budget repository created successfully');
    } catch (error) {
      console.error('Failed to create budget repository:', error);
      throw error;
    }
    
    console.log('All repositories created in DatabaseManager constructor');
  }
  
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Database already initialized');
      return;
    }
    
    try {
      // Initialize database connection
      DatabaseConnection.initialize();
      
      // Initialize database schema
      SchemaInitializer.initializeSchema();
      
      // Load default data if needed
      await this.loadDefaultData();
      
      this.initialized = true;
      console.log('Database manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database manager:', error);
      throw error;
    }
  }
  
  private async loadDefaultData(): Promise<void> {
    // Load default categories, etc. if the database is empty
    // This will be implemented later
  }
  
  public getAccountRepository(): AccountRepository {
    return this.accountRepository;
  }
  
  public getTransactionRepository(): TransactionRepository {
    return this.transactionRepository;
  }

  public getCategoryRepository(): CategoryRepository {
    return this.categoryRepository;
  }
  
  public getPayeeRepository(): PayeeRepository {
    return this.payeeRepository;
  }
  
  public getBudgetRepository(): BudgetRepository {
    console.log('getBudgetRepository called, returning:', !!this.budgetRepository);
    if (!this.budgetRepository) {
      console.error('Budget repository is undefined');
      throw new Error('Budget repository not properly initialized');
    }
    return this.budgetRepository;
  }
  
  // Add getters for other repositories as they're implemented
  
  public shutdown(): void {
    DatabaseConnection.closeConnection();
    this.initialized = false;
    console.log('Database manager shut down');
  }
}
