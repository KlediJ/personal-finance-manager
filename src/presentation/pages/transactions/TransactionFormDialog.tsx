import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Checkbox,
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
  FormHelperText,
  FormControlLabel,
  Typography
} from '@mui/material';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import { Category, CategoryType } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';

interface TransactionFormDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (
    transaction: Transaction,
    options?: {
      applyCategoryToSimilar?: boolean;
      applyPayeeToSimilar?: boolean;
    }
  ) => Promise<void> | void;
}

const defaultTransaction = (accountId?: number): Transaction => ({
  account_id: accountId ?? 0,
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: '',
  category_id: null,
  payee_id: null,
  payee_name: '',
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
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categoryInputValue, setCategoryInputValue] = useState('');
  const [applyCategoryToSimilar, setApplyCategoryToSimilar] = useState(false);
  const [applyPayeeToSimilar, setApplyPayeeToSimilar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      if (!open) {
        return;
      }

      try {
        const [accountsData, categoriesData, payeesData] = await Promise.all([
          window.api.accounts.getAll(),
          window.api.categories.getAll(),
          window.api.payees.getAll()
        ]);

        setAccounts(accountsData);
        setCategories(categoriesData);
        setPayees(payeesData);
      } catch (error) {
        console.error('Error loading transaction form lookups:', error);
      }
    };

    loadLookups();
  }, [open]);

  useEffect(() => {
    if (transaction) {
      setFormValues(transaction);
      setCategoryInputValue(transaction.category_name || '');
    } else {
      setFormValues(defaultTransaction());
      setCategoryInputValue('');
    }
    setApplyCategoryToSimilar(false);
    setApplyPayeeToSimilar(false);
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
      const trimmedCategoryName = categoryInputValue.trim();
      const trimmedPayeeName = (formValues.payee_name || '').trim();
      let nextCategoryId = formValues.category_id ?? null;
      let nextPayeeId = formValues.payee_id ?? null;

      if (trimmedCategoryName) {
        const matchingCategory = categories.find(
          (category) => category.name.toLowerCase() === trimmedCategoryName.toLowerCase()
        );

        if (matchingCategory?.category_id) {
          nextCategoryId = matchingCategory.category_id;
        } else {
          const inferredCategoryType =
            formValues.transaction_type === TransactionType.INCOME
              ? CategoryType.INCOME
              : CategoryType.EXPENSE;

          const categoryResult = await window.api.categories.create({
            name: trimmedCategoryName,
            type: inferredCategoryType
          });

          if (!categoryResult.success || !categoryResult.id) {
            throw new Error(categoryResult.error || 'Failed to create category');
          }

          nextCategoryId = categoryResult.id;
          setCategories((prev) => [
            ...prev,
            {
              category_id: categoryResult.id,
              name: trimmedCategoryName,
              type: inferredCategoryType
            }
          ]);
        }
      } else {
        nextCategoryId = null;
      }

      if (trimmedPayeeName) {
        const matchingPayee = payees.find(
          (payee) => payee.name.toLowerCase() === trimmedPayeeName.toLowerCase()
        );

        if (matchingPayee?.payee_id) {
          nextPayeeId = matchingPayee.payee_id;
          if (nextCategoryId !== null) {
            await window.api.payees.update(matchingPayee.payee_id, {
              ...matchingPayee,
              default_category_id: nextCategoryId
            });
          }
        } else {
          const payeeResult = await window.api.payees.createIfNotExists({
            name: trimmedPayeeName,
            default_category_id: nextCategoryId
          });

          if (!payeeResult.success) {
            throw new Error(payeeResult.error || 'Failed to create payee');
          }

          nextPayeeId = payeeResult.id;
          setPayees((prev) => [
            ...prev,
            {
              payee_id: payeeResult.id,
              name: trimmedPayeeName,
              default_category_id: nextCategoryId
            }
          ]);
        }
      } else {
        nextPayeeId = null;
      }

      await onSave(
        {
          ...formValues,
          category_id: nextCategoryId,
          payee_name: trimmedPayeeName || undefined,
          payee_id: trimmedPayeeName ? nextPayeeId : null
        },
        {
          applyCategoryToSimilar,
          applyPayeeToSimilar
        }
      );
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

  const handlePayeeChange = (value: string | null) => {
    const nextName = (value || '').trimStart();
    const matchingPayee = payees.find(
      (payee) => payee.name.toLowerCase() === nextName.trim().toLowerCase()
    );

    const defaultCategoryId =
      matchingPayee?.default_category_id && !formValues.category_id
        ? matchingPayee.default_category_id
        : formValues.category_id ?? null;

    const defaultCategoryName =
      defaultCategoryId !== null
        ? categories.find((category) => category.category_id === defaultCategoryId)?.name || ''
        : categoryInputValue;

    setFormValues((prev) => ({
      ...prev,
      payee_name: nextName,
      payee_id: nextName.trim() ? matchingPayee?.payee_id ?? null : null,
      category_id: defaultCategoryId
    }));

    if (matchingPayee?.default_category_id && !formValues.category_id) {
      setCategoryInputValue(defaultCategoryName);
    }
  };

  const handleCategoryChange = (value: string | Category | null) => {
    if (typeof value === 'string') {
      setCategoryInputValue(value);
      setFormValues((prev) => ({
        ...prev,
        category_id: null
      }));
      return;
    }

    if (!value) {
      setCategoryInputValue('');
      setFormValues((prev) => ({
        ...prev,
        category_id: null
      }));
      return;
    }

    setCategoryInputValue(value.name);
    setFormValues((prev) => ({
      ...prev,
      category_id: value.category_id ?? null
    }));
  };

  const selectedCategory =
    categories.find((category) => category.category_id === formValues.category_id) || null;
  const showSimilarApplyOptions = Boolean(transaction?.transaction_id && (formValues.description || '').trim());

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
              <Autocomplete
                freeSolo
                options={categories}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.name
                }
                value={selectedCategory}
                inputValue={categoryInputValue}
                onChange={(_, value) => handleCategoryChange(value)}
                onInputChange={(_, value) => {
                  setCategoryInputValue(value);
                  if (!value.trim()) {
                    handleFieldChange('category_id', null);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    helperText="Choose an existing category or type a new one. New categories use the transaction type."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={payees.map((payee) => payee.name)}
                value={formValues.payee_name || ''}
                onChange={(_, value) => handlePayeeChange(typeof value === 'string' ? value : '')}
                onInputChange={(_, value) => handlePayeeChange(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Payee"
                    helperText="Choose an existing payee or type a new one."
                  />
                )}
              />
            </Grid>

            {showSimilarApplyOptions && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Apply this cleanup to other transactions with a similar description.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyCategoryToSimilar}
                      onChange={(event) => setApplyCategoryToSimilar(event.target.checked)}
                    />
                  }
                  label="Apply category to similar transactions"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyPayeeToSimilar}
                      onChange={(event) => setApplyPayeeToSimilar(event.target.checked)}
                    />
                  }
                  label="Apply payee to similar transactions"
                />
              </Grid>
            )}

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
