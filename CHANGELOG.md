# Changelog

All notable changes to Personal Finance Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
