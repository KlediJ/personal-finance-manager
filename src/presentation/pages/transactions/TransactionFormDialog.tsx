import React, { useEffect, useState } from 'react';
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
  FormHelperText
} from '@mui/material';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';

interface TransactionFormDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => Promise<void> | void;
}

const defaultTransaction = (accountId?: number): Transaction => ({
  account_id: accountId ?? 0,
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: '',
  category_id: null,
  transaction_type: TransactionType.EXPENSE,
  status: 'cleared' as any
});

const TransactionFormDialog: React.FC<TransactionFormDialogProps> = ({
  open,
  transaction,
  onClose,
  onSave
}) => {
  const [formValues, setFormValues] = useState<Transaction>(defaultTransaction());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      if (!open) {
        return;
      }

      try {
        const [accountsData, categoriesData] = await Promise.all([
          window.api.accounts.getAll(),
          window.api.categories.getAll()
        ]);

        setAccounts(accountsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading accounts/categories for transaction form:', error);
      }
    };

    loadLookups();
  }, [open]);

  useEffect(() => {
    if (transaction) {
      setFormValues(transaction);
    } else {
      setFormValues(defaultTransaction());
    }
    setErrors({});
    setSaving(false);
  }, [transaction, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formValues.account_id) {
      newErrors.account_id = 'Account is required';
    }

    if (!formValues.date) {
      newErrors.date = 'Date is required';
    }

    if (formValues.amount === undefined || formValues.amount === null || isNaN(formValues.amount)) {
      newErrors.amount = 'Amount is required';
    } else if (formValues.amount === 0) {
      newErrors.amount = 'Amount must not be zero';
    }

    if (!formValues.transaction_type) {
      newErrors.transaction_type = 'Transaction type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formValues);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Transaction, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field as string]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handleAmountChange = (value: string) => {
    const parsed = parseFloat(value);
    handleFieldChange('amount', isNaN(parsed) ? 0 : parsed);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {transaction ? 'Edit Transaction' : 'Add Transaction'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.account_id}>
                <InputLabel>Account</InputLabel>
                <Select
                  value={formValues.account_id ? formValues.account_id.toString() : ''}
                  label="Account"
                  onChange={event =>
                    handleFieldChange('account_id', Number(event.target.value) || 0)
                  }
                >
                  <MenuItem value="">
                    <em>Select Account</em>
                  </MenuItem>
                  {accounts.map(account => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.account_id && (
                  <FormHelperText>{errors.account_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formValues.date || ''}
                onChange={event => handleFieldChange('date', event.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={errors.date}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formValues.description || ''}
                onChange={event =>
                  handleFieldChange('description', event.target.value)
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={
                    formValues.category_id !== undefined &&
                    formValues.category_id !== null
                      ? formValues.category_id.toString()
                      : ''
                  }
                  label="Category"
                  onChange={event =>
                    handleFieldChange(
                      'category_id',
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                >
                  <MenuItem value="">
                    <em>Uncategorized</em>
                  </MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.category_id} value={category.category_id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formValues.amount || ''}
                onChange={event => handleAmountChange(event.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                error={!!errors.amount}
                helperText={errors.amount}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.transaction_type}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formValues.transaction_type || ''}
                  label="Type"
                  onChange={event =>
                    handleFieldChange(
                      'transaction_type',
                      event.target.value as TransactionType
                    )
                  }
                >
                  {Object.values(TransactionType).map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {errors.transaction_type && (
                  <FormHelperText>{errors.transaction_type}</FormHelperText>
                )}
              </FormControl>
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransactionFormDialog;
