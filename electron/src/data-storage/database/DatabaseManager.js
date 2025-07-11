"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const DatabaseConnection_1 = require("./DatabaseConnection");
const SchemaInitializer_1 = require("./SchemaInitializer");
const AccountRepository_1 = require("../repositories/AccountRepository");
const TransactionRepository_1 = require("../repositories/TransactionRepository");
const CategoryRepository_1 = require("../repositories/CategoryRepository");
const PayeeRepository_1 = require("../repositories/PayeeRepository");
const BudgetRepository_1 = require("../repositories/BudgetRepository");
class DatabaseManager {
    constructor() {
        this.initialized = false;
        console.log('DatabaseManager constructor called - initializing repositories');
        // Initialize repositories
        this.accountRepository = new AccountRepository_1.AccountRepository();
        console.log('✓ Account repository created');
        this.transactionRepository = new TransactionRepository_1.TransactionRepository();
        console.log('✓ Transaction repository created');
        this.categoryRepository = new CategoryRepository_1.CategoryRepository();
        console.log('✓ Category repository created');
        this.payeeRepository = new PayeeRepository_1.PayeeRepository();
        console.log('✓ Payee repository created');
        try {
            this.budgetRepository = new BudgetRepository_1.BudgetRepository();
            console.log('✓ Budget repository created successfully');
        }
        catch (error) {
            console.error('Failed to create budget repository:', error);
            throw error;
        }
        console.log('All repositories created in DatabaseManager constructor');
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    async initialize() {
        if (this.initialized) {
            console.log('Database already initialized');
            return;
        }
        try {
            // Initialize database connection
            DatabaseConnection_1.DatabaseConnection.initialize();
            // Initialize database schema
            SchemaInitializer_1.SchemaInitializer.initializeSchema();
            // Load default data if needed
            await this.loadDefaultData();
            this.initialized = true;
            console.log('Database manager initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize database manager:', error);
            throw error;
        }
    }
    async loadDefaultData() {
        // Load default categories, etc. if the database is empty
        // This will be implemented later
    }
    getAccountRepository() {
        return this.accountRepository;
    }
    getTransactionRepository() {
        return this.transactionRepository;
    }
    getCategoryRepository() {
        return this.categoryRepository;
    }
    getPayeeRepository() {
        return this.payeeRepository;
    }
    getBudgetRepository() {
        console.log('getBudgetRepository called, returning:', !!this.budgetRepository);
        if (!this.budgetRepository) {
            console.error('Budget repository is undefined');
            throw new Error('Budget repository not properly initialized');
        }
        return this.budgetRepository;
    }
    // Add getters for other repositories as they're implemented
    shutdown() {
        DatabaseConnection_1.DatabaseConnection.closeConnection();
        this.initialized = false;
        console.log('Database manager shut down');
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map