import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import FileSelectionStep from './ImportWizardSteps/FileSelectionStep';
import ColumnMappingStep from './ImportWizardSteps/ColumnMappingStep';
import DataPreviewStep from './ImportWizardSteps/DataPreviewStep';
import CategorizationReviewStep, { CategorizationGroup } from './ImportWizardSteps/CategorizationReviewStep';
import TransferReviewStep from './ImportWizardSteps/TransferReviewStep';
import ConfirmationStep from './ImportWizardSteps/ConfirmationStep';
import { Account } from '../../../data-storage/models/Account';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';
import { Category, CategoryType } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';
import { fingerprintDescription } from '../../../data-processing/ai/FingerprintUtil';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  'Select File',
  'Map Columns',
  'Preview Data',
  'Review Categories',
  'Review Transfers',
  'Import'
];

type TransferResolution = 'transfer' | 'regular' | 'skip';

interface TransferCandidate {
  id: string;
  transactionIndex: number;
  transaction: Transaction;
  detectedBy: string[];
  resolution: TransferResolution;
  fromAccountId: number | '';
  toAccountId: number | '';
}

interface ImportResultSummary {
  success: boolean;
  count: number;
  importedTransactions: number;
  importedTransfers: number;
  skippedCount: number;
  failedCount: number;
}

interface CategorizationReviewStats {
  eligibleCount: number;
  groupedCount: number;
  singletonCount: number;
}

const TRANSFER_KEYWORD_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\btransfer\b/i, reason: 'Description contains "transfer"' },
  { pattern: /\bxfer\b/i, reason: 'Description contains "xfer"' },
  { pattern: /\bmove money\b/i, reason: 'Description contains "move money"' },
  { pattern: /\bfunds transfer\b/i, reason: 'Description contains "funds transfer"' },
  { pattern: /\bonline transfer\b/i, reason: 'Description contains "online transfer"' },
  { pattern: /\bpayment thank you\b/i, reason: 'Description contains "payment thank you"' },
  { pattern: /\bcard payment\b/i, reason: 'Description contains "card payment"' }
];

