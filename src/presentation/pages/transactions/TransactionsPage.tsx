import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  Snackbar,
  Alert,
  TextField,
  MenuItem,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useLocation, useNavigate } from 'react-router-dom';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';
import { descriptionsLookSimilar, fingerprintDescription } from '../../../data-processing/ai/FingerprintUtil';
import {
  getMonthlySpendingRollupMetadata,
  getSankeyCategoryLabel,
  getSankeyMerchantLabel,
  isWithinMonth
} from '../dashboard/charts/monthlySpendingFlowUtils';
import TransactionFormDialog from './TransactionFormDialog';
import ImportWizard from '../import-export/ImportWizard';
import ExportDialog from '../import-export/ExportDialog';
import TransferDialog from '../../components/TransferDialog';
import TransferReviewStep from '../import-export/ImportWizardSteps/TransferReviewStep';
import {
  buildPendingTransferCandidates,
  TransferCandidate
} from '../import-export/transferReviewUtils';

const TransactionsPage: React.FC = () => {
  // State for transactions and loading
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // State for transaction management
  const [formOpen, setFormOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  
  // State for import/export
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // State for transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pendingTransferReviewOpen, setPendingTransferReviewOpen] = useState(false);
  const [pendingTransferCandidates, setPendingTransferCandidates] = useState<TransferCandidate[]>([]);
  const [savingPendingTransfers, setSavingPendingTransfers] = useState(false);
  
  // State for filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | ''>('');
  const [reviewFilter, setReviewFilter] = useState<
    '' | 'needs_review' | 'needs_transfer' | 'needs_category' | 'needs_payee' | 'ready'
  >('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');

  // State for drill-down from dashboard (category/payee)
  const location = useLocation();
  const navigate = useNavigate();
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [drilldownPayee, setDrilldownPayee] = useState<string | null>(null);
  const [drilldownMonth, setDrilldownMonth] = useState<string | null>(null);
  const [drilldownStartDate, setDrilldownStartDate] = useState<string | null>(null);
  const [drilldownEndDate, setDrilldownEndDate] = useState<string | null>(null);
  const [drilldownAccountId, setDrilldownAccountId] = useState<number | 'all' | null>(null);
  const [drilldownCategoryRollup, setDrilldownCategoryRollup] = useState<string | null>(null);
  const [drilldownPayeeRollup, setDrilldownPayeeRollup] = useState<string | null>(null);

  // State for client-side sorting
  type SortKey =
    | 'date'
    | 'description'
    | 'payee'
    | 'account'
    | 'category'
    | 'type'
    | 'amount';
  const [sortBy, setSortBy] = useState<SortKey | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for notifications
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load accounts (needed for filtering and transaction creation)
  const loadAccounts = async () => {
    try {
      const data = await window.api.accounts.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load accounts',
        severity: 'error'
      });
    }
  };
  
  // Load categories
  const loadCategories = async () => {
    try {
      const data = await window.api.categories.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Don't show an error snackbar for this as it's not critical
    }
  };

  // Load transactions with filters
  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      let data: Transaction[] = [];
      
      // Apply filters if any are set
      if (selectedAccount) {
        // Filter by account
        data = await window.api.transactions.getByAccountId(Number(selectedAccount));
      } else if (selectedType) {
        // Filter by transaction type
        data = await window.api.transactions.getByType(selectedType);
      } else if (searchTerm) {
        // Search by description
        data = await window.api.transactions.searchByDescription(searchTerm);
      } else if (startDate && endDate) {
        // Filter by date range
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        data = await window.api.transactions.getByDateRange(formattedStartDate, formattedEndDate);
      } else {
        // No filters, get all transactions
        data = await window.api.transactions.getAll();
      }
      
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load transactions from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle save transaction (create or update)
  const handleSaveTransaction = async (
    transaction: Transaction,
    options?: {
      applyCategoryToSimilar?: boolean;
      applyPayeeToSimilar?: boolean;
    }
  ) => {
    try {
      const trimmedPayeeName = (transaction.payee_name || '').trim();

      if (transaction.transaction_id) {
        // Update existing transaction
        const result = await window.api.transactions.update(transaction.transaction_id, {
          ...transaction,
          payee_name: trimmedPayeeName || undefined,
          payee_id: trimmedPayeeName ? transaction.payee_id ?? null : null
        });
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Transaction updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error('Update failed');
        }
      } else {
        // Create new transaction
        const result = await window.api.transactions.create({
          ...transaction,
          payee_name: trimmedPayeeName || undefined,
          payee_id: trimmedPayeeName ? transaction.payee_id ?? null : null
        });
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Transaction created successfully with double-entry accounting',
            severity: 'success'
          });
        } else {
          throw new Error('Creation failed');
        }
      }

      let similarUpdatedCount = 0;
      const shouldApplyToSimilar =
        Boolean(transaction.transaction_id) &&
        (options?.applyCategoryToSimilar || options?.applyPayeeToSimilar);

      if (shouldApplyToSimilar) {
        const sourceFingerprint = fingerprintDescription(transaction.description || '');

        if (sourceFingerprint) {
          const allTransactions = await window.api.transactions.getAll();
          const similarTransactions = allTransactions.filter((candidate) => {
            if (!candidate.transaction_id || candidate.transaction_id === transaction.transaction_id) {
              return false;
            }

            if (candidate.transaction_type === TransactionType.TRANSFER) {
              return false;
            }

            if (candidate.transaction_type !== transaction.transaction_type) {
              return false;
            }

            return descriptionsLookSimilar(
              candidate.description || '',
              transaction.description || ''
            );
          });

          for (const similarTransaction of similarTransactions) {
            const updateResult = await window.api.transactions.update(similarTransaction.transaction_id!, {
              ...similarTransaction,
              category_id: options?.applyCategoryToSimilar
                ? transaction.category_id ?? null
                : similarTransaction.category_id ?? null,
              payee_id: options?.applyPayeeToSimilar
                ? (trimmedPayeeName ? transaction.payee_id ?? null : null)
                : similarTransaction.payee_id ?? null,
              payee_name: options?.applyPayeeToSimilar
                ? (trimmedPayeeName || undefined)
                : similarTransaction.payee_name
            });

            if (updateResult.success) {
              similarUpdatedCount++;
            }
          }
        }
      }

      try {
        if (window.api?.ai?.learnFromFeedback) {
          let correctCategory =
            categories.find((category) => category.category_id === transaction.category_id) || null;

          if (!correctCategory && transaction.category_id) {
            correctCategory = await window.api.categories.getById(transaction.category_id);
          }

          const correctPayee: Payee | undefined = trimmedPayeeName
            ? {
                payee_id: transaction.payee_id ?? undefined,
                name: trimmedPayeeName
              }
            : undefined;

          window.api.ai
            .learnFromFeedback({
              transaction: {
                ...transaction,
                payee_name: trimmedPayeeName || undefined,
                payee_id: correctPayee?.payee_id ?? null
              },
              correctCategory,
              correctPayee
            })
            .catch((learningError: any) => {
              console.error('Error recording ledger transaction feedback:', learningError);
            });
        }
      } catch (feedbackError) {
        console.error('Error initiating ledger transaction feedback:', feedbackError);
      }
      
      // Refresh transactions list
      await loadCategories();
      loadTransactions();
      setFormOpen(false);

      if (similarUpdatedCount > 0) {
        setSnackbar({
          open: true,
          message: `Transaction saved. Applied changes to ${similarUpdatedCount} similar transaction${similarUpdatedCount === 1 ? '' : 's'}.`,
          severity: 'success'
        });
      } else if (shouldApplyToSimilar) {
        setSnackbar({
          open: true,
          message: 'Transaction saved, but no similar transactions matched the current description pattern.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save transaction to database',
        severity: 'error'
      });
    }
  };

  // Initial load
  useEffect(() => {
    loadAccounts();
    loadCategories();
    loadTransactions();
  }, []);

  // Watch URL query params for dashboard drill-down (category/payee)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    const payee = params.get('payee');
    const sankeyMonth = params.get('sankeyMonth');
    const sankeyStart = params.get('sankeyStart');
    const sankeyEnd = params.get('sankeyEnd');
    const sankeyAccount = params.get('sankeyAccount');
    const categoryRollup = params.get('categoryRollup');
    const payeeRollup = params.get('payeeRollup');

    setDrilldownCategory(category);
    setDrilldownPayee(payee);
    setDrilldownMonth(sankeyMonth);
    setDrilldownStartDate(sankeyStart);
    setDrilldownEndDate(sankeyEnd);
    setDrilldownAccountId(
      sankeyAccount === 'all'
        ? 'all'
        : sankeyAccount
          ? Number(sankeyAccount)
          : null
    );
    setDrilldownCategoryRollup(categoryRollup);
    setDrilldownPayeeRollup(payeeRollup);
  }, [location.search]);

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      loadTransactions();
    }
  }, [selectedAccount, selectedType]);

  // Handle search button click
  const handleSearch = () => {
    loadTransactions();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedAccount('');
    setSelectedType('');
    setStartDate(null);
    setEndDate(null);
    setSelectedCategoryFilter('');
    setReviewFilter('');
    setAmountMin('');
    setAmountMax('');
    loadTransactions();
  };

  const handleOpenPendingTransferReview = async () => {
    try {
      const pendingTransactions = await window.api.transactions.getPendingTransferReview();
      const candidates = buildPendingTransferCandidates(pendingTransactions, accounts);

      if (candidates.length === 0) {
        setSnackbar({
          open: true,
          message: 'There are no pending transfers to review right now.',
          severity: 'warning'
        });
        return;
      }

      setPendingTransferCandidates(candidates);
      setPendingTransferReviewOpen(true);
    } catch (error) {
      console.error('Error loading pending transfer review candidates:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load pending transfers for review',
        severity: 'error'
      });
    }
  };

  const handlePendingTransferCandidateChange = (
    candidateId: string,
    updates: Partial<TransferCandidate>
  ) => {
    setPendingTransferCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, ...updates } : candidate
      )
    );
  };

  const canSavePendingTransferReview = useMemo(
    () =>
      !pendingTransferCandidates.some((candidate) => {
        if (candidate.resolution !== 'transfer') {
          return false;
        }

        return (
          !candidate.transaction.transaction_id ||
          !candidate.fromAccountId ||
          !candidate.toAccountId ||
          candidate.fromAccountId === candidate.toAccountId
        );
      }),
    [pendingTransferCandidates]
  );

  const handleSavePendingTransferReview = async () => {
    setSavingPendingTransfers(true);

    try {
      let convertedCount = 0;
      let clearedCount = 0;
      let deferredCount = 0;

      for (const candidate of pendingTransferCandidates) {
        const transactionId = candidate.transaction.transaction_id;
        if (!transactionId) {
          continue;
        }

        if (candidate.resolution === 'transfer') {
          const result = await window.api.transactions.convertPendingTransfer(
            transactionId,
            Number(candidate.fromAccountId),
            Number(candidate.toAccountId)
          );

          if (result.success) {
            convertedCount++;
          }
          continue;
        }

        if (candidate.resolution === 'regular') {
          const result = await window.api.transactions.setPendingTransferReview(
            transactionId,
            false
          );

          if (result.success) {
            clearedCount++;
          }
          continue;
        }

        deferredCount++;
      }

      setPendingTransferReviewOpen(false);
      setPendingTransferCandidates([]);
      await loadTransactions();

      setSnackbar({
        open: true,
        message:
          deferredCount > 0
            ? `Reviewed transfers. Converted ${convertedCount}, kept ${clearedCount} as regular, left ${deferredCount} pending.`
            : `Reviewed transfers. Converted ${convertedCount} and kept ${clearedCount} as regular.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving pending transfer review:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save transfer review changes',
        severity: 'error'
      });
    } finally {
      setSavingPendingTransfers(false);
    }
  };

  // Open form for creating a new transaction
  const handleAddTransaction = () => {
    setCurrentTransaction(null);
    setFormOpen(true);
  };

  // Open form for editing an existing transaction
  const handleEditTransaction = (transaction: Transaction) => {
    if (transaction.transaction_type === TransactionType.TRANSFER) {
      setSnackbar({
        open: true,
        message: 'Transfers cannot be edited individually. Delete and recreate the transfer instead.',
        severity: 'warning'
      });
      return;
    }

    setCurrentTransaction(transaction);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  // Delete transaction
  const handleDeleteConfirm = async () => {
    if (transactionToDelete?.transaction_id) {
      try {
        const result = await window.api.transactions.delete(transactionToDelete.transaction_id);
        if (result.success) {
          setSnackbar({
            open: true,
            message:
              transactionToDelete.transaction_type === TransactionType.TRANSFER
                ? 'Transfer deleted successfully from both accounts'
                : 'Transaction deleted successfully',
            severity: 'success'
          });
          loadTransactions();
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to delete transaction',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setSnackbar({
          open: true,
          message: 'An error occurred while deleting the transaction',
          severity: 'error'
        });
      }
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // Handle bulk delete
  const handleBulkDeleteConfirm = async () => {
    if (selectedTransactions.length > 0) {
      try {
        const result = await window.api.transactions.bulkDelete(selectedTransactions);
        
        if (result.success) {
          setSnackbar({
            open: true,
            message: `${result.count} transactions deleted successfully`,
            severity: 'success'
          });
          loadTransactions();
        } else if (result.partialSuccess) {
          setSnackbar({
            open: true,
            message: `${result.count} of ${result.totalCount} transactions deleted. Some transactions could not be deleted.`,
            severity: 'warning'
          });
          loadTransactions();
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to delete transactions: ' + (result.error || 'Unknown error'),
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error bulk deleting transactions:', error);
        setSnackbar({
          open: true,
          message: 'An error occurred while deleting the transactions',
          severity: 'error'
        });
      }
    }
    setBulkDeleteConfirmOpen(false);
    setSelectedTransactions([]);
  };


  // Toggle transaction selection
  const handleToggleSelect = (id: number) => {
    setSelectedTransactions(prev => {
      if (prev.includes(id)) {
        return prev.filter(transactionId => transactionId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle select all transactions (current view)
  const handleToggleSelectAll = () => {
    if (selectedTransactions.length === displayedTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(
        displayedTransactions
          .map((t) => t.transaction_id || 0)
          .filter((id) => id !== 0)
      );
    }
  };

  // Format transaction date
  const formatDate = (dateString: string) => {
    // Parse the date components to avoid timezone issues
    // dateString is in format YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    // Create date using local timezone (month is 0-indexed in JS)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get account name by ID
  const getAccountName = (accountId: number) => {
    const account = accounts.find(a => a.account_id === accountId);
    return account ? account.name : `Account ${accountId}`;
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: TransactionType) => {
    const typeMap: Record<string, string> = {
      [TransactionType.INCOME]: 'Income',
      [TransactionType.EXPENSE]: 'Expense',
      [TransactionType.TRANSFER]: 'Transfer'
    };
    return typeMap[type] || type;
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: TransactionType) => {
    const colorMap: Record<string, 'success' | 'error' | 'primary'> = {
      [TransactionType.INCOME]: 'success',
      [TransactionType.EXPENSE]: 'error',
      [TransactionType.TRANSFER]: 'primary'
    };
    return colorMap[type] || 'default';
  };

  const displayedTransactions = useMemo(() => {
    let data = transactions;
    let sankeyScope = transactions;

    if (drilldownStartDate && drilldownEndDate) {
      const isWithinRange = (date: string) =>
        date >= drilldownStartDate && date <= drilldownEndDate;
      sankeyScope = sankeyScope.filter((t: any) => isWithinRange(t.date));
      data = data.filter((t: any) => isWithinRange(t.date));
    } else if (drilldownMonth) {
      sankeyScope = sankeyScope.filter((t: any) => isWithinMonth(t.date, drilldownMonth));
      data = data.filter((t: any) => isWithinMonth(t.date, drilldownMonth));
    }

    if (drilldownAccountId && drilldownAccountId !== 'all') {
      sankeyScope = sankeyScope.filter((t: any) => t.account_id === drilldownAccountId);
      data = data.filter((t: any) => t.account_id === drilldownAccountId);
    }

    const sankeyMetadata = getMonthlySpendingRollupMetadata(sankeyScope as any[]);

    if (drilldownCategory) {
      data = data.filter(
        (t: any) =>
          (t.category_name || getCategoryName(t.category_id ?? null)) ===
          drilldownCategory
      );
    }

    if (drilldownPayee) {
      data = data.filter(
        (t: any) => (t.payee_name || '').trim() === drilldownPayee.trim()
      );
    }

    if (drilldownCategoryRollup === 'other') {
      data = data.filter(
        (t: any) =>
          t.transaction_type === 'expense' &&
          getSankeyCategoryLabel(t.category_name || null, sankeyMetadata) ===
            'Other categories'
      );
    }

    if (drilldownPayeeRollup === 'other') {
      data = data.filter(
        (t: any) =>
          t.transaction_type === 'expense' &&
          getSankeyMerchantLabel(t.payee_name || null, sankeyMetadata) ===
            'Other merchants'
      );
    }

    if (drilldownPayeeRollup === 'none') {
      data = data.filter(
        (t: any) =>
          t.transaction_type === 'expense' && !(t.payee_name || '').trim()
      );
    }

    if (selectedCategoryFilter) {
      data = data.filter(
        (t: any) => (t.category_id ?? null) === selectedCategoryFilter
      );
    }

    if (reviewFilter === 'needs_review') {
      data = data.filter(
        (t: any) =>
          t.pending_transfer_review || !t.category_id || !(t.payee_name || '').trim()
      );
    }

    if (reviewFilter === 'needs_transfer') {
      data = data.filter((t: any) => t.pending_transfer_review);
    }

    if (reviewFilter === 'needs_category') {
      data = data.filter((t: any) => !t.category_id);
    }

    if (reviewFilter === 'needs_payee') {
      data = data.filter((t: any) => !(t.payee_name || '').trim());
    }

    if (reviewFilter === 'ready') {
      data = data.filter(
        (t: any) =>
          !t.pending_transfer_review && t.category_id && (t.payee_name || '').trim()
      );
    }

    const min =
      amountMin.trim() !== '' ? parseFloat(amountMin.trim()) : null;
    const max =
      amountMax.trim() !== '' ? parseFloat(amountMax.trim()) : null;

    if (min !== null && !Number.isNaN(min)) {
      data = data.filter((t: any) => typeof t.amount === 'number' && t.amount >= min);
    }

    if (max !== null && !Number.isNaN(max)) {
      data = data.filter((t: any) => typeof t.amount === 'number' && t.amount <= max);
    }

    if (!sortBy) {
      return data;
    }

    const sorted = [...data].sort((a: any, b: any) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      const getValue = (t: any) => {
        switch (sortBy) {
          case 'date':
            return t.date || '';
          case 'description':
            return (t.description || '').toLowerCase();
          case 'payee':
            return (t.payee_name || '').toLowerCase();
          case 'account':
            return getAccountName(t.account_id).toLowerCase();
          case 'category':
            return (t.category_name ||
              getCategoryName(t.category_id ?? null)).toLowerCase();
          case 'type':
            return getTransactionTypeLabel(t.transaction_type);
          case 'amount':
            return t.amount || 0;
          default:
            return '';
        }
      };

      const va = getValue(a);
      const vb = getValue(b);

      if (sortBy === 'amount') {
        return (va - vb) * dir;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return sorted;
  }, [
    transactions,
    drilldownCategory,
    drilldownPayee,
    drilldownMonth,
    drilldownStartDate,
    drilldownEndDate,
    drilldownAccountId,
    drilldownCategoryRollup,
    drilldownPayeeRollup,
    selectedCategoryFilter,
    reviewFilter,
    amountMin,
    amountMax,
    sortBy,
    sortDirection,
    accounts,
    categories
  ]);

  const handleSort = (key: SortKey) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const hasAccounts = accounts.length > 0;
  const canCreateTransfers = accounts.length > 1;
  const reviewCounts = useMemo(() => {
    const pendingTransfers = transactions.filter(
      (transaction) => transaction.pending_transfer_review
    ).length;
    const uncategorized = transactions.filter((transaction) => !transaction.category_id).length;
    const noPayee = transactions.filter((transaction) => !(transaction.payee_name || '').trim()).length;
    const needsReview = transactions.filter(
      (transaction) =>
        transaction.pending_transfer_review ||
        !transaction.category_id ||
        !(transaction.payee_name || '').trim()
    ).length;

    return {
      pendingTransfers,
      uncategorized,
      noPayee,
      needsReview,
      ready: Math.max(transactions.length - needsReview, 0)
    };
  }, [transactions]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Ledger</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportWizardOpen(true)}
            disabled={!hasAccounts}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export
          </Button>
          {selectedTransactions.length > 0 && (
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setBulkDeleteConfirmOpen(true)}
            >
              Delete Selected ({selectedTransactions.length})
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddTransaction}
            disabled={!hasAccounts}
            sx={{ mr: 1 }}
          >
            Add Transaction
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => setTransferDialogOpen(true)}
            disabled={!canCreateTransfers}
          >
            Transfer
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleOpenPendingTransferReview}
            disabled={!hasAccounts}
          >
            Review Transfers{reviewCounts.pendingTransfers > 0 ? ` (${reviewCounts.pendingTransfers})` : ''}
          </Button>
        </Box>
      </Box>

      {!hasAccounts && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/accounts')}>
              Create Account
            </Button>
          }
        >
          Create your first account before importing data, adding transactions, or recording transfers.
        </Alert>
      )}

      {hasAccounts && !canCreateTransfers && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Add a second account if you want to record transfers between accounts.
        </Alert>
      )}

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <FilterListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Filters
          </Typography>
          <Button 
            size="small" 
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`Needs Review (${reviewCounts.needsReview})`}
            color={reviewFilter === 'needs_review' ? 'warning' : 'default'}
            variant={reviewFilter === 'needs_review' ? 'filled' : 'outlined'}
            onClick={() =>
              setReviewFilter((prev) => (prev === 'needs_review' ? '' : 'needs_review'))
            }
          />
          <Chip
            label={`Pending Transfers (${reviewCounts.pendingTransfers})`}
            color={reviewFilter === 'needs_transfer' ? 'warning' : 'default'}
            variant={reviewFilter === 'needs_transfer' ? 'filled' : 'outlined'}
            onClick={() =>
              setReviewFilter((prev) => (prev === 'needs_transfer' ? '' : 'needs_transfer'))
            }
          />
          <Chip
            label={`Uncategorized (${reviewCounts.uncategorized})`}
            color={reviewFilter === 'needs_category' ? 'warning' : 'default'}
            variant={reviewFilter === 'needs_category' ? 'filled' : 'outlined'}
            onClick={() =>
              setReviewFilter((prev) => (prev === 'needs_category' ? '' : 'needs_category'))
            }
          />
          <Chip
            label={`No Payee (${reviewCounts.noPayee})`}
            color={reviewFilter === 'needs_payee' ? 'warning' : 'default'}
            variant={reviewFilter === 'needs_payee' ? 'filled' : 'outlined'}
            onClick={() =>
              setReviewFilter((prev) => (prev === 'needs_payee' ? '' : 'needs_payee'))
            }
          />
          <Chip
            label={`Ready (${reviewCounts.ready})`}
            color={reviewFilter === 'ready' ? 'success' : 'default'}
            variant={reviewFilter === 'ready' ? 'filled' : 'outlined'}
            onClick={() => setReviewFilter((prev) => (prev === 'ready' ? '' : 'ready'))}
          />
        </Box>
        
        <Grid container spacing={2}>
          {/* Search by description */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search Description"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {/* Filter by account */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Account</InputLabel>
              <Select
                value={selectedAccount}
                label="Account"
                onChange={(e) => setSelectedAccount(e.target.value as number)}
              >
                <MenuItem value="">
                  <em>All Accounts</em>
                </MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.account_id} value={account.account_id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Filter by transaction type */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                label="Type"
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Types</em>
                </MenuItem>
                {Object.values(TransactionType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {getTransactionTypeLabel(type as TransactionType)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Date range filter */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              size="small"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Filter by category */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategoryFilter}
                label="Category"
                onChange={(e) =>
                  setSelectedCategoryFilter(
                    e.target.value === '' ? '' : (e.target.value as number)
                  )
                }
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem
                    key={category.category_id}
                    value={category.category_id}
                  >
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Review Status</InputLabel>
              <Select
                value={reviewFilter}
                label="Review Status"
                onChange={(e) =>
                  setReviewFilter(
                    e.target.value as '' | 'needs_review' | 'needs_category' | 'needs_payee' | 'ready'
                    | 'needs_transfer'
                  )
                }
              >
                <MenuItem value="">
                  <em>All Transactions</em>
                </MenuItem>
                <MenuItem value="needs_review">Needs Review</MenuItem>
                <MenuItem value="needs_transfer">Pending Transfers</MenuItem>
                <MenuItem value="needs_category">Uncategorized</MenuItem>
                <MenuItem value="needs_payee">No Payee</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Filter by amount range */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Min Amount"
              type="number"
              fullWidth
              size="small"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Max Amount"
              type="number"
              fullWidth
              size="small"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </Grid>
          
          {/* Apply date range filter button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
              >
                Apply Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedTransactions.length > 0 &&
                      selectedTransactions.length < displayedTransactions.length
                    }
                    checked={
                      displayedTransactions.length > 0 &&
                      selectedTransactions.length ===
                        displayedTransactions.length
                    }
                    onChange={handleToggleSelectAll}
                  />
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('date')}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('description')}
                >
                  Description
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('payee')}
                >
                  Payee
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('account')}
                >
                  Account
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('category')}
                >
                  Category
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('type')}
                >
                  Type
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSort('amount')}
                >
                  Amount
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography sx={{ py: 2 }}>
                      {hasAccounts
                        ? 'No transactions found. Try adjusting your filters or adding a new transaction.'
                        : 'No accounts yet. Create your first account before adding or importing transactions.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.transaction_id!)}
                        onChange={() => handleToggleSelect(transaction.transaction_id!)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.description || 'No description'}</TableCell>
                    <TableCell>{transaction.payee_name || 'No payee'}</TableCell>
                    <TableCell>{getAccountName(transaction.account_id)}</TableCell>
                    <TableCell>{getCategoryName(transaction.category_id ?? null)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTransactionTypeLabel(transaction.transaction_type)}
                        color={getTransactionTypeColor(transaction.transaction_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ 
                      color: transaction.transaction_type === TransactionType.EXPENSE 
                        ? 'error.main' 
                        : transaction.transaction_type === TransactionType.INCOME 
                          ? 'success.main' 
                          : 'inherit' 
                    }}>
                      {formatAmount(transaction.amount)}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(transaction)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {transactionToDelete?.transaction_type === TransactionType.TRANSFER
              ? 'Delete Transfer'
              : 'Delete Transaction'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {transactionToDelete?.transaction_type === TransactionType.TRANSFER
              ? 'Deleting this transfer will remove both sides of the transfer and recalculate the account balances. This action cannot be undone.'
              : 'Are you sure you want to delete this transaction? This action cannot be undone.'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Multiple Transactions
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete {selectedTransactions.length} selected transactions? This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setBulkDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleBulkDeleteConfirm}
            >
              Delete {selectedTransactions.length} Transactions
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Transaction Form Dialog */}
      <TransactionFormDialog
        open={formOpen}
        transaction={currentTransaction}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveTransaction}
      />
      
      {/* Import Wizard */}
      <ImportWizard
        open={importWizardOpen}
        onClose={() => {
          setImportWizardOpen(false);
          // Refresh transactions after import
          loadTransactions();
        }}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
      
      {/* Transfer Dialog */}
      <TransferDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        onTransferComplete={(success, message) => {
          setSnackbar({
            open: true,
            message: message,
            severity: success ? 'success' : 'error'
          });
          if (success) {
            loadTransactions(); // Refresh transactions list
          }
        }}
      />

      <Dialog
        open={pendingTransferReviewOpen}
        onClose={() => setPendingTransferReviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <TransferReviewStep
            candidates={pendingTransferCandidates}
            accounts={accounts}
            onCandidateChange={handlePendingTransferCandidateChange}
            context="ledger"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button
              onClick={() => setPendingTransferReviewOpen(false)}
              disabled={savingPendingTransfers}
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={handleSavePendingTransferReview}
              disabled={savingPendingTransfers || !canSavePendingTransferReview}
            >
              {savingPendingTransfers ? 'Saving...' : 'Save Review'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage;
