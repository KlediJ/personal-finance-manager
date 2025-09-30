# Database Schema Documentation

## Overview
This document defines the database schema for the Personal Finance Manager application, designed for **cash basis accounting** with enhanced features for AI-powered financial analysis.

## Design Principles
- **Cash Basis Accounting**: Transactions recorded when cash changes hands
- **Double-Entry Foundation**: Journal entries table supports future double-entry features
- **AI-First Design**: Schema optimized for AI model training and inference
- **Surgical Precision**: Every field and relationship has a specific purpose

## Current Schema Issues & Enhancement Roadmap

### 🔴 Critical Issues Requiring Surgical Enhancement
1. **Account Types**: Current `type` field is too generic - needs proper Chart of Accounts
2. **Credit Card Logic**: No distinction between asset/liability accounts
3. **Multiple Ledgers**: No support for cash vs accrual views
4. **Transaction Types**: Limited handling of credit card transactions

### 🟡 Enhancement Opportunities
1. **Bills Integration**: Schema exists but needs UI connection
2. **Loan vs Credit Card**: Same structure but different behaviors
3. **AI Context**: Schema needs to be more self-documenting for CodeLlama

---

## Core Tables

### 1. `accounts` - Account Registry
**Purpose**: Central registry of all financial accounts (checking, savings, credit cards, loans)

