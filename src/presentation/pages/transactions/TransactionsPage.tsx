import React, { useState, useEffect } from 'react';
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
import { Transaction, TransactionType, TransactionStatus } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import TransactionFormDialog from './TransactionFormDialog';
import ImportWizard from '../import-export/ImportWizard';
import ExportDialog from '../import-export/ExportDialog';

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
  
  // State for filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  
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
      } else if (selectedStatus) {
        // Filter by status
        data = await window.api.transactions.getByStatus(selectedStatus);
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
            message: 'Transaction created successfully',
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

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      loadTransactions();
    }
  }, [selectedAccount, selectedType, selectedStatus]);

  // Handle search button click
  const handleSearch = () => {
    loadTransactions();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedAccount('');
    setSelectedType('');
    setSelectedStatus('');
    setStartDate(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    setEndDate(new Date());
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

  // Toggle select all transactions
  const handleToggleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      // Select all visible transactions
      setSelectedTransactions(transactions.map(t => t.transaction_id || 0).filter(id => id !== 0));
    }
  };

  // Format transaction date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  // Get transaction status label
  const getTransactionStatusLabel = (status: TransactionStatus) => {
    const statusMap: Record<string, string> = {
      [TransactionStatus.PENDING]: 'Pending',
      [TransactionStatus.CLEARED]: 'Cleared',
      [TransactionStatus.RECONCILED]: 'Reconciled'
    };
    return statusMap[status] || status;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Transactions</Typography>
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
          >
            Add Transaction
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
          
          {/* Filter by status */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Statuses</em>
                </MenuItem>
                {Object.values(TransactionStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getTransactionStatusLabel(status as TransactionStatus)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                    indeterminate={selectedTransactions.length > 0 && selectedTransactions.length < transactions.length}
                    checked={transactions.length > 0 && selectedTransactions.length === transactions.length}
                    onChange={handleToggleSelectAll}
                  />
                </TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography sx={{ py: 2 }}>
                      No transactions found. Try adjusting your filters or adding a new transaction.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.transaction_id!)}
                        onChange={() => handleToggleSelect(transaction.transaction_id!)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.description || 'No description'}</TableCell>
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
                    <TableCell>
                      <Chip
                        label={getTransactionStatusLabel(transaction.status)}
                        variant="outlined"
                        size="small"
                      />
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
    </Box>
  );
};

export default TransactionsPage;