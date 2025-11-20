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
  FormControlLabel,
  Switch,
  Grid,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';
import { Account, AccountType } from '../../../data-storage/models/Account';

interface AccountFormDialogProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
  onSave: (account: Account) => void;
}

// Default new account values with all required properties
const defaultAccount: Account = {
  account_id: 0,
  name: '',
  type: AccountType.CHECKING,
  opening_balance: 0,
  current_balance: 0,
  currency: 'USD',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const AccountFormDialog: React.FC<AccountFormDialogProps> = ({
  open,
  account,
  onClose,
  onSave
}) => {
  const [formValues, setFormValues] = useState<Account>(defaultAccount);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when editing an existing account
  useEffect(() => {
    if (account) {
      setFormValues(account);
    } else {
      setFormValues(defaultAccount);
    }
    setErrors({});
  }, [account, open]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      setFormValues({ ...formValues, [name]: checked });
    } else if (type === 'number') {
      setFormValues({ ...formValues, [name]: parseFloat(value) || 0 });
    } else {
      setFormValues({ ...formValues, [name]: value });
    }
  };

  // Handle select changes (for dropdown menus)
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formValues.name.trim()) {
      newErrors.name = 'Account name is required';
    }
    
    if (formValues.opening_balance === undefined) {
      newErrors.opening_balance = 'Opening balance is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      // Update current balance to opening balance for new accounts
      if (!account) {
        formValues.current_balance = formValues.opening_balance;
      }
      onSave(formValues);
    }
  };

  // Account type options
  const accountTypes = [
    { value: AccountType.CHECKING, label: 'Checking Account' },
    { value: AccountType.SAVINGS, label: 'Savings Account' },
    { value: AccountType.CREDIT_CARD, label: 'Credit Card' },
    { value: AccountType.INVESTMENT, label: 'Investment Account' },
    { value: AccountType.LOAN, label: 'Loan' },
    { value: AccountType.CASH, label: 'Cash' }
  ];

  // Currency options (common ones, can be expanded)
  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {account ? 'Edit Account' : 'Create New Account'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Account Name"
              fullWidth
              value={formValues.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              autoFocus
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Account Type</InputLabel>
              <Select
                name="type"
                value={formValues.type}
                onChange={handleSelectChange}
                label="Account Type"
              >
                {accountTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="opening_balance"
              label="Opening Balance"
              type="number"
              fullWidth
              value={formValues.opening_balance}
              onChange={handleChange}
              error={!!errors.opening_balance}
              helperText={errors.opening_balance}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {formValues.currency === 'USD' ? '$' : formValues.currency}
                  </InputAdornment>
                ),
              }}
              disabled={!!account} // Can't change opening balance for existing accounts
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                name="currency"
                value={formValues.currency}
                onChange={handleSelectChange}
                label="Currency"
              >
                {currencies.map(currency => (
                  <MenuItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="active"
                  checked={formValues.active}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label="Active Account"
            />
          </Grid>

          {account && (
            <Grid item xs={12}>
              <TextField
                name="current_balance"
                label="Current Balance (manual adjustment)"
                type="number"
                fullWidth
                value={formValues.current_balance}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {formValues.currency === 'USD' ? '$' : formValues.currency}
                    </InputAdornment>
                  ),
                }}
                helperText={
                  'Use this sparingly to correct a mistaken starting balance. ' +
                  'It overrides the balance derived from transactions and may create a one-time discrepancy.'
                }
              />
            </Grid>
          )}
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

export default AccountFormDialog;