const ImportWizard: React.FC<ImportWizardProps> = ({ open, onClose }) => {
  // State for the wizard
  const [activeStep, setActiveStep] = useState(0);
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ name: string, headers: string[], data: any[] }[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [validatedData, setValidatedData] = useState<Transaction[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [importStats, setImportStats] = useState<{ total: number, valid: number, invalid: number } | null>(null);
  const [categorizationGroups, setCategorizationGroups] = useState<CategorizationGroup[]>([]);
  const [categorizationStats, setCategorizationStats] = useState<CategorizationReviewStats>({
    eligibleCount: 0,
    groupedCount: 0,
    singletonCount: 0
  });
  const [categorizationLoading, setCategorizationLoading] = useState(false);
  const [transferCandidates, setTransferCandidates] = useState<TransferCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
  const hasAccounts = accounts.length > 0;

  React.useEffect(() => {
    if (!open) return;

    const loadLookups = async () => {
      try {
        const [accountData, categoryData, payeeData] = await Promise.all([
          window.api.accounts.getAll(),
          window.api.categories.getAll(),
          window.api.payees.getAll()
        ]);
        setAccounts(accountData);
        setCategories(categoryData);
        setPayees(payeeData);
      } catch (loadError) {
        console.error('Error loading import wizard lookups:', loadError);
      }
    };

    loadLookups();
  }, [open]);

  // Reset wizard state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setActiveStep(0);
        setFileType(null);
        setFilePath(null);
        setFileName(null);
        setImportData([]);
        setHeaders([]);
        setSheets([]);
        setSelectedSheet(null);
        setMappings({});
        setValidatedData([]);
        setValidationErrors([]);
        setImportStats(null);
        setAccounts([]);
        setCategories([]);
        setPayees([]);
        setCategorizationGroups([]);
        setCategorizationStats({
          eligibleCount: 0,
          groupedCount: 0,
          singletonCount: 0
        });
        setTransferCandidates([]);
        setError(null);
        setImportResult(null);
      }, 300);
    }
  }, [open]);

  // Handle file selection
  const handleFileSelected = async (
    type: 'csv' | 'excel', 
    path: string, 
    name: string, 
    data: any[], 
    fileHeaders: string[],
    fileSheets?: { name: string, headers: string[], data: any[] }[]
  ) => {
    setFileType(type);
    setFilePath(path);
    setFileName(name);

    if (type === 'csv') {
      setImportData(data);
      setHeaders(fileHeaders);
    } else if (type === 'excel' && fileSheets) {
      setSheets(fileSheets);
      if (fileSheets.length > 0) {
        setSelectedSheet(fileSheets[0].name);
        setImportData(fileSheets[0].data);
        setHeaders(fileSheets[0].headers);
      }
    }

    // Create default mappings
    const defaultMappings: Record<string, string> = {};
    
    // Try to intelligently map common column names
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // Map date column
      if (lowerHeader.includes('date')) {
        defaultMappings['date'] = header;
      }
      
      // Map amount column
      if (lowerHeader.includes('amount') || lowerHeader.includes('sum') || 
          lowerHeader.includes('value') || lowerHeader.includes('price')) {
        defaultMappings['amount'] = header;
      }
      
      // Map description column
      if (lowerHeader.includes('desc') || lowerHeader.includes('memo') || 
          lowerHeader.includes('note') || lowerHeader.includes('details')) {
        defaultMappings['description'] = header;
      }
      
      // Map category column
      if (lowerHeader.includes('cat')) {
        defaultMappings['category_id'] = header;
      }
      
      // Map type column
      if (lowerHeader.includes('type')) {
        defaultMappings['transaction_type'] = header;
      }
    });
    
    setMappings(defaultMappings);
  };

  // Handle sheet selection for Excel files
  const handleSheetSelected = (sheetName: string) => {
    const sheet = sheets.find(s => s.name === sheetName);
    if (sheet) {
      setSelectedSheet(sheetName);
      setImportData(sheet.data);
      setHeaders(sheet.headers);
    }
  };

  // Handle column mapping
  const handleMappingChanged = (field: string, value: string) => {
    setMappings({
      ...mappings,
      [field]: value
    });
  };

  const detectTransferCandidates = (
    transactions: Transaction[],
    availableAccounts: Account[]
  ): TransferCandidate[] => {
    return transactions.flatMap((transaction, transactionIndex) => {
      const detectedBy: string[] = [];
      const description = `${transaction.description || ''} ${transaction.payee_name || ''}`.trim();

      if (transaction.transaction_type === TransactionType.TRANSFER) {
        detectedBy.push('Transaction type mapped as transfer');
      }

      for (const rule of TRANSFER_KEYWORD_PATTERNS) {
        if (rule.pattern.test(description)) {
          detectedBy.push(rule.reason);
        }
      }

      if (detectedBy.length === 0) {
        return [];
      }

      const importedAccountExists = availableAccounts.some(
        (account) => account.account_id === transaction.account_id
      );

      const defaultFromAccountId =
        transaction.amount < 0 && importedAccountExists ? transaction.account_id : '';
      const defaultToAccountId =
        transaction.amount > 0 && importedAccountExists ? transaction.account_id : '';

      return [{
        id: `${transactionIndex}-${transaction.date}-${transaction.amount}-${transaction.description || 'transaction'}`,
        transactionIndex,
        transaction,
        detectedBy: Array.from(new Set(detectedBy)),
        resolution: 'transfer' as TransferResolution,
        fromAccountId: defaultFromAccountId,
        toAccountId: defaultToAccountId
      }];
    });
  };

  const normalizeTransferCandidateAsRegular = (transaction: Transaction): Transaction => {
    if (transaction.transaction_type !== TransactionType.TRANSFER) {
      return transaction;
    }

    return {
      ...transaction,
      transaction_type:
        transaction.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
      transaction_subtype: undefined,
      linked_transaction_id: undefined
    };
  };

  const buildCategorizationGroups = async (transactions: Transaction[]) => {
    setCategorizationLoading(true);

    try {
      const grouped = new Map<
        string,
        {
          id: string;
          sampleDescription: string;
          count: number;
          totalAmount: number;
          sampleAmount: number;
          transactionType: TransactionType;
          transactionIndexes: number[];
          representativeTransaction: Transaction;
        }
      >();

      transactions.forEach((transaction, index) => {
        if (transaction.transaction_type === TransactionType.TRANSFER || transaction.category_id) {
          return;
        }

        const fingerprint = fingerprintDescription(transaction.description || '');
        if (!fingerprint) {
          return;
        }

        const existing = grouped.get(fingerprint);
        if (existing) {
          existing.count += 1;
          existing.totalAmount += transaction.amount;
          existing.transactionIndexes.push(index);
          return;
        }

        grouped.set(fingerprint, {
          id: fingerprint,
          sampleDescription: transaction.description || 'No description',
          count: 1,
          totalAmount: transaction.amount,
          sampleAmount: transaction.amount,
          transactionType: transaction.transaction_type,
          transactionIndexes: [index],
          representativeTransaction: transaction
        });
      });

      const groups = await Promise.all(
        Array.from(grouped.values()).map(async (group) => {
          let suggestedCategoryId: number | '' = '';
          let suggestedCategoryName: string | undefined;
          let suggestedPayeeName: string | undefined;
          let confidence: number | null = null;
          let rationale: string | null = null;

          if (window.api?.ai?.categorizeTransaction) {
            try {
              const result = await window.api.ai.categorizeTransaction(group.representativeTransaction);
              const prediction = result.predictions?.[0];

              if (prediction?.category?.category_id) {
                suggestedCategoryId = prediction.category.category_id;
                suggestedCategoryName = prediction.category.name;
              }

              if (result.payeeExtraction?.payee?.name) {
                suggestedPayeeName = result.payeeExtraction.payee.name;
              }

              confidence = result.confidence ?? prediction?.confidence ?? null;
              rationale = (result as any).rationale ?? null;
            } catch (categorizationError) {
              console.error('Error categorizing import group:', categorizationError);
            }
          }

          return {
            id: group.id,
            sampleDescription: group.sampleDescription,
            count: group.count,
            totalAmount: group.totalAmount,
            sampleAmount: group.sampleAmount,
            transactionType: group.transactionType,
            currentCategoryId: suggestedCategoryId,
            currentCategoryName: suggestedCategoryName || '',
            currentPayeeName: suggestedPayeeName || '',
            suggestedCategoryId,
            suggestedCategoryName,
            suggestedPayeeName,
            confidence,
            rationale,
            status: 'pending' as const,
            saveRule: false,
            transactionIndexes: group.transactionIndexes,
            representativeTransaction: group.representativeTransaction
          };
        })
      );

      const repeatedGroups = groups
        .filter((group) => group.count > 1)
        .sort((a, b) => b.count - a.count || Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

      setCategorizationGroups(repeatedGroups);
      setCategorizationStats({
        eligibleCount: groups.reduce((total, group) => total + group.count, 0),
        groupedCount: repeatedGroups.length,
        singletonCount: groups.filter((group) => group.count === 1).length
      });
    } finally {
      setCategorizationLoading(false);
    }
  };

  const updateCategorizationGroup = (
    groupId: string,
    updates: Partial<CategorizationGroup & { transactionIndexes: number[]; representativeTransaction: Transaction }>
  ) => {
    setCategorizationGroups((prev) =>
      prev.map((group: any) =>
        group.id === groupId
          ? {
              ...group,
              ...updates,
              status: 'pending'
            }
          : group
      )
    );
  };

  const applyCategorizationGroup = async (groupId: string) => {
    const group = (categorizationGroups as any[]).find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }

    try {
      const trimmedCategoryName = (group.currentCategoryName || '').trim();
      const trimmedPayeeName = group.currentPayeeName.trim();
      let categoryId = group.currentCategoryId === '' ? null : Number(group.currentCategoryId);
      let payeeId: number | null = null;
      let resolvedCategory: Category | null =
        categoryId !== null
          ? categories.find((category) => category.category_id === categoryId) || null
          : null;

      if (trimmedCategoryName) {
        const existingCategory = categories.find(
          (category) => category.name.toLowerCase() === trimmedCategoryName.toLowerCase()
        );

        if (existingCategory?.category_id) {
          categoryId = existingCategory.category_id;
          resolvedCategory = existingCategory;
        } else {
          const inferredType =
            group.transactionType === TransactionType.INCOME
              ? CategoryType.INCOME
              : CategoryType.EXPENSE;
          const categoryResult = await window.api.categories.create({
            name: trimmedCategoryName,
            type: inferredType
          });

          if (!categoryResult.success || !categoryResult.id) {
            throw new Error(categoryResult.error || `Failed to create category "${trimmedCategoryName}"`);
          }

          const newCategory: Category = {
            category_id: categoryResult.id,
            name: trimmedCategoryName,
            type: inferredType
          };

          categoryId = categoryResult.id;
          resolvedCategory = newCategory;
          setCategories((prev) => [...prev, newCategory]);
        }
      } else {
        categoryId = null;
        resolvedCategory = null;
      }

      if (trimmedPayeeName) {
        const payeeResult = await window.api.payees.createIfNotExists({
          name: trimmedPayeeName,
          default_category_id: categoryId
        });

        if (!payeeResult.success) {
          throw new Error(payeeResult.error || `Failed to create payee "${trimmedPayeeName}"`);
        }

        payeeId = payeeResult.id;

        const existingPayee = payees.find((payee) => payee.payee_id === payeeResult.id);
        if (existingPayee) {
          if (categoryId !== null) {
            await window.api.payees.update(payeeResult.id, {
              ...existingPayee,
              default_category_id: categoryId
            });
            setPayees((prev) =>
              prev.map((payee) =>
                payee.payee_id === payeeResult.id
                  ? { ...payee, default_category_id: categoryId }
                  : payee
              )
            );
          }
        } else {
          setPayees((prev) => [
            ...prev,
            {
              payee_id: payeeResult.id,
              name: trimmedPayeeName,
              default_category_id: categoryId
            }
          ]);
        }
      }

      setValidatedData((prev) =>
        prev.map((transaction, index) =>
          group.transactionIndexes.includes(index)
            ? {
                ...transaction,
                category_id: categoryId,
                payee_id: payeeId,
                payee_name: trimmedPayeeName || undefined
              }
            : transaction
        )
      );

      const representativeTransaction: Transaction = {
        ...group.representativeTransaction,
        category_id: categoryId,
        payee_id: payeeId,
        payee_name: trimmedPayeeName || undefined
      };

      if (categoryId && resolvedCategory && window.api?.ai?.learnFromFeedback) {
          try {
            await window.api.ai.learnFromFeedback({
              transaction: representativeTransaction,
              correctCategory: resolvedCategory,
              correctPayee: trimmedPayeeName ? { name: trimmedPayeeName } : undefined
            });
          } catch (feedbackError) {
            console.error('Error recording import categorization feedback:', feedbackError);
          }
      }

      if (group.saveRule && categoryId && window.api?.ai?.addCategorizationRule) {
        try {
          await window.api.ai.addCategorizationRule({
            transaction: representativeTransaction,
            categoryId,
            scope: 'MERCHANT'
          });
        } catch (ruleError) {
          console.error('Error saving import categorization rule:', ruleError);
        }
      }

      setCategorizationGroups((prev) =>
        prev.map((entry) =>
          entry.id === groupId
            ? {
                ...entry,
                currentCategoryId: categoryId ?? '',
                currentCategoryName: trimmedCategoryName,
                status: 'applied'
              }
            : entry
        )
      );
    } catch (applyError) {
      console.error('Error applying import categorization group:', applyError);
      setError(applyError instanceof Error ? applyError.message : 'Failed to apply import categorization');
    }
  };

  const applyAllSuggestedCategorizationGroups = async () => {
    for (const group of categorizationGroups) {
      const hasSuggestion = group.currentCategoryId !== '' || group.currentPayeeName.trim().length > 0;
      if (group.status === 'pending' && hasSuggestion) {
        await applyCategorizationGroup(group.id);
      }
    }
  };

  // Validate data before import
  const validateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const availableAccounts =
        accounts.length > 0 ? accounts : await window.api.accounts.getAll();
      setAccounts(availableAccounts);

      if (availableAccounts.length === 0) {
        setError('Create an account before importing transactions.');
        return;
      }
      
      // If account_id is not mapped, use the first account
      const effectiveMappings = { ...mappings };
      if (!effectiveMappings['account_id'] && availableAccounts.length > 0) {
        effectiveMappings.account_id = availableAccounts[0].account_id.toString();
        setMappings(effectiveMappings);
      }
      
      // Call the validation IPC handler
      const result = await window.api.import.validateTransactions(importData, effectiveMappings);

      setValidatedData(result.validTransactions || []);
      setValidationErrors(result.errors || []);
      setImportStats(result.stats);
      await buildCategorizationGroups(result.validTransactions || []);
      setTransferCandidates(
        detectTransferCandidates(result.validTransactions || [], availableAccounts)
      );

      if (!result.success) {
        setError(
          result.errors && result.errors.length > 0
            ? 'Validation errors found. Review the preview and transfer candidates before importing.'
            : 'Validation failed'
        );
      }
    } catch (err) {
      console.error('Error validating data:', err);
      setError('Failed to validate import data');
    } finally {
      setLoading(false);
    }
  };

  // Import validated data
  const importTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const candidateMap = new Map(
        transferCandidates.map((candidate) => [candidate.transactionIndex, candidate])
      );

      const regularTransactions = validatedData
        .filter((transaction, index) => {
          const candidate = candidateMap.get(index);
          return !candidate || candidate.resolution === 'regular';
        })
        .map(normalizeTransferCandidateAsRegular);

      const transferRows = transferCandidates.filter(
        (candidate) => candidate.resolution === 'transfer'
      );
      const skippedCount = transferCandidates.filter(
        (candidate) => candidate.resolution === 'skip'
      ).length;

      let importedTransfers = 0;
      const importErrors: string[] = [];

      for (const candidate of transferRows) {
        try {
          if (
            !candidate.fromAccountId ||
            !candidate.toAccountId ||
            candidate.fromAccountId === candidate.toAccountId
          ) {
            importErrors.push(
              `Transfer "${candidate.transaction.description || 'transaction'}" is missing valid source and destination accounts.`
            );
            continue;
          }

          const result = await window.api.transactions.createTransfer(
            Number(candidate.fromAccountId),
            Number(candidate.toAccountId),
            Math.abs(candidate.transaction.amount),
            candidate.transaction.description,
            candidate.transaction.date
          );

          if (result.success) {
            importedTransfers++;
          } else {
            importErrors.push(
              `Failed to create transfer "${candidate.transaction.description || 'transaction'}".`
            );
          }
        } catch (transferError: any) {
          console.error('Error creating transfer during import:', transferError);
          importErrors.push(
            `Failed to create transfer "${candidate.transaction.description || 'transaction'}": ${transferError?.message || 'Unknown error'}`
          );
        }
      }

      let importedTransactions = 0;
      if (regularTransactions.length > 0) {
        const result = await window.api.import.saveTransactions(regularTransactions);
        importedTransactions = result.count || 0;
        if (!result.success) {
          importErrors.push(result.error || 'Some regular transactions failed to import.');
        }
      }

      const totalImported = importedTransactions + importedTransfers;
      const failedCount =
        regularTransactions.length +
        transferRows.length -
        totalImported;

      const success = failedCount === 0 && importErrors.length === 0;

      if (!success) {
        setError(importErrors[0] || 'Import failed');
      }

      setImportResult({
        success,
        count: totalImported,
        importedTransactions,
        importedTransfers,
        skippedCount,
        failedCount
      });
    } catch (err) {
      console.error('Error importing data:', err);
      setError('Failed to import transactions');
      setImportResult({
        success: false,
        count: 0,
        importedTransactions: 0,
        importedTransfers: 0,
        skippedCount: 0,
        failedCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle next button
  const handleNext = async () => {
    if (activeStep === 0 && !hasAccounts) {
      setError('Create an account before importing transactions.');
      return;
    }

    if (activeStep === 1) {
      // Validate data before moving to preview step
      await validateData();
    } else if (activeStep === 4) {
      // Import data
      await importTransactions();
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Handle back button
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Close wizard
  const handleClose = () => {
    onClose();
  };

  // Determine if next button should be disabled
  const isNextDisabled = () => {
    if (activeStep === 0) {
      return !filePath || !hasAccounts;
    }
    if (activeStep === 1) {
      // Require mappings for essential fields
      return !mappings['date'] || !mappings['amount'];
    }
    if (activeStep === 2) {
      return validatedData.length === 0;
    }
    if (activeStep === 3) {
      return categorizationLoading;
    }
    if (activeStep === 4) {
      return transferCandidates.some((candidate) => {
        if (candidate.resolution !== 'transfer') {
          return false;
        }

        return (
          !candidate.fromAccountId ||
          !candidate.toAccountId ||
          candidate.fromAccountId === candidate.toAccountId
        );
      });
    }
    return false;
  };

  const handleTransferCandidateChange = (
    candidateId: string,
    updates: Partial<TransferCandidate>
  ) => {
    setTransferCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, ...updates } : candidate
      )
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Transactions</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!hasAccounts && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Create at least one account before importing transactions.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">
              {activeStep === 1 ? 'Validating data...' : 'Importing transactions...'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ minHeight: '300px' }}>
            {activeStep === 0 && (
              <FileSelectionStep 
                onFileSelected={handleFileSelected}
              />
            )}
            
            {activeStep === 1 && (
              <ColumnMappingStep
                headers={headers}
                mappings={mappings}
                onMappingChanged={handleMappingChanged}
                fileType={fileType}
                sheets={sheets}
                selectedSheet={selectedSheet}
                onSheetSelected={handleSheetSelected}
              />
            )}
            
            {activeStep === 2 && (
              <DataPreviewStep
                validatedData={validatedData}
                validationErrors={validationErrors}
                stats={importStats}
                transferCandidateCount={transferCandidates.length}
              />
            )}
            
            {activeStep === 3 && (
              <CategorizationReviewStep
                categories={categories}
                payees={payees}
                groups={categorizationGroups}
                stats={categorizationStats}
                loading={categorizationLoading}
                onGroupChange={updateCategorizationGroup}
                onApplyGroup={applyCategorizationGroup}
                onApplyAllSuggested={applyAllSuggestedCategorizationGroups}
              />
            )}

            {activeStep === 4 && (
              <TransferReviewStep
                candidates={transferCandidates}
                accounts={accounts}
                onCandidateChange={handleTransferCandidateChange}
              />
            )}

            {activeStep === 5 && (
              <ConfirmationStep
                result={importResult}
                fileName={fileName}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleClose}>Close</Button>
        ) : (
          <>
            <Button 
              onClick={handleBack} 
              disabled={activeStep === 0 || loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isNextDisabled() || loading}
            >
              {activeStep === steps.length - 2 ? 'Import' : 'Next'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportWizard;
