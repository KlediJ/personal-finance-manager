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
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Account, AccountType } from '../../../data-storage/models/Account';
import AccountFormDialog from './AccountFormDialog';

interface AccountsPageProps {
  inSettingsPage?: boolean;
}

const AccountsPage: React.FC<AccountsPageProps> = ({ inSettingsPage = false }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load accounts
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await window.api.accounts.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load accounts from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Open form for creating a new account
  const handleAddAccount = () => {
    setCurrentAccount(null);
    setFormOpen(true);
  };

  // Open form for editing an existing account
  const handleEditAccount = (account: Account) => {
    setCurrentAccount(account);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (accountId: number) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  // Delete account
  const handleDeleteConfirm = async () => {
    if (accountToDelete) {
      try {
        const result = await window.api.accounts.delete(accountToDelete);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Account deleted successfully',
            severity: 'success'
          });
          loadAccounts();
        } else {
          setSnackbar({
            open: true,
            message: result.error || 'Failed to delete account',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        setSnackbar({
          open: true,
          message: error instanceof Error ? error.message : 'An error occurred while deleting the account',
          severity: 'error'
        });
      }
    }
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  // Save account (create or update)
  const handleSaveAccount = async (account: Account) => {
    try {
      if (account.account_id) {
        // Update existing account
        const result = await window.api.accounts.update(account.account_id, account);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Account updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error('Update failed');
        }
      } else {
        // Create new account
        const result = await window.api.accounts.create(account);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Account created successfully',
            severity: 'success'
          });
        } else {
          throw new Error('Creation failed');
        }
      }
      
      // Refresh accounts list
      loadAccounts();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving account:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save account to database',
        severity: 'error'
      });
    }
  };

  // Get account type label for display
  const getAccountTypeLabel = (type: AccountType): string => {
    const typeMap: Record<string, string> = {
      'checking': 'Checking',
      'savings': 'Savings',
      'credit_card': 'Credit Card',
      'investment': 'Investment',
      'loan': 'Loan',
      'cash': 'Cash'
    };
    return typeMap[type] || type;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Calculate account summaries
  const accountSummary = accounts.reduce((summary, account) => {
    const type = account.type;
    if (!summary[type]) {
      summary[type] = { totalBalance: 0, count: 0 };
    }
    summary[type].totalBalance += account.current_balance;
    summary[type].count += 1;
    return summary;
  }, {} as Record<string, { totalBalance: number; count: number }>);

  const totalBalance = accounts.reduce((sum, account) => sum + account.current_balance, 0);

  return (
    <Box>
      {!inSettingsPage && (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>Accounts</Typography>
          
          {/* Account Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Total Balance
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(totalBalance, 'USD')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Across {accounts.length} accounts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {Object.entries(accountSummary).map(([type, data]) => (
              <Grid item xs={12} md={3} key={type}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      {getAccountTypeLabel(type as AccountType)}
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(data.totalBalance, 'USD')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.count} account{data.count !== 1 ? 's' : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {inSettingsPage && <Typography variant="h6">Manage Accounts</Typography>}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddAccount}
        >
          Add Account
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 2 }}>
                      No accounts found in database. Click 'Add Account' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.account_id}>
                    <TableCell>{account.account_id}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{getAccountTypeLabel(account.type)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(account.current_balance, account.currency)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={account.active ? 'Active' : 'Inactive'} 
                        color={account.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditAccount(account)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(account.account_id!)}
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

      {/* Account Form Dialog */}
      <AccountFormDialog
        open={formOpen}
        account={currentAccount}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveAccount}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Account
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this account from the database? This action cannot be undone.
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
    </Box>
  );
};

export default AccountsPage;
