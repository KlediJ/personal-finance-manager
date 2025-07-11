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
import CreditCardIcon from '@mui/icons-material/CreditCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import PaymentIcon from '@mui/icons-material/Payment';
import { Account, EnhancedAccount, AccountType } from '../../../data-storage/models/Account';

interface CreditCardsPageProps {
  inSettingsPage?: boolean;
}

const CreditCardsPage: React.FC<CreditCardsPageProps> = ({ inSettingsPage = false }) => {
  const [creditCards, setCreditCards] = useState<EnhancedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<EnhancedAccount | null>(null);

  // Load credit cards
  const loadCreditCards = async () => {
    try {
      setLoading(true);
      const accountsData = await window.api.accounts.getAll();
      // Filter for credit card accounts
      const creditCardAccounts = (accountsData || []).filter(
        (account: EnhancedAccount) => account.type === AccountType.CREDIT_CARD
      );
      setCreditCards(creditCardAccounts);
    } catch (error) {
      console.error('Error loading credit cards:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load credit cards from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditCards();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate utilization percentage
  const calculateUtilization = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.abs((balance / limit) * 100);
  };

  // Get utilization color
  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'error';
    if (utilization > 70) return 'warning';
    if (utilization > 30) return 'info';
    return 'success';
  };

  // Calculate summary statistics
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.details?.credit_limit || 0), 0);
  const totalBalance = creditCards.reduce((sum, card) => sum + Math.abs(card.current_balance), 0);
  const averageUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
  const availableCredit = totalCreditLimit - totalBalance;

  // Handle credit card deletion
  const handleCardDelete = async () => {
    if (!cardToDelete) return;
    
    try {
      await window.api.accounts.delete(cardToDelete.account_id!);
      setSnackbar({
        open: true,
        message: 'Credit card deleted successfully',
        severity: 'success'
      });
      await loadCreditCards();
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (error) {
      console.error('Error deleting credit card:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting credit card',
        severity: 'error'
      });
    }
  };

  // Handle add credit card
  const handleAddCreditCard = () => {
    // TODO: Open credit card form dialog
    console.log('Add credit card clicked');
  };

  // Handle edit credit card
  const handleEditCreditCard = (card: EnhancedAccount) => {
    // TODO: Open edit dialog
    console.log('Edit credit card:', card.account_id);
  };

  // Handle delete credit card
  const handleDeleteCreditCard = (card: EnhancedAccount) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      {!inSettingsPage && (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>Credit Cards</Typography>
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CreditCardIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Total Balance
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalBalance)}
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
                    <PaymentIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="info.main">
                      Credit Limit
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalCreditLimit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total available
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon 
                      color={getUtilizationColor(averageUtilization)} 
                      sx={{ mr: 1 }} 
                    />
                    <Typography 
                      variant="h6" 
                      color={`${getUtilizationColor(averageUtilization)}.main`}
                    >
                      Utilization
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {averageUtilization.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credit usage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PaymentIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Available Credit
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(availableCredit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Remaining credit
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {inSettingsPage && <Typography variant="h6">Manage Credit Cards</Typography>}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddCreditCard}
        >
          Add Credit Card
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
                <TableCell>Card Name</TableCell>
                <TableCell>Institution</TableCell>
                <TableCell>Current Balance</TableCell>
                <TableCell>Credit Limit</TableCell>
                <TableCell>Utilization</TableCell>
                <TableCell>Available Credit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {creditCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography sx={{ py: 2 }}>
                      No credit cards found. Click 'Add Credit Card' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                creditCards.map((card) => {
                  const balance = Math.abs(card.current_balance);
                  const limit = card.details?.credit_limit || 0;
                  const utilization = calculateUtilization(balance, limit);
                  const available = limit - balance;
                  
                  return (
                    <TableRow key={card.account_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCardIcon color="primary" fontSize="small" />
                          {card.name}
                        </Box>
                      </TableCell>
                      <TableCell>{card.details?.institution_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Typography color={balance > 0 ? 'error' : 'success'}>
                          {formatCurrency(balance)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatCurrency(limit)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(utilization, 100)}
                            color={getUtilizationColor(utilization)}
                            sx={{ width: 80, height: 8 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {utilization.toFixed(1)}%
                          </Typography>
                          {utilization > 90 && <WarningIcon color="error" fontSize="small" />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography color={available > 0 ? 'success' : 'error'}>
                          {formatCurrency(available)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={card.active ? 'Active' : 'Inactive'}
                          color={card.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditCreditCard(card)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteCreditCard(card)}
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
          setCardToDelete(null);
        }}
      >
        <DialogTitle>Delete Credit Card</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the credit card "{cardToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setCardToDelete(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleCardDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
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

export default CreditCardsPage;