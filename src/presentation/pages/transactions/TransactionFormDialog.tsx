import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  SelectChangeEvent,
  FormHelperText
} from '@mui/material';
import { 
  Transaction, 
  TransactionType, 
  TransactionStatus 
} from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';

interface TransactionFormDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

// Default new transaction values
const defaultTransaction: Transaction = {
  account_id: 0,
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  description: '',
  category_id: null,
  transaction_type: TransactionType.EXPENSE,
  status: TransactionStatus.PENDING,
  payee_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Categories will be loaded from the database

const TransactionFormDialog: React.FC<TransactionFormDialogProps> = ({
  open,
  transaction,
  onClose,
  onSave
}) => {
  const [formValues, setFormValues] = useState<Transaction>(defaultTransaction);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load accounts and categories for the dropdown
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load accounts
        const accountsData = await window.api.accounts.getAll();
        setAccounts(accountsData);
        
        // If no accounts exist or this is a new transaction, set the first account as default
        if (accountsData.length > 0 && !transaction) {
          setFormValues(prev => ({ ...prev, account_id: accountsData[0].account_id }));
        }
        
        // Load categories
        const categoriesData = await window.api.categories.getAll();
        setCategories(categoriesData);
        
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (open) {
      loadData();
    }
  }, [open]);

  // Update form when editing an existing transaction
  useEffect(() => {
    if (transaction) {
      setFormValues(transaction);
      setSelectedDate(new Date(transaction.date));
    } else {
      setFormValues(defaultTransaction);
      setSelectedDate(new Date());
    }
    setErrors({});
  }, [transaction, open]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      let numberValue = parseFloat(value) || 0;
      
      // For expense transactions, store amount as negative number
      if (name === 'amount' && formValues.transaction_type === TransactionType.EXPENSE) {
        numberValue = Math.abs(numberValue) * -1;
      } else if (name === 'amount' && formValues.transaction_type === TransactionType.INCOME) {
        numberValue = Math.abs(numberValue);
      }
      
      setFormValues({ ...formValues, [name]: numberValue });
    } else {
      setFormValues({ ...formValues, [name]: value });
    }
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    
    // If changing transaction type, adjust the amount sign
    if (name === 'transaction_type') {
      let adjustedAmount = formValues.amount;
      
      // Convert string value to enum
      const transactionType = value as unknown as TransactionType;
      
      if (transactionType === TransactionType.EXPENSE) {
        adjustedAmount = Math.abs(adjustedAmount) * -1;
      } else if (transactionType === TransactionType.INCOME) {
        adjustedAmount = Math.abs(adjustedAmount);
      }
      
      setFormValues({ 
        ...formValues, 
        // Directly assign without computed property syntax
        transaction_type: transactionType,
        amount: adjustedAmount
      });
    } else if (name === 'category_id') {
      setFormValues({
        ...formValues,
        [name]: value === 'null' ? null : parseInt(value)
      });
    } else if (name === 'account_id') {
      setFormValues({
        ...formValues,
        [name]: parseInt(value)
      });
    } else {
      setFormValues({ ...formValues, [name]: value });
    }
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const date = new Date(dateValue);
      setSelectedDate(date);
      setFormValues({ ...formValues, date: dateValue });
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formValues.account_id) {
      newErrors.account_id = 'Account is required';
    }
    
    if (!formValues.date) {
      newErrors.date = 'Date is required';
    }
    
    if (formValues.amount === 0) {
      newErrors.amount = 'Amount cannot be zero';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      // Ensure we have created_at and updated_at values
      const now = new Date().toISOString();
      const transactionToSave: Transaction = {
        ...formValues,
        updated_at: now
      };
      
      // Add created_at for new transactions
      if (!transaction) {
        transactionToSave.created_at = now;
      }
      
      onSave(transactionToSave);
    }
  };

  // Format the amount for display
  const getDisplayAmount = () => {
    // Always display a positive number in the form
    return Math.abs(formValues.amount || 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {transaction ? 'Edit Transaction' : 'Add New Transaction'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.account_id}>
              <InputLabel>Account</InputLabel>
              <Select
                name="account_id"
                value={`${formValues.account_id || ''}`}
                onChange={handleSelectChange}
                label="Account"
                disabled={loading}
              >
                {accounts.length === 0 ? (
                  <MenuItem value="" disabled>
                    No accounts found
                  </MenuItem>
                ) : (
                  accounts.map(account => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name}
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.account_id && <FormHelperText>{errors.account_id}</FormHelperText>}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Transaction Date"
              type="date"
              fullWidth
              value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
              onChange={handleDateChange}
              error={!!errors.date}
              helperText={errors.date}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                name="transaction_type"
                value={formValues.transaction_type}
                onChange={handleSelectChange}
                label="Transaction Type"
              >
                <MenuItem value={TransactionType.EXPENSE}>Expense</MenuItem>
                <MenuItem value={TransactionType.INCOME}>Income</MenuItem>
                <MenuItem value={TransactionType.TRANSFER}>Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              fullWidth
              value={formValues.description || ''}
              onChange={handleChange}
              placeholder="Enter transaction description"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="amount"
              label="Amount"
              type="number"
              fullWidth
              value={getDisplayAmount().toString()}
              onChange={handleChange}
              error={!!errors.amount}
              helperText={errors.amount}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                name="category_id"
                value={formValues.category_id === null || formValues.category_id === undefined 
                  ? 'null' 
                  : `${formValues.category_id}`}
                onChange={handleSelectChange}
                label="Category"
              >
                <MenuItem value="null">
                  <em>No Category</em>
                </MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.category_id} value={category.category_id?.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formValues.status}
                onChange={handleSelectChange}
                label="Status"
              >
                <MenuItem value={TransactionStatus.PENDING}>Pending</MenuItem>
                <MenuItem value={TransactionStatus.CLEARED}>Cleared</MenuItem>
                <MenuItem value={TransactionStatus.RECONCILED}>Reconciled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionFormDialog;
