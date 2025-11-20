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
import CalculateIcon from '@mui/icons-material/Calculate';
import { useLocation } from 'react-router-dom';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import TransactionFormDialog from './TransactionFormDialog';
import ImportWizard from '../import-export/ImportWizard';
import ExportDialog from '../import-export/ExportDialog';
import TransferDialog from '../../components/TransferDialog';

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
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  
  // State for import/export
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // State for transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  
  // State for filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | ''>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');

  // State for drill-down from dashboard (category/payee)
  const location = useLocation();
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [drilldownPayee, setDrilldownPayee] = useState<string | null>(null);

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
      
      console.log('Received transactions:', data);
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
  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      if (transaction.transaction_id) {
        // Update existing transaction
        console.log('Updating transaction:', transaction);
        const result = await window.api.transactions.update(transaction.transaction_id, transaction);
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
        console.log('Creating transaction:', transaction);
        const result = await window.api.transactions.create(transaction);
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
      
      // Refresh transactions list
      loadTransactions();
      setFormOpen(false);
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

    setDrilldownCategory(category);
    setDrilldownPayee(payee);
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
    setAmountMin('');
    setAmountMax('');
    loadTransactions();
  };

  // Open form for creating a new transaction
  const handleAddTransaction = () => {
    setCurrentTransaction(null);
    setFormOpen(true);
  };

  // Open form for editing an existing transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (transactionId: number) => {
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
  };

  // Delete transaction
  const handleDeleteConfirm = async () => {
    if (transactionToDelete) {
      try {
        console.log('Deleting transaction:', transactionToDelete);
        const result = await window.api.transactions.delete(transactionToDelete);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Transaction deleted successfully',
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

  // Handle balance recalculation
  const handleRecalculateBalances = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Recalculating account balances...',
        severity: 'warning'
      });
      
      const result = await window.api.transactions.recalculateBalances();
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Account balances recalculated successfully',
          severity: 'success'
        });
        
        // Refresh transactions to show updated balances
        loadTransactions();
      } else {
        throw new Error('Balance recalculation failed');
      }
    } catch (error) {
      console.error('Error recalculating balances:', error);
      setSnackbar({
        open: true,
        message: 'Failed to recalculate balances: ' + (error as Error).message,
        severity: 'error'
      });
    }
  };


  // Handle bulk delete
  const handleBulkDeleteConfirm = async () => {
    if (selectedTransactions.length > 0) {
      try {
        console.log('Bulk deleting transactions:', selectedTransactions);
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

    if (selectedCategoryFilter) {
      data = data.filter(
        (t: any) => (t.category_id ?? null) === selectedCategoryFilter
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
    selectedCategoryFilter,
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Ledger</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportWizardOpen(true)}
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
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={handleRecalculateBalances}
            color="secondary"
          >
            Recalculate Balances
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
            sx={{ mr: 1 }}
          >
            Add Transaction
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => setTransferDialogOpen(true)}
          >
            Transfer
          </Button>
        </Box>
      </Box>

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
                      No transactions found. Try adjusting your filters or adding a new transaction.
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
                        onClick={() => handleDeleteClick(transaction.transaction_id!)}
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
            Delete Transaction
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this transaction? This action cannot be undone.
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
    </Box>
  );
};

export default TransactionsPage;
