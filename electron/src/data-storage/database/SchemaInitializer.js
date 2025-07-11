"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaInitializer = void 0;
const DatabaseConnection_1 = require("./DatabaseConnection");
class SchemaInitializer {
    static initializeSchema() {
        const db = DatabaseConnection_1.DatabaseConnection.getInstance();
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
        console.log('Database schema initialized');
    }
    static createAccountsTable(db) {
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
    }
    static createCategoriesTable(db) {
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
    static createPayeesTable(db) {
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
    static createTransactionsTable(db) {
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
    }
    static createBudgetsTable(db) {
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
    static createTagsTable(db) {
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
    static createTransactionTagsTable(db) {
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
    static createReportsTable(db) {
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
    static createAccountDetailsTable(db) {
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
    static createPayeeDetailsTable(db) {
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
    static createRecurringBillsTable(db) {
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
    static createBillPaymentsTable(db) {
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
    static createLoanDetailsTable(db) {
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
    static createAmortizationScheduleTable(db) {
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
    static createInterestExpensesTable(db) {
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
}
exports.SchemaInitializer = SchemaInitializer;
//# sourceMappingURL=SchemaInitializer.js.map