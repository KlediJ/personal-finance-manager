import React, { useEffect, useState, useMemo } from 'react';
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
  Typography
} from '@mui/material';
import { LoanDetails, LoanType, PaymentFrequency } from '../../../data-storage/models/LoanDetails';
import { Account, AccountType } from '../../../data-storage/models/Account';

interface LoanFormDialogProps {
  open: boolean;
  loan: LoanDetails | null;
  accounts: Account[];
  onClose: () => void;
  onSave: (loan: LoanDetails) => Promise<void>;
}

const LoanFormDialog: React.FC<LoanFormDialogProps> = ({
  open,
  loan,
  accounts,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<LoanDetails>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Filter accounts to loan-type accounts by default (memoized to avoid re-renders loops)
  const loanAccounts = useMemo(
    () => accounts.filter(a => a.type === AccountType.LOAN),
    [accounts]
  );

  useEffect(() => {
    if (loan) {
      setFormData({
        ...loan,
        start_date: loan.start_date
          ? new Date(loan.start_date).toISOString().split('T')[0]
          : '',
        maturity_date: loan.maturity_date
          ? new Date(loan.maturity_date).toISOString().split('T')[0]
          : ''
      });
    } else {
      const today = new Date();
      const start = today.toISOString().split('T')[0];
      setFormData({
        account_id: loanAccounts[0]?.account_id,
        loan_type: LoanType.PERSONAL,
        original_amount: 0,
        current_balance: 0,
        interest_rate: 0,
        term_months: 36,
        payment_amount: 0,
        payment_frequency: PaymentFrequency.MONTHLY,
        start_date: start,
        maturity_date: start,
        escrow_amount: 0
      });
    }
    setErrors({});
    setSaving(false);
  }, [loan, open, accounts]);

  const handleChange = (field: keyof LoanDetails, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_id) {
      newErrors.account_id = 'Linked account is required';
    }

    if (!formData.loan_type) {
      newErrors.loan_type = 'Loan type is required';
    }

    if (!formData.original_amount || formData.original_amount <= 0) {
      newErrors.original_amount = 'Original amount must be greater than 0';
    }

    if (formData.interest_rate === undefined || formData.interest_rate < 0) {
      newErrors.interest_rate = 'Interest rate is required';
    }

    if (!formData.term_months || formData.term_months <= 0) {
      newErrors.term_months = 'Term (months) must be greater than 0';
    }

    if (!formData.payment_amount || formData.payment_amount <= 0) {
      newErrors.payment_amount = 'Payment amount must be greater than 0';
    }

    if (!formData.payment_frequency) {
      newErrors.payment_frequency = 'Payment frequency is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.maturity_date) {
      newErrors.maturity_date = 'Maturity date is required';
    } else if (
      formData.start_date &&
      new Date(formData.maturity_date) <= new Date(formData.start_date)
    ) {
      newErrors.maturity_date = 'Maturity date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!formData.account_id || !formData.loan_type ||
        !formData.original_amount || !formData.interest_rate ||
        !formData.term_months || !formData.payment_amount ||
        !formData.payment_frequency || !formData.start_date ||
        !formData.maturity_date) {
      return;
    }

    setSaving(true);

    try {
      const loanToSave: LoanDetails = {
        loan_id: formData.loan_id,
        account_id: formData.account_id,
        loan_type: formData.loan_type,
        original_amount: formData.original_amount,
        current_balance:
          formData.current_balance && formData.current_balance > 0
            ? formData.current_balance
            : formData.original_amount,
        interest_rate: formData.interest_rate,
        term_months: formData.term_months,
        payment_amount: formData.payment_amount,
        payment_frequency: formData.payment_frequency,
        start_date: formData.start_date,
        maturity_date: formData.maturity_date,
        escrow_amount: formData.escrow_amount || 0
      };

      await onSave(loanToSave);
      onClose();
    } catch (error) {
      console.error('Error saving loan:', error);
    } finally {
      setSaving(false);
    }
  };

  const loanTypeOptions = [
    { value: LoanType.MORTGAGE, label: 'Mortgage' },
    { value: LoanType.AUTO, label: 'Auto Loan' },
    { value: LoanType.PERSONAL, label: 'Personal Loan' },
    { value: LoanType.STUDENT, label: 'Student Loan' },
    { value: LoanType.BUSINESS, label: 'Business Loan' },
    { value: LoanType.HOME_EQUITY, label: 'Home Equity' }
  ];

  const paymentFrequencyOptions = [
    { value: PaymentFrequency.MONTHLY, label: 'Monthly' },
    { value: PaymentFrequency.BIWEEKLY, label: 'Bi-weekly' },
    { value: PaymentFrequency.WEEKLY, label: 'Weekly' },
    { value: PaymentFrequency.QUARTERLY, label: 'Quarterly' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {loan ? 'Edit Loan' : 'Add New Loan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.account_id}>
                <InputLabel>Linked Account</InputLabel>
                <Select
                  value={formData.account_id || ''}
                  label="Linked Account"
                  onChange={(e) =>
                    handleChange('account_id', Number(e.target.value))
                  }
                >
                  {loanAccounts.length === 0 && (
                    <MenuItem value="" disabled>
                      Create a Loan-type account first in Accounts.
                    </MenuItem>
                  )}
                  {loanAccounts.map(account => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.account_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.account_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.loan_type}>
                <InputLabel>Loan Type</InputLabel>
                <Select
                  value={formData.loan_type || ''}
                  label="Loan Type"
                  onChange={(e) =>
                    handleChange('loan_type', e.target.value as LoanType)
                  }
                >
                  {loanTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.loan_type && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.loan_type}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Original Amount"
                type="number"
                value={formData.original_amount ?? ''}
                onChange={(e) =>
                  handleChange(
                    'original_amount',
                    parseFloat(e.target.value) || 0
                  )
                }
                error={!!errors.original_amount}
                helperText={errors.original_amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      $
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Interest Rate (APR %)"
                type="number"
                value={formData.interest_rate ?? ''}
                onChange={(e) =>
                  handleChange(
                    'interest_rate',
                    parseFloat(e.target.value) || 0
                  )
                }
                error={!!errors.interest_rate}
                helperText={errors.interest_rate}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      %
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Term (months)"
                type="number"
                value={formData.term_months ?? ''}
                onChange={(e) =>
                  handleChange(
                    'term_months',
                    parseInt(e.target.value, 10) || 0
                  )
                }
                error={!!errors.term_months}
                helperText={errors.term_months}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={formData.payment_amount ?? ''}
                onChange={(e) =>
                  handleChange(
                    'payment_amount',
                    parseFloat(e.target.value) || 0
                  )
                }
                error={!!errors.payment_amount}
                helperText={errors.payment_amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      $
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.payment_frequency}>
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  value={formData.payment_frequency || ''}
                  label="Payment Frequency"
                  onChange={(e) =>
                    handleChange(
                      'payment_frequency',
                      e.target.value as PaymentFrequency
                    )
                  }
                >
                  {paymentFrequencyOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.payment_frequency && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.payment_frequency}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) =>
                  handleChange('start_date', e.target.value)
                }
                error={!!errors.start_date}
                helperText={errors.start_date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maturity Date"
                type="date"
                value={formData.maturity_date || ''}
                onChange={(e) =>
                  handleChange('maturity_date', e.target.value)
                }
                error={!!errors.maturity_date}
                helperText={errors.maturity_date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monthly Escrow (optional)"
                type="number"
                value={formData.escrow_amount ?? ''}
                onChange={(e) =>
                  handleChange(
                    'escrow_amount',
                    parseFloat(e.target.value) || 0
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      $
                    </InputAdornment>
                  ),
                }}
              />
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
            {loan ? 'Save Changes' : 'Add Loan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoanFormDialog;
