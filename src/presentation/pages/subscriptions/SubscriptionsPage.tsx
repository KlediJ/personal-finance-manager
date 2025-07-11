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
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { RecurringBill } from '../../../data-storage/models/RecurringBill';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';
import SubscriptionFormDialog from './SubscriptionFormDialog';

interface SubscriptionsPageProps {
  inSettingsPage?: boolean;
}

const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({ inSettingsPage = false }) => {
  const [subscriptions, setSubscriptions] = useState<RecurringBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<RecurringBill | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<RecurringBill | null>(null);

  // Load subscriptions and related data
  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const [billsData, accountsData, categoriesData, payeesData] = await Promise.all([
        window.api.bills.getAll(),
        window.api.accounts.getAll(),
        window.api.categories.getAll(),
        window.api.payees.getAll()
      ]);
      
      // Filter for subscription-like bills (typically monthly/annual recurring payments)
      const subscriptionBills = (billsData || []).filter((bill: RecurringBill) => 
        bill.frequency === 'monthly' || bill.frequency === 'annual'
      );
      
      setSubscriptions(subscriptionBills);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
      setPayees(payeesData || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load subscriptions from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get payee name
  const getPayeeName = (payeeId: number) => {
    const payee = payees.find(p => p.payee_id === payeeId);
    return payee?.name || 'Unknown';
  };

  // Get category name
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.name || 'Unknown';
  };

  // Get account name
  const getAccountName = (accountId: number) => {
    const account = accounts.find(a => a.account_id === accountId);
    return account?.name || 'Unknown';
  };

  // Calculate summary statistics
  const activeSubscriptions = subscriptions.filter(sub => sub.active);
  const totalMonthlyAmount = activeSubscriptions.reduce((sum, sub) => {
    // Convert to monthly amount
    const multiplier = sub.frequency === 'annual' ? 0.083 : 1;
    return sum + (sub.amount * multiplier);
  }, 0);

  const totalAnnualAmount = activeSubscriptions.reduce((sum, sub) => {
    // Convert to annual amount
    const multiplier = sub.frequency === 'monthly' ? 12 : 1;
    return sum + (sub.amount * multiplier);
  }, 0);

  const pausedSubscriptions = subscriptions.filter(sub => !sub.active);

  // Handle subscription form submission
  const handleSubscriptionSave = async (subscriptionData: Partial<RecurringBill>) => {
    try {
      if (editingSubscription) {
        await window.api.bills.update(editingSubscription.bill_id!, subscriptionData as RecurringBill);
        setSnackbar({
          open: true,
          message: 'Subscription updated successfully',
          severity: 'success'
        });
      } else {
        await window.api.bills.create(subscriptionData as RecurringBill);
        setSnackbar({
          open: true,
          message: 'Subscription created successfully',
          severity: 'success'
        });
      }
      await loadSubscriptions();
      setFormDialogOpen(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error saving subscription:', error);
      setSnackbar({
        open: true,
        message: 'Error saving subscription',
        severity: 'error'
      });
    }
  };

  // Handle subscription deletion
  const handleSubscriptionDelete = async () => {
    if (!subscriptionToDelete) return;
    
    try {
      await window.api.bills.delete(subscriptionToDelete.bill_id!);
      setSnackbar({
        open: true,
        message: 'Subscription deleted successfully',
        severity: 'success'
      });
      await loadSubscriptions();
      setDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
    } catch (error) {
      console.error('Error deleting subscription:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting subscription',
        severity: 'error'
      });
    }
  };

  // Handle add subscription
  const handleAddSubscription = () => {
    setEditingSubscription(null);
    setFormDialogOpen(true);
  };

  // Handle edit subscription
  const handleEditSubscription = (subscription: RecurringBill) => {
    setEditingSubscription(subscription);
    setFormDialogOpen(true);
  };

  // Handle delete subscription
  const handleDeleteSubscription = (subscription: RecurringBill) => {
    setSubscriptionToDelete(subscription);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      {!inSettingsPage && (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>Subscriptions</Typography>
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SubscriptionsIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Monthly Total
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalMonthlyAmount)}
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
                    <SubscriptionsIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      Annual Total
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalAnnualAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Per year
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PlayArrowIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Active
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {activeSubscriptions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currently active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PauseIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="error.main">
                      Paused
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {pausedSubscriptions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive/Paused
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {inSettingsPage && <Typography variant="h6">Manage Subscriptions</Typography>}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddSubscription}
        >
          Add Subscription
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
                <TableCell>Service</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Billing</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography sx={{ py: 2 }}>
                      No subscriptions found. Click 'Add Subscription' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((subscription) => (
                  <TableRow key={subscription.bill_id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SubscriptionsIcon color="primary" fontSize="small" />
                        {subscription.bill_name}
                      </Box>
                    </TableCell>
                    <TableCell>{getPayeeName(subscription.payee_id)}</TableCell>
                    <TableCell>{formatCurrency(subscription.amount)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={subscription.frequency === 'monthly' ? 'Monthly' : 'Annual'}
                        color={subscription.frequency === 'monthly' ? 'primary' : 'secondary'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{getCategoryName(subscription.category_id)}</TableCell>
                    <TableCell>{getAccountName(subscription.account_id)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={subscription.active ? 'Active' : 'Paused'}
                        color={subscription.active ? 'success' : 'error'}
                        size="small"
                        icon={subscription.active ? <PlayArrowIcon /> : <PauseIcon />}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditSubscription(subscription)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteSubscription(subscription)}
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

      {/* Subscription Form Dialog */}
      <SubscriptionFormDialog
        open={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          setEditingSubscription(null);
        }}
        onSave={handleSubscriptionSave}
        subscription={editingSubscription}
        accounts={accounts}
        categories={categories}
        payees={payees}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSubscriptionToDelete(null);
        }}
      >
        <DialogTitle>Delete Subscription</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the subscription "{subscriptionToDelete?.bill_name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSubscriptionToDelete(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubscriptionDelete}
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

export default SubscriptionsPage;