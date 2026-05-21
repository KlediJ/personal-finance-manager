import { DatabaseConnection } from './DatabaseConnection';

export class SchemaInitializer {
  public static initializeSchema(): void {
    const db = DatabaseConnection.getInstance();
    
    // Create tables in the correct order (respecting foreign key constraints)
    this.createAccountsTable(db);
    this.createCategoriesTable(db);
    this.createPayeesTable(db);
    this.createTransactionsTable(db);
    this.createBudgetsTable(db);
    this.createTagsTable(db);
    this.createTransactionTagsTable(db);
    this.createReportsTable(db);
    
    // Enhanced financial tracking tables
    this.createAccountDetailsTable(db);
    this.createPayeeDetailsTable(db);
    this.createRecurringBillsTable(db);
    this.createBillPaymentsTable(db);
    this.createLoanDetailsTable(db);
    this.createAmortizationScheduleTable(db);
    this.createInterestExpensesTable(db);
    
    // Double-entry accounting tables
    this.createJournalEntriesTable(db);
    
    // AI model storage and learning tables
    this.createAIModelsTable(db);
    this.createAILearningDataTable(db);
    this.createAIPredictionCacheTable(db);
    this.createAIPerformanceMetricsTable(db);

    // User-defined categorization rules
    this.createCategorizationRulesTable(db);
    
    console.log('Database schema initialized');
  }