```sql
CREATE TABLE accounts (
  account_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 🔴 ISSUE: Too generic
  opening_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Current Types**: `checking`, `savings`, `credit_card`, `loan`
**Enhancement Needed**: Chart of Accounts structure (Asset, Liability, Equity, Income, Expense)

### 2. `categories` - Transaction Categories
**Purpose**: Hierarchical categorization system for transactions

```sql
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- income, expense, transfer
  parent_category_id INTEGER,
  icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_category_id) REFERENCES categories (category_id)
);
```

**Status**: ✅ Well-designed, supports hierarchy

### 3. `payees` - Transaction Payees
**Purpose**: Entities that receive/send money

```sql
CREATE TABLE payees (
  payee_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  default_category_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_category_id) REFERENCES categories (category_id)
);
```

**Status**: ✅ Simple and effective

### 4. `transactions` - Core Transaction Log
**Purpose**: Central transaction ledger for all financial activities

```sql
CREATE TABLE transactions (
  transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,                  -- 🔴 ISSUE: Credit card logic unclear
  description TEXT,
  category_id INTEGER,
  transaction_type TEXT NOT NULL,        -- income, expense, transfer
  status TEXT NOT NULL DEFAULT 'pending', -- pending, cleared, reconciled
  payee_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts (account_id),
  FOREIGN KEY (category_id) REFERENCES categories (category_id),
  FOREIGN KEY (payee_id) REFERENCES payees (payee_id)
);
```

**Enhancement Needed**: Clear credit card transaction handling

---

## Enhanced Financial Tables

### 5. `account_details` - Extended Account Information
**Purpose**: Credit card limits, interest rates, statement dates

```sql
CREATE TABLE account_details (
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
);
```

**Status**: ✅ Comprehensive credit card support

### 6. `recurring_bills` - Subscription & Bill Management
**Purpose**: Recurring payment tracking (utilities, subscriptions, etc.)

```sql
CREATE TABLE recurring_bills (
  bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
  payee_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  bill_name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL,               -- monthly, weekly, yearly
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
);
```

**Status**: ✅ **FULLY IMPLEMENTED** - UI connected and functional

### 7. `loan_details` - Loan-Specific Information
**Purpose**: Amortization schedules, interest calculations

```sql
CREATE TABLE loan_details (
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
);
```

**Status**: ✅ Comprehensive loan tracking

---

## AI-Enhanced Tables

### 8. `ai_learning_data` - Machine Learning Training Data
**Purpose**: Store user feedback for AI model improvement

```sql
CREATE TABLE ai_learning_data (
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
);
```

**AI Strategy**: 
- **Mistral**: Uses this for category/payee prediction improvement
- **CodeLlama**: Uses schema understanding for query generation

---

## Double-Entry Foundation

### 9. `journal_entries` - Double-Entry Accounting Support
**Purpose**: Future-proof foundation for double-entry bookkeeping

```sql
CREATE TABLE journal_entries (
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
);
```

**Status**: ✅ Foundation ready for future enhancement

---

## Surgical Enhancement Plan

### Phase 1: Chart of Accounts (CRITICAL) ✅ COMPLETED
**Problem**: Current account types are too generic
**Solution**: Add proper Chart of Accounts structure

**Changes Implemented**:
```sql
-- Add account classification
ALTER TABLE accounts ADD COLUMN account_class TEXT DEFAULT 'Asset'; -- Asset, Liability, Equity, Income, Expense
ALTER TABLE accounts ADD COLUMN account_code TEXT;  -- 1000-Assets, 2000-Liabilities, etc.
ALTER TABLE accounts ADD COLUMN is_liability INTEGER DEFAULT 0;
```

**Data Migration Applied**:
- Asset accounts: `checking` (1100), `savings` (1200)
- Liability accounts: `credit_card` (2100), `loan` (2200)
- Proper `is_liability` flag set for credit cards and loans

### Phase 2: Credit Card Transaction Logic (CRITICAL) ✅ COMPLETED
**Problem**: Credit card purchases vs payments unclear
**Solution**: Enhanced transaction type handling

**Changes Implemented**:
```sql
-- Add transaction subtype for credit card handling
ALTER TABLE transactions ADD COLUMN transaction_subtype TEXT DEFAULT 'standard';
```

**Transaction Subtypes Added**:
- `standard` - Regular transactions
- `credit_card_purchase` - Credit card purchases (positive amount, expense)
- `credit_card_payment` - Credit card payments (negative amount, transfer)
- `credit_card_refund` - Credit card refunds
- `loan_payment` - Loan payments
- `loan_advance` - Loan advances
- `internal_transfer` - Internal transfers between accounts

**Credit Card Logic**:
- **Purchases**: Positive amount, expense type, increases liability
- **Payments**: Negative amount, transfer type, decreases liability
- **Balance**: Represents what you owe (liability account)

### Phase 3: Multiple Ledgers (ENHANCEMENT)
**Problem**: No cash vs accrual distinction
**Solution**: Add ledger type tracking

**Changes Needed**:
```sql
-- Add ledger type to transactions
ALTER TABLE transactions ADD COLUMN ledger_type TEXT DEFAULT 'cash'; -- cash, accrual
```

---

## AI Integration Strategy

### CodeLlama: Database Intelligence
- **Purpose**: SQL query generation engine
- **Knowledge**: Complete schema understanding
- **Capability**: Generate complex financial reports on-demand

### Mistral: Pattern Recognition
- **Purpose**: Category and payee prediction
- **Knowledge**: Transaction patterns and user behavior
- **Capability**: Auto-categorization and payee extraction

### Dual-Brain Architecture
1. **User Query** → CodeLlama generates SQL
2. **SQL Results** → Mistral interprets and provides insights
3. **Feedback Loop** → Both models learn from corrections

---

## Database Maintenance

### Schema Version Control
- Each enhancement must be backward-compatible
- Migration scripts required for existing data
- Version tracking in `ai_models` table

### Performance Considerations
- Indexes on frequently queried fields
- Proper foreign key constraints
- Optimized queries for AI model training

---

## Next Steps

1. **CRITICAL**: Implement Chart of Accounts enhancement
2. **CRITICAL**: Fix credit card transaction logic
3. **ENHANCEMENT**: Add multiple ledger support
4. **INTEGRATION**: Connect bills UI to existing schema ✅ **COMPLETED**
5. **AI**: Enhance schema documentation for CodeLlama

This schema serves as the foundation for a robust, AI-powered personal finance management system designed for cash basis accounting with the flexibility to support future enhancements.