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
import PaidIcon from '@mui/icons-material/Paid';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { RecurringBill } from '../../../data-storage/models/RecurringBill';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';
import BillFormDialog from './BillFormDialog';

interface BillsPageProps {
  inSettingsPage?: boolean;
}

const BillsPage: React.FC<BillsPageProps> = ({ inSettingsPage = false }) => {
  const [bills, setBills] = useState<RecurringBill[]>([]);
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
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<RecurringBill | null>(null);

  // Load bills and related data
  const loadBills = async () => {
    try {
      setLoading(true);
      const [billsData, accountsData, categoriesData, payeesData] = await Promise.all([
        window.api.bills.getAll(),
        window.api.accounts.getAll(),
        window.api.categories.getAll(),
        window.api.payees.getAll()
      ]);
      setBills(billsData || []);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
      setPayees(payeesData || []);
    } catch (error) {
      console.error('Error loading bills:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load bills from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format frequency
  const formatFrequency = (frequency: string) => {
    const frequencyMap: Record<string, string> = {
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'annual': 'Annual'
    };
    return frequencyMap[frequency] || frequency;
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
  const activeBills = bills.filter(bill => bill.active);
  const totalMonthlyAmount = activeBills.reduce((sum, bill) => {
    // Convert to monthly amount based on frequency
    const multiplier = {
      'weekly': 4.33,
      'biweekly': 2.17,
      'monthly': 1,
      'quarterly': 0.33,
      'annual': 0.083
    }[bill.frequency] || 1;
    return sum + (bill.amount * multiplier);
  }, 0);

  const upcomingBills = activeBills.filter(bill => {
    const today = new Date();
    const startDate = new Date(bill.start_date);
    const timeDiff = startDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 7 && daysDiff >= 0;
  });

  // Handle bill form submission
  const handleBillSave = async (billData: Partial<RecurringBill>) => {
    try {
      if (editingBill) {
        await window.api.bills.update(editingBill.bill_id!, billData as RecurringBill);
        setSnackbar({
          open: true,
          message: 'Bill updated successfully',
          severity: 'success'
        });
      } else {
        await window.api.bills.create(billData as RecurringBill);
        setSnackbar({
          open: true,
          message: 'Bill created successfully',
          severity: 'success'
        });
      }
      await loadBills();
      setFormDialogOpen(false);
      setEditingBill(null);
    } catch (error) {
      console.error('Error saving bill:', error);
      setSnackbar({
        open: true,
        message: 'Error saving bill',
        severity: 'error'
      });
    }
  };

  // Handle bill deletion
  const handleBillDelete = async () => {
    if (!billToDelete) return;
    
    try {
      await window.api.bills.delete(billToDelete.bill_id!);
      setSnackbar({
        open: true,
        message: 'Bill deleted successfully',
        severity: 'success'
      });
      await loadBills();
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting bill',
        severity: 'error'
      });
    }
  };

  // Handle add bill
  const handleAddBill = () => {
    setEditingBill(null);
    setFormDialogOpen(true);
  };

  // Handle edit bill
  const handleEditBill = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormDialogOpen(true);
  };

  // Handle delete bill
  const handleDeleteBill = (bill: RecurringBill) => {
    setBillToDelete(bill);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      {!inSettingsPage && (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>Bills & Subscriptions</Typography>
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PaidIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Monthly Total
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(totalMonthlyAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimated monthly spending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Active Bills
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {activeBills.length}
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
                    <NotificationsIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      Upcoming
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {upcomingBills.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due this week
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AddIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="info.main">
                      Total Bills
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {bills.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All bills tracked
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {inSettingsPage && <Typography variant="h6">Manage Bills</Typography>}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddBill}
        >
          Add Bill
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
                <TableCell>Bill Name</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography sx={{ py: 2 }}>
                      No bills found. Click 'Add Bill' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill.bill_id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {bill.auto_pay && <PaidIcon color="success" fontSize="small" />}
                        {bill.bill_name}
                      </Box>
                    </TableCell>
                    <TableCell>{getPayeeName(bill.payee_id)}</TableCell>
                    <TableCell>{formatCurrency(bill.amount)}</TableCell>
                    <TableCell>{formatFrequency(bill.frequency)}</TableCell>
                    <TableCell>{getCategoryName(bill.category_id)}</TableCell>
                    <TableCell>{getAccountName(bill.account_id)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={bill.active ? 'Active' : 'Inactive'}
                        color={bill.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditBill(bill)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteBill(bill)}
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

      {/* Bill Form Dialog */}
      <BillFormDialog
        open={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          setEditingBill(null);
        }}
        onSave={handleBillSave}
        bill={editingBill}
        accounts={accounts}
        categories={categories}
        payees={payees}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setBillToDelete(null);
        }}
      >
        <DialogTitle>Delete Bill</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the bill "{billToDelete?.bill_name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setBillToDelete(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleBillDelete}
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

export default BillsPage;