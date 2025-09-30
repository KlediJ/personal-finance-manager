# Brain Mapping purposes.

● 🗂️ LIBRI Personal Finance Manager - Complete Application Tree

  Here's your clean application structure for mind mapping:

  LIBRI Personal Finance Manager (v0.1.5)
  ├── 📋 PROJECT DOCS
  │   ├── BUILD_INSTRUCTIONS.md
  │   ├── CHANGELOG.md
  │   ├── PROJECT_OVERVIEW.md
  │   ├── README.md
  │   └── CLAUDE.md (codebase instructions)
  │
  ├── ⚙️ CONFIGURATION
  │   ├── package.json (Electron + React + TypeScript)
  │   ├── tsconfig.json (TypeScript config)
  │   ├── webpack.config.js (dev build)
  │   ├── webpack.prod.js (production build)
  │   └── electron/tsconfig-electron.json
  │
  ├── 🖥️ ELECTRON (Main Process)
  │   ├── main.ts (app lifecycle)
  │   ├── preload.ts (secure API bridge - 286 methods)
  │   ├── ai/
  │   │   ├── DualModelRouter.ts (local vs cloud AI)
  │   │   └── ModelManager.ts (AI model lifecycle)
  │   └── ipc/ (9 domain handlers - 124 channels)
  │       ├── accountHandlers.ts
  │       ├── transactionHandlers.ts
  │       ├── categoryHandlers.ts
  │       ├── payeeHandlers.ts
  │       ├── budgetHandlers.ts
  │       ├── billHandlers.ts
  │       ├── loanHandlers.ts
  │       ├── interestHandlers.ts
  │       └── aiHandlers.ts
  │
  ├── 📊 DATA LAYER (src/data-storage/)
  │   ├── database/
  │   │   ├── DatabaseConnection.ts (SQLite singleton)
  │   │   ├── DatabaseManager.ts (repository orchestration)
  │   │   └── SchemaInitializer.ts (20+ tables)
  │   ├── models/ (TypeScript interfaces)
  │   │   ├── Transaction.ts (core financial entity)
  │   │   ├── Account.ts (enhanced account details)
  │   │   ├── Category.ts (hierarchical categories)
  │   │   ├── Payee.ts (merchant/vendor management)
  │   │   ├── Budget.ts (budget planning)
  │   │   ├── RecurringBill.ts (subscription management)
  │   │   ├── LoanDetails.ts (loan & amortization)
  │   │   ├── InterestExpense.ts (interest tracking)
  │   │   ├── JournalEntry.ts (double-entry accounting)
  │   │   └── [others...]
  │   ├── repositories/ (data access layer)
  │   │   ├── BaseRepository.ts (common CRUD)
  │   │   ├── TransactionRepository.ts (enhanced with payee joins)
  │   │   ├── AccountRepository.ts
  │   │   ├── PayeeRepository.ts
  │   │   ├── [others...]
  │   │   └── JournalEntryRepository.ts
  │   └── services/
  │       └── AccountingService.ts (business logic layer)
  │
  ├── 🤖 AI LAYER (src/data-processing/)
  │   ├── ai/
  │   │   ├── PayeeExtractor.ts (smart payee detection)
  │   │   ├── CodeLlamaProcessor.ts (local LLM)
  │   │   ├── MistralProcessor.ts (cloud AI)
  │   │   └── MistralAIProcessor.ts
  │   └── import-export/
  │       ├── CsvProcessor.ts (CSV parsing + AI enhancement)
  │       ├── ExcelProcessor.ts (Excel processing)
  │       └── index.ts
  │
  ├── 🎨 REACT FRONTEND (src/presentation/)
  │   ├── layouts/
  │   │   └── MainLayout.tsx (sidebar navigation - 11 sections)
  │   ├── components/
  │   │   ├── TransferDialog.tsx
  │   │   ├── AIPayeeExtractor.tsx
  │   │   └── EnvironmentIndicator.tsx
  │   └── pages/ (feature-organized)
  │       ├── dashboard/ (overview + charts)
  │       ├── accounts/ (account management)
  │       ├── transactions/ (transaction CRUD)
  │       ├── payees/ (payee management)
  │       ├── categories/ (category hierarchy)
  │       ├── budget/ (budget planning)
  │       ├── bills/ & subscriptions/ (recurring payments)
  │       ├── loans/ & credit-cards/ (debt management)
  │       ├── ai/ (AI assistance interface)
  │       ├── import-export/ (data interchange)
  │       └── settings/ (app configuration)
  │
  ├── 🔧 UTILITIES
  │   ├── scripts/
  │   │   ├── init-db.js (database setup)
  │   │   ├── reset-db.js (dev reset)
  │   │   ├── backfill-payees.js (payee extraction)
  │   │   └── auto-assign-payees.js
  │   └── src/types/
  │       ├── electron-api.d.ts (286 type-safe API methods)
  │       └── [other type definitions]
  │
  └── 🎯 KEY FEATURES
      ├── ✅ Cash Basis Double-Entry Accounting
      ├── ✅ Native AI Payee Extraction
      ├── ✅ Advanced Financial Tracking (loans, bills, interest)
      ├── ✅ Import/Export (CSV, Excel)
      ├── ✅ Real-time Dashboard with Charts
      ├── ✅ Type-Safe IPC Communication (124 channels)
      ├── ✅ Material-UI Professional Interface
      └── ✅ Cross-Platform Desktop (Electron)

  Core Architecture: Electron + React 19 + TypeScript + SQLite + Material-UI + AI
  Database: 20+ tables with double-entry accounting principlesAI Integration: Native payee extraction + dual model routing
  (local/cloud)
  Security: Context isolation + type-safe IPC + 286 controlled API methods

  Perfect foundation for building your comprehensive personal finance application with native AI capabilities! 🚀