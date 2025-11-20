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
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentIcon from '@mui/icons-material/Payment';
import { LoanDetails, LoanType, PaymentFrequency } from '../../../data-storage/models/LoanDetails';
import { Account } from '../../../data-storage/models/Account';
import LoanFormDialog from './LoanFormDialog';

interface LoansPageProps {
  inSettingsPage?: boolean;
}

const LoansPage: React.FC<LoansPageProps> = ({ inSettingsPage = false }) => {
  const [loans, setLoans] = useState<LoanDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<LoanDetails | null>(null);
  const [loanFormOpen, setLoanFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanDetails | null>(null);

  // Load loans and related data
  const loadLoans = async () => {
    try {
      setLoading(true);
      const [loansData, accountsData] = await Promise.all([
        window.api.loans.getAll(),
        window.api.accounts.getAll()
      ]);
      setLoans(loansData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading loans:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load loans from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format loan type
  const formatLoanType = (type: LoanType) => {
    const typeMap: Record<LoanType, string> = {
      [LoanType.MORTGAGE]: 'Mortgage',
      [LoanType.AUTO]: 'Auto Loan',
      [LoanType.PERSONAL]: 'Personal Loan',
      [LoanType.STUDENT]: 'Student Loan',
      [LoanType.BUSINESS]: 'Business Loan',
      [LoanType.HOME_EQUITY]: 'Home Equity'
    };
    return typeMap[type] || type;
  };

  // Format payment frequency
  const formatPaymentFrequency = (frequency: PaymentFrequency) => {
    const frequencyMap: Record<PaymentFrequency, string> = {
      [PaymentFrequency.MONTHLY]: 'Monthly',
      [PaymentFrequency.BIWEEKLY]: 'Bi-weekly',
      [PaymentFrequency.WEEKLY]: 'Weekly',
      [PaymentFrequency.QUARTERLY]: 'Quarterly'
    };
    return frequencyMap[frequency] || frequency;
  };

  // Get account name
  const getAccountName = (accountId: number) => {
    const account = accounts.find(a => a.account_id === accountId);
    return account?.name || 'Unknown';
  };

  // Calculate loan progress
  const calculateProgress = (original: number, current: number) => {
    const paid = original - current;
    return (paid / original) * 100;
  };

  // Calculate summary statistics
  const totalLoanBalance = loans.reduce((sum, loan) => sum + loan.current_balance, 0);
  const totalOriginalAmount = loans.reduce((sum, loan) => sum + loan.original_amount, 0);
  const totalMonthlyPayments = loans.reduce((sum, loan) => {
    // Convert to monthly payment
    const multiplier = {
      [PaymentFrequency.MONTHLY]: 1,
      [PaymentFrequency.BIWEEKLY]: 2.17,
      [PaymentFrequency.WEEKLY]: 4.33,
      [PaymentFrequency.QUARTERLY]: 0.33
    }[loan.payment_frequency] || 1;
    return sum + (loan.payment_amount * multiplier);
  }, 0);

  const averageInterestRate = loans.length > 0 
    ? loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length 
    : 0;

  // Handle loan deletion
  const handleLoanDelete = async () => {
    if (!loanToDelete) return;
    
    try {
      await window.api.loans.delete(loanToDelete.loan_id!);
      setSnackbar({
        open: true,
        message: 'Loan deleted successfully',
        severity: 'success'
      });
      await loadLoans();
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
    } catch (error) {
      console.error('Error deleting loan:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting loan',
        severity: 'error'
      });
    }
  };

  // Handle add loan
  const handleAddLoan = () => {
    setEditingLoan(null);
    setLoanFormOpen(true);
  };

  // Handle edit loan
  const handleEditLoan = (loan: LoanDetails) => {
    setEditingLoan(loan);
    setLoanFormOpen(true);
  };

  // Handle delete loan
  const handleDeleteLoan = (loan: LoanDetails) => {
    setLoanToDelete(loan);
    setDeleteDialogOpen(true);
  };

  // Save loan (create or update)
  const handleSaveLoan = async (loan: LoanDetails) => {
    try {
      if (loan.loan_id) {
        const result = await window.api.loans.update(loan.loan_id, loan);
        if (!result.success) {
          throw new Error('Update failed');
        }
        setSnackbar({
          open: true,
          message: 'Loan updated successfully',
          severity: 'success'
        });
      } else {
        const result = await window.api.loans.create(loan);
        if (!result.success) {
          throw new Error('Creation failed');
        }
        setSnackbar({
          open: true,
          message: 'Loan created successfully',
          severity: 'success'
        });
      }

      await loadLoans();
      setLoanFormOpen(false);
      setEditingLoan(null);
    } catch (error) {
      console.error('Error saving loan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save loan',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      {!inSettingsPage && (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>Loans & Credit</Typography>
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Total Balance
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalLoanBalance)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Outstanding debt
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PaymentIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      Monthly Payments
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalMonthlyPayments)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Per month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="info.main">
                      Avg Interest Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {averageInterestRate.toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Weighted average
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarTodayIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Active Loans
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {loans.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total loans
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {inSettingsPage && <Typography variant="h6">Manage Loans</Typography>}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddLoan}
        >
          Add Loan
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
                <TableCell>Loan Type</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Original Amount</TableCell>
                <TableCell>Current Balance</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Interest Rate</TableCell>
                <TableCell>Term</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography sx={{ py: 2 }}>
                      No loans found. Click 'Add Loan' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => {
                  const progress = calculateProgress(loan.original_amount, loan.current_balance);
                  return (
                    <TableRow key={loan.loan_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalanceIcon color="primary" fontSize="small" />
                          {formatLoanType(loan.loan_type)}
                        </Box>
                      </TableCell>
                      <TableCell>{getAccountName(loan.account_id)}</TableCell>
                      <TableCell>{formatCurrency(loan.original_amount)}</TableCell>
                      <TableCell>{formatCurrency(loan.current_balance)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ width: 80, height: 8 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {progress.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {formatCurrency(loan.payment_amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPaymentFrequency(loan.payment_frequency)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${loan.interest_rate.toFixed(2)}%`}
                          size="small"
                          variant="outlined"
                          color={loan.interest_rate > 7 ? 'error' : loan.interest_rate > 4 ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {loan.term_months} months
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditLoan(loan)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteLoan(loan)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setLoanToDelete(null);
        }}
      >
        <DialogTitle>Delete Loan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this loan? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setLoanToDelete(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleLoanDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loan Form Dialog */}
      <LoanFormDialog
        open={loanFormOpen}
        loan={editingLoan}
        accounts={accounts}
        onClose={() => {
          setLoanFormOpen(false);
          setEditingLoan(null);
        }}
        onSave={handleSaveLoan}
      />

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

export default LoansPage;