  private static addColumnIfMissing(
    db: any,
    tableName: string,
    columnName: string,
    columnDefinition: string
  ): void {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasColumn = columns.some((column: any) => column.name === columnName);

    if (!hasColumn) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`Added ${columnName} column to ${tableName}`);
    }
  }
  
  private static createAccountsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        opening_balance REAL NOT NULL DEFAULT 0,
        current_balance REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        description TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chart of Accounts enhancements - Phase 1
    this.addColumnIfMissing(db, 'accounts', 'account_class', "TEXT DEFAULT 'Asset'");
    this.addColumnIfMissing(db, 'accounts', 'account_code', 'TEXT');
    this.addColumnIfMissing(db, 'accounts', 'is_liability', 'INTEGER DEFAULT 0');
    this.addColumnIfMissing(db, 'accounts', 'is_virtual', 'INTEGER DEFAULT 0');

    console.log('Chart of Accounts enhancements applied to accounts table');
    
    // Migrate existing account data to new Chart of Accounts structure
    this.migrateAccountClassifications(db);
  }

  private static migrateAccountClassifications(db: any): void {
    // Update existing accounts with proper Chart of Accounts classifications
    console.log('Migrating existing accounts to Chart of Accounts structure...');
    
    // Asset accounts (1000-1999)
    db.exec(`
      UPDATE accounts 
      SET account_class = 'Asset', 
          account_code = CASE 
            WHEN type = 'checking' THEN '1100'
            WHEN type = 'savings' THEN '1200'
            ELSE '1000'
          END,
          is_liability = 0
      WHERE type IN ('checking', 'savings');
    `);
    
    // Liability accounts (2000-2999)
    db.exec(`
      UPDATE accounts 
      SET account_class = 'Liability', 
          account_code = CASE 
            WHEN type = 'credit_card' THEN '2100'
            WHEN type = 'loan' THEN '2200'
            ELSE '2000'
          END,
          is_liability = 1
      WHERE type IN ('credit_card', 'loan');
    `);
    
    console.log('Account classifications migrated successfully');
  }
  
  private static createCategoriesTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        parent_category_id INTEGER,
        icon TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_category_id) REFERENCES categories (category_id)
      )
    `);
  }
  
  private static createPayeesTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payees (
        payee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        default_category_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (default_category_id) REFERENCES categories (category_id)
      )
    `);
  }
  
  private static createTransactionsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        category_id INTEGER,
        transaction_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payee_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id),
        FOREIGN KEY (category_id) REFERENCES categories (category_id),
        FOREIGN KEY (payee_id) REFERENCES payees (payee_id)
      )
    `);

    // Credit Card Transaction Logic enhancements - Phase 2
    this.addColumnIfMissing(
      db,
      'transactions',
      'transaction_subtype',
      "TEXT DEFAULT 'standard'"
    );
    this.addColumnIfMissing(db, 'transactions', 'linked_transaction_id', 'INTEGER');
    this.addColumnIfMissing(
      db,
      'transactions',
      'pending_transfer_review',
      'INTEGER DEFAULT 0'
    );

    console.log('Credit card transaction logic enhancements applied to transactions table');
    
    // Migrate existing transaction data
    this.migrateTransactionSubtypes(db);
  }

  private static migrateTransactionSubtypes(db: any): void {
    console.log('Migrating existing transactions with subtypes...');
    
    // Standard transactions keep default subtype
    // This migration sets the foundation for future credit card logic
    db.exec(`
      UPDATE transactions 
      SET transaction_subtype = 'standard'
      WHERE transaction_subtype IS NULL;
    `);

    db.exec(`
      UPDATE transactions
      SET pending_transfer_review = 0
      WHERE pending_transfer_review IS NULL;
    `);
    
    console.log('Transaction subtypes migrated successfully');
  }
  
  private static createBudgetsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
      )
    `);
  }
  
  private static createTagsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  private static createTransactionTagsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_tags (
        transaction_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (transaction_id, tag_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id) ON DELETE CASCADE
      )
    `);
  }
  
  private static createReportsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        report_type TEXT NOT NULL,
        parameters TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private static createAccountDetailsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_details (
        account_id INTEGER PRIMARY KEY,
        credit_limit REAL,
        interest_rate REAL,
        statement_date INTEGER,
        due_date INTEGER,
        minimum_payment REAL,
        grace_period_days INTEGER,
        account_number_masked TEXT,
        institution_name TEXT,
        account_details_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id) ON DELETE CASCADE
      )
    `);
  }

  private static createPayeeDetailsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payee_details (
        payee_id INTEGER PRIMARY KEY,
        business_type TEXT,
        website TEXT,
        phone TEXT,
        address TEXT,
        auto_categorization_rules TEXT,
        payment_methods TEXT,
        typical_amount_range TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payee_id) REFERENCES payees (payee_id) ON DELETE CASCADE
      )
    `);
  }

  private static createRecurringBillsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_bills (
        bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
        payee_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        bill_name TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        due_day INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_fixed_amount INTEGER NOT NULL DEFAULT 0,
        auto_pay INTEGER NOT NULL DEFAULT 0,
        reminder_days INTEGER NOT NULL DEFAULT 3,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payee_id) REFERENCES payees (payee_id),
        FOREIGN KEY (category_id) REFERENCES categories (category_id),
        FOREIGN KEY (account_id) REFERENCES accounts (account_id)
      )
    `);
  }

  private static createBillPaymentsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bill_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        transaction_id INTEGER,
        due_date TEXT NOT NULL,
        amount_due REAL NOT NULL,
        amount_paid REAL,
        payment_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        days_late INTEGER NOT NULL DEFAULT 0,
        late_fee REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES recurring_bills (bill_id) ON DELETE CASCADE,
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
      )
    `);
  }

  private static createLoanDetailsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS loan_details (
        loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        loan_type TEXT NOT NULL,
        original_amount REAL NOT NULL,
        current_balance REAL NOT NULL,
        interest_rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        payment_amount REAL NOT NULL,
        payment_frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        maturity_date TEXT NOT NULL,
        escrow_amount REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id) ON DELETE CASCADE
      )
    `);
  }

  private static createAmortizationScheduleTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS amortization_schedule (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        payment_number INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        payment_amount REAL NOT NULL,
        principal_amount REAL NOT NULL,
        interest_amount REAL NOT NULL,
        remaining_balance REAL NOT NULL,
        escrow_amount REAL,
        is_actual_payment INTEGER NOT NULL DEFAULT 0,
        transaction_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loan_details (loan_id) ON DELETE CASCADE,
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
      )
    `);
  }

  private static createInterestExpensesTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS interest_expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        transaction_id INTEGER,
        expense_type TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        average_balance REAL NOT NULL,
        interest_rate REAL NOT NULL,
        interest_amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
      )
    `);
  }

  private static createAIModelsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_models (
        model_id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL UNIQUE,
        model_type TEXT NOT NULL,
        model_version TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        model_config TEXT,
        load_count INTEGER NOT NULL DEFAULT 0,
        last_loaded TIMESTAMP,
        memory_usage INTEGER,
        performance_metrics TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private static createAILearningDataTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_learning_data (
        learning_id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        actual_output TEXT,
        feedback_type TEXT NOT NULL,
        confidence_score REAL,
        was_correct INTEGER NOT NULL DEFAULT 0,
        user_correction TEXT,
        transaction_id INTEGER,
        category_id INTEGER,
        payee_id INTEGER,
        processing_time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id),
        FOREIGN KEY (category_id) REFERENCES categories (category_id),
        FOREIGN KEY (payee_id) REFERENCES payees (payee_id)
      )
    `);
  }

  private static createAIPredictionCacheTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_prediction_cache (
        cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_hash TEXT NOT NULL UNIQUE,
        model_name TEXT NOT NULL,
        input_data TEXT NOT NULL,
        prediction_result TEXT NOT NULL,
        confidence_score REAL,
        hit_count INTEGER NOT NULL DEFAULT 1,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private static createAIPerformanceMetricsTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_performance_metrics (
        metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_data TEXT,
        measurement_period_start TIMESTAMP,
        measurement_period_end TIMESTAMP,
        sample_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private static createCategorizationRulesTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorization_rules (
        rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_string TEXT NOT NULL,
        match_type TEXT NOT NULL,
        match_amount REAL,
        target_category_id INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_category_id) REFERENCES categories (category_id)
      )
    `);
  }

  private static createJournalEntriesTable(db: any): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        journal_entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
        amount REAL NOT NULL CHECK (amount > 0),
        description TEXT,
        reference_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts (account_id) ON DELETE CASCADE
      )
    `);
  }
}
