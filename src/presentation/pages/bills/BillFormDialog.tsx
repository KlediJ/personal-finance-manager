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
  Box,
  Typography,
  Grid,
  Chip
} from '@mui/material';
import { RecurringBill, BillFrequency } from '../../../data-storage/models/RecurringBill';
import { Account } from '../../../data-storage/models/Account';
import { Category } from '../../../data-storage/models/Category';
import { Payee } from '../../../data-storage/models/Payee';

interface BillFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (bill: Partial<RecurringBill>) => Promise<void>;
  bill?: RecurringBill | null;
  accounts: Account[];
  categories: Category[];
  payees: Payee[];
}

const BillFormDialog: React.FC<BillFormDialogProps> = ({
  open,
  onClose,
  onSave,
  bill,
  accounts,
  categories,
  payees
}) => {
  const [formData, setFormData] = useState<Partial<RecurringBill>>({
    bill_name: '',
    amount: 0,
    frequency: 'monthly' as BillFrequency,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payee_id: 0,
    category_id: 0,
    account_id: 0,
    auto_pay: false,
    active: true,
    due_day: 1,
    is_fixed_amount: true,
    reminder_days: 3
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) {
      setFormData({
        ...bill,
        start_date: bill.start_date ? new Date(bill.start_date).toISOString().split('T')[0] : '',
        end_date: bill.end_date ? new Date(bill.end_date).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        bill_name: '',
        amount: 0,
        frequency: 'monthly' as BillFrequency,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        payee_id: 0,
        category_id: 0,
        account_id: 0,
        auto_pay: false,
        active: true,
        due_day: 1,
        is_fixed_amount: true,
        reminder_days: 3
      });
    }
    setErrors({});
  }, [bill, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bill_name?.trim()) {
      newErrors.bill_name = 'Bill name is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.payee_id) {
      newErrors.payee_id = 'Payee is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.account_id) {
      newErrors.account_id = 'Account is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.end_date && formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof RecurringBill, value: any) => {
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

  const frequencyOptions = [
    { value: BillFrequency.WEEKLY, label: 'Weekly' },
    { value: BillFrequency.BIWEEKLY, label: 'Bi-weekly' },
    { value: BillFrequency.MONTHLY, label: 'Monthly' },
    { value: BillFrequency.QUARTERLY, label: 'Quarterly' },
    { value: BillFrequency.ANNUAL, label: 'Annual' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {bill ? 'Edit Bill' : 'Add New Bill'}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bill Name"
                value={formData.bill_name || ''}
                onChange={(e) => handleChange('bill_name', e.target.value)}
                error={!!errors.bill_name}
                helperText={errors.bill_name}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                error={!!errors.amount}
                helperText={errors.amount}
                inputProps={{ step: 0.01, min: 0 }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                  label="Frequency"
                >
                  {frequencyOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
                error={!!errors.start_date}
                helperText={errors.start_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date (Optional)"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
                error={!!errors.end_date}
                helperText={errors.end_date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.payee_id}>
                <InputLabel>Payee</InputLabel>
                <Select
                  value={formData.payee_id || ''}
                  onChange={(e) => handleChange('payee_id', Number(e.target.value))}
                  label="Payee"
                >
                  {payees.map(payee => (
                    <MenuItem key={payee.payee_id} value={payee.payee_id}>
                      {payee.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.payee_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.payee_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.category_id}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id || ''}
                  onChange={(e) => handleChange('category_id', Number(e.target.value))}
                  label="Category"
                >
                  {categories.map(category => (
                    <MenuItem key={category.category_id} value={category.category_id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.category_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.account_id}>
                <InputLabel>Account</InputLabel>
                <Select
                  value={formData.account_id || ''}
                  onChange={(e) => handleChange('account_id', Number(e.target.value))}
                  label="Account"
                >
                  {accounts.map(account => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name} - {account.type}
                    </MenuItem>
                  ))}
                </Select>
                {errors.account_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.account_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Day of Month"
                type="number"
                value={formData.due_day || 1}
                onChange={(e) => handleChange('due_day', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 31 }}
                helperText="Day of the month when this bill is due"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.auto_pay || false}
                      onChange={(e) => handleChange('auto_pay', e.target.checked)}
                    />
                  }
                  label="Auto Pay"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active !== false}
                      onChange={(e) => handleChange('active', e.target.checked)}
                    />
                  }
                  label="Active"
                />
              </Box>
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
            disabled={saving}
          >
            {saving ? 'Saving...' : (bill ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BillFormDialog;