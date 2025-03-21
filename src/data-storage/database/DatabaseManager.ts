import { DatabaseConnection } from './DatabaseConnection';
import { SchemaInitializer } from './SchemaInitializer';
import { AccountRepository } from '../repositories/AccountRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private initialized: boolean = false;
  
  // Repositories
  private accountRepository: AccountRepository;
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  
  private constructor() {
    // Initialize repositories
    this.accountRepository = new AccountRepository();
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
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
  
  // Add getters for other repositories as they're implemented
  
  public shutdown(): void {
    DatabaseConnection.closeConnection();
    this.initialized = false;
    console.log('Database manager shut down');
  }
}
