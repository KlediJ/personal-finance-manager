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
  LinearProgress,
  TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import PaymentIcon from '@mui/icons-material/Payment';
import { Account, EnhancedAccount, AccountType } from '../../../data-storage/models/Account';
import AccountFormDialog from '../accounts/AccountFormDialog';

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
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Account | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitEditingCard, setLimitEditingCard] = useState<EnhancedAccount | null>(null);
  const [limitValue, setLimitValue] = useState<string>('');
  const [interestRateValue, setInterestRateValue] = useState<string>('');

  // Load credit cards
  const loadCreditCards = async () => {
    try {
      setLoading(true);
      const accountsData = await window.api.accounts.getAll();
      // Filter for credit card accounts
      const creditCardAccounts = (accountsData || []).filter(
        (account: EnhancedAccount) => account.type === AccountType.CREDIT_CARD
      );

      const cardsWithDetails: EnhancedAccount[] = await Promise.all(
        creditCardAccounts.map(async (card: any) => {
          try {
            const details = await window.api.accounts.getDetails(
              card.account_id
            );
            return {
              ...card,
              details: details || undefined
            } as EnhancedAccount;
          } catch {
            return card as EnhancedAccount;
          }
        })
      );

      setCreditCards(cardsWithDetails);
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

  // Estimate monthly interest expense based on current balance and APR
  const calculateMonthlyInterest = (balance: number, apr?: number) => {
    if (!apr || apr <= 0) return 0;
    const annualRate = apr / 100;
    return Math.abs(balance) * (annualRate / 12);
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
  const totalMonthlyInterest = creditCards.reduce((sum, card) => {
    const balance = Math.abs(card.current_balance);
    const apr = card.details?.interest_rate || 0;
    return sum + calculateMonthlyInterest(balance, apr);
  }, 0);

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
    const newCard: Account = {
      account_id: 0,
      name: '',
      type: AccountType.CREDIT_CARD,
      opening_balance: 0,
      current_balance: 0,
      currency: 'USD',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setEditingCard(newCard);
    setCardFormOpen(true);
  };

  // Handle edit credit card
  const handleEditCreditCard = (card: EnhancedAccount) => {
    const asAccount: Account = {
      account_id: card.account_id,
      name: card.name,
      type: card.type,
      opening_balance: card.opening_balance,
      current_balance: card.current_balance,
      currency: card.currency,
      active: card.active,
      created_at: card.created_at,
      updated_at: card.updated_at
    };
    setEditingCard(asAccount);
    setCardFormOpen(true);
  };

  // Handle delete credit card
  const handleDeleteCreditCard = (card: EnhancedAccount) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  const handleEditCreditLimit = (card: EnhancedAccount) => {
    const currentLimit = card.details?.credit_limit ?? 0;
    const currentRate = card.details?.interest_rate ?? 0;
    setLimitEditingCard(card);
    setLimitValue(currentLimit ? String(currentLimit) : '');
    setInterestRateValue(currentRate ? String(currentRate) : '');
    setLimitDialogOpen(true);
  };

  // Save credit card (create or update underlying account as CREDIT_CARD)
  const handleSaveCreditCard = async (account: Account) => {
    try {
      const payload: Account = {
        ...account,
        type: AccountType.CREDIT_CARD
      };

      if (payload.account_id) {
        const result = await window.api.accounts.update(
          payload.account_id,
          payload
        );
        if (!result.success) {
          throw new Error('Update failed');
        }
        setSnackbar({
          open: true,
          message: 'Credit card updated successfully',
          severity: 'success'
        });
      } else {
        const result = await window.api.accounts.create(payload);
        if (!result.success) {
          throw new Error('Creation failed');
        }
        setSnackbar({
          open: true,
          message: 'Credit card added successfully',
          severity: 'success'
        });
      }

      await loadCreditCards();
      setCardFormOpen(false);
      setEditingCard(null);
    } catch (error) {
      console.error('Error saving credit card:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save credit card',
        severity: 'error'
      });
    }
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
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Est. monthly interest: {formatCurrency(totalMonthlyInterest)}
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
                <TableCell>Est. Monthly Interest</TableCell>
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
                  const apr = card.details?.interest_rate || 0;
                  const utilization = calculateUtilization(balance, limit);
                  const available = limit - balance;
                  const monthlyInterest = calculateMonthlyInterest(balance, apr);
                  
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
                      <TableCell
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleEditCreditLimit(card)}
                      >
                        {formatCurrency(limit)}
                      </TableCell>
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
                        <Typography color={apr > 0 ? 'warning.main' : 'text.secondary'}>
                          {apr > 0 ? formatCurrency(monthlyInterest) : '-'}
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

      {/* Credit Card Form Dialog (reuses AccountFormDialog) */}
      <AccountFormDialog
        open={cardFormOpen}
        account={editingCard}
        onClose={() => {
          setCardFormOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCreditCard}
      />

      {/* Credit Limit Dialog */}
      <Dialog
        open={limitDialogOpen}
        onClose={() => {
          setLimitDialogOpen(false);
          setLimitEditingCard(null);
          setLimitValue('');
          setInterestRateValue('');
        }}
      >
        <DialogTitle>Edit Credit Card Terms</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {limitEditingCard
              ? `Set terms for ${limitEditingCard.name}:`
              : 'Set credit card terms:'}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Credit Limit"
            type="number"
            fullWidth
            value={limitValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLimitValue(e.target.value)
            }
          />
          <TextField
            margin="dense"
            label="Interest Rate (APR %)"
            type="number"
            fullWidth
            value={interestRateValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInterestRateValue(e.target.value)
            }
          />
          {limitEditingCard && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                This estimate assumes simple interest on the current balance.
              </Typography>
              {(() => {
                const parsedLimitRate = parseFloat(interestRateValue || '0');
                const safeRate = Number.isNaN(parsedLimitRate)
                  ? 0
                  : parsedLimitRate;
                const estMonthly = calculateMonthlyInterest(
                  Math.abs(limitEditingCard.current_balance),
                  safeRate
                );
                return safeRate > 0 ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Estimated monthly interest at {safeRate.toFixed(2)}% APR:{' '}
                    {formatCurrency(estMonthly)}
                  </Typography>
                ) : null;
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLimitDialogOpen(false);
              setLimitEditingCard(null);
              setLimitValue('');
              setInterestRateValue('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!limitEditingCard) {
                setLimitDialogOpen(false);
                return;
              }
              const parsed = parseFloat(limitValue || '0');
              const safeLimit = Number.isNaN(parsed) ? 0 : parsed;
              const parsedRate = parseFloat(interestRateValue || '0');
              const safeRate = Number.isNaN(parsedRate) ? 0 : parsedRate;
              try {
                const result = await window.api.accounts.saveDetails({
                  account_id: limitEditingCard.account_id,
                  credit_limit: safeLimit,
                  interest_rate: safeRate > 0 ? safeRate : null
                });
                if (!result.success) {
                  throw new Error(result.error || 'Failed to save credit limit');
                }
                setSnackbar({
                  open: true,
                  message: 'Credit limit updated.',
                  severity: 'success'
                });
                await loadCreditCards();
              } catch (error) {
                console.error('Error saving credit limit:', error);
                setSnackbar({
                  open: true,
                  message: 'Failed to save credit limit',
                  severity: 'error'
                });
              } finally {
                setLimitDialogOpen(false);
                setLimitEditingCard(null);
                setLimitValue('');
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreditCardsPage;
