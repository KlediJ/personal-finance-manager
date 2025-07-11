# Personal Finance Manager - Project Overview

## Introduction
Personal Finance Manager is a cross-platform desktop application (built with Electron) for tracking, analyzing, and managing personal finances. The application uses a React frontend with Material UI components and a SQLite database for persistent storage.

## Current Version
Version 0.1.2 - Date Display Bug Fix

### Changelog
- v0.1.2 (Current) - Fixed timezone-related date display bug in transactions
- v0.1.1 - Initial working version with core features
- v0.3 (Legacy) - Account Summary Update

## Architecture

### Core Technologies
- **Frontend**: React (v19), Material UI (v6)
- **Backend**: Electron (v35)
- **Database**: SQLite (via better-sqlite3)
- **Data Visualization**: Chart.js
- **Build Tools**: Webpack, TypeScript

### Application Structure
The application follows a layered architecture:

1. **Electron Layer**
   - Main process: Handles database operations and system integration
   - Preload script: Secures communication between processes
   - IPC Handlers: Domain-specific handlers for accounts, transactions, categories

2. **Data Layer**
   - Models: Define data structures (Account, Transaction, Category, etc.)
   - Repositories: Provide data access operations following repository pattern
   - Database: Connection management and schema initialization

3. **Presentation Layer**
   - Pages: Full-page components organized by domain
   - Components: Reusable UI elements
   - Forms: Data entry dialogs
   - Charts: Data visualization components

## Core Features

### Account Management
- Create, edit, and delete financial accounts
- Track account balances
- Support for different account types:
  - Checking
  - Savings
  - Credit Cards
  - Investment
  - Loan
  - Cash

### Transaction Tracking
- Record financial transactions
- Categorize income and expenses
- Associate transactions with accounts
- Filter and search transactions
- Transaction status tracking (pending, cleared, reconciled)

### Categories & Organization
- Create hierarchical categories for income and expenses
- Assign categories to transactions
- Track spending by category

### Data Import/Export
- Import transactions from CSV and Excel files
- Column mapping for flexible import formats
- Data validation during import
- Export transactions to CSV/Excel with formatting

### Dashboard & Reporting
- Financial overview dashboard
- Monthly income and expense charts
- Category breakdown visualization
- Recent transaction list
- Account summary with balances

## Database Schema

### Main Tables
- **accounts**: Financial accounts with balances
- **transactions**: Financial transactions
- **categories**: Transaction categories
- **payees**: Transaction payees
- **budgets**: Budget planning
- **tags**: Transaction tags
- **reports**: Saved reports

### Key Relationships
- Transactions belong to accounts
- Transactions can have categories
- Transactions can have payees
- Transactions can have multiple tags

## User Interface

### Main Sections
- **Dashboard**: Overview of finances
- **Account Summary**: Account-specific details
- **Accounts**: Account management
- **Transactions**: Transaction management
- **Categories**: Category management
- **Reports**: Financial reporting (placeholder)
- **Settings**: Application settings

### UI Components
- Material UI components for consistent design
- Data tables with sorting and filtering
- Form dialogs for data entry
- Charts for data visualization
- Cards for summary information

## Development Setup

### Running the Application
```
npm install
npm start
```

### Building for Production
```
npm run build
npm run package
```

## Future Development
- Complete reporting functionality
- Budget management
- Financial goals tracking
- Data synchronization across devices
- ML-based categorization of transactions

## Technical Details

### Electron IPC Architecture
The application uses Electron's IPC (Inter-Process Communication) with context isolation:
- Main process handles database operations and system access
- Renderer process contains the React UI
- Preload script securely exposes APIs to the renderer
- Communication via defined channel names with structured data

### Database Management
- Singleton pattern for database connection
- Repository pattern for data access
- SQL query building with parameterized statements
- Automatic schema initialization

### State Management
- React hooks for local component state
- API calls to backend for data operations
- Real-time updates through re-fetching