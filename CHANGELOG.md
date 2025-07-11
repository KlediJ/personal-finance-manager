# Changelog

All notable changes to Personal Finance Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2025-07-11

### Added
- **Payee Management System**: Complete payee integration throughout the application
  - Added payee column to transactions table for better visibility
  - Added payee selection dropdown in transaction forms
  - Created PayeeSummary component for dashboard payee spending analysis
- **AI Payee Intelligence**: Enhanced AI categorization with payee extraction
  - AI now suggests both categories AND payees for transactions
  - Automatic payee creation when AI confidence is high (>70%)
  - Smart duplicate prevention with case-insensitive matching
  - "✓ Both" button to approve category and payee together
- **Duplicate Prevention**: Robust payee duplicate checking system
  - `findByName()` method for case-insensitive payee lookup
  - `createIfNotExists()` method prevents duplicate payee creation
  - Enhanced IPC handlers for payee management

### Changed
- **Dashboard Layout**: Replaced Recent Transactions with PayeeSummary component
  - More meaningful payee spending breakdown with expandable details
  - Shows top expense payees with percentage of total spending
  - Drill-down to view recent transactions per payee
- **Transaction Repository**: Enhanced with JOIN queries for payee information
  - All transaction queries now include payee names
  - Improved data consistency across the application
- **AI Categorization Interface**: Enhanced user experience
  - Clear action buttons for approving suggestions
  - Better visual feedback for existing vs new payees
  - Improved tooltips and user guidance

### Fixed
- **Payee Creation**: Resolved issues with payee saving and display
- **AI Duplicates**: Fixed AI creating duplicate payees (e.g., multiple "McDonald's")
- **Transaction Form**: Improved payee selection with proper loading states
- **TypeScript Definitions**: Added proper API typing for new payee methods

### Technical
- Added `payees:createIfNotExists` and `payees:findByName` IPC handlers
- Enhanced Transaction model with `payee_name` field
- Updated TypeScript definitions for new payee API methods
- Improved error handling and logging throughout payee workflows

## [0.1.2] - 2025-01-10

### Fixed
- Fixed timezone-related date display bug where transactions would show one day earlier than imported
  - Updated date parsing in TransactionsPage.tsx to use local timezone
  - Updated date parsing in RecentTransactions.tsx to use local timezone
  - Modified CSV import to preserve intended dates regardless of user timezone

### Changed
- Improved date handling throughout the application to be timezone-aware

## [0.1.1] - Previous Release

### Features
- Core transaction management
- Account management with multiple account types
- Category management with hierarchical structure
- CSV/Excel import and export functionality
- Dashboard with financial overview
- Budget management system
- AI-powered features (transaction categorization, query processing)

### Known Issues (Fixed in 0.1.2)
- Dates displaying one day earlier due to timezone conversion

## [0.3] - Legacy Version
- Account Summary Update
- Previous architecture and features
