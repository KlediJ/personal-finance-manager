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
  FormHelperText,
  Alert,
  Typography
} from '@mui/material';
import { Account } from '../../data-storage/models/Account';

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  onTransferComplete: (success: boolean, message: string) => void;
}

const TransferDialog: React.FC<TransferDialogProps> = ({
  open,
  onClose,
  onTransferComplete
}) => {
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [toAccountId, setToAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load accounts when dialog opens
  useEffect(() => {
    const loadAccounts = async () => {
      if (open) {
        try {
          const data = await window.api.accounts.getAll();
          setAccounts(data.filter(acc => acc.active));
        } catch (error) {
          console.error('Error loading accounts:', error);
        }
      }
    };
    loadAccounts();
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFromAccountId('');
      setToAccountId('');
      setAmount(0);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  }, [open]);

  const handleFromAccountChange = (e: SelectChangeEvent) => {
    const value = Number(e.target.value);
    setFromAccountId(value);
    
    // Clear "to" account if it's the same as "from" account
    if (value === toAccountId) {
      setToAccountId('');
    }
  };

  const handleToAccountChange = (e: SelectChangeEvent) => {
    const value = Number(e.target.value);
    setToAccountId(value);
    
    // Clear "from" account if it's the same as "to" account
    if (value === fromAccountId) {
      setFromAccountId('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!fromAccountId) {
      newErrors.fromAccount = 'From account is required';
    }
    
    if (!toAccountId) {
      newErrors.toAccount = 'To account is required';
    }
    
    if (fromAccountId === toAccountId) {
      newErrors.accounts = 'From and To accounts must be different';
    }
    
    if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.api.transactions.createTransfer(
        fromAccountId as number,
        toAccountId as number,
        amount,
        description || undefined,
        date
      );

      if (result.success) {
        onTransferComplete(true, 'Transfer completed successfully with double-entry accounting');
        onClose();
      } else {
        onTransferComplete(false, 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      onTransferComplete(false, 'Transfer failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Get account name by ID
  const getAccountName = (accountId: number): string => {
    const account = accounts.find(acc => acc.account_id === accountId);
    return account ? account.name : '';
  };

  // Get available "to" accounts (exclude selected "from" account)
  const getAvailableToAccounts = () => {
    return accounts.filter(acc => acc.account_id !== fromAccountId);
  };

  // Get available "from" accounts (exclude selected "to" account)
  const getAvailableFromAccounts = () => {
    return accounts.filter(acc => acc.account_id !== toAccountId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Between Accounts</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {errors.accounts && (
            <Grid item xs={12}>
              <Alert severity="error">{errors.accounts}</Alert>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.fromAccount}>
              <InputLabel>From Account</InputLabel>
              <Select
                value={fromAccountId.toString()}
                onChange={handleFromAccountChange}
                label="From Account"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Select Account</em>
                </MenuItem>
                {getAvailableFromAccounts().map(account => (
                  <MenuItem key={account.account_id} value={account.account_id}>
                    {account.name} (${account.current_balance.toFixed(2)})
                  </MenuItem>
                ))}
              </Select>
              {errors.fromAccount && <FormHelperText>{errors.fromAccount}</FormHelperText>}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.toAccount}>
              <InputLabel>To Account</InputLabel>
              <Select
                value={toAccountId.toString()}
                onChange={handleToAccountChange}
                label="To Account"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Select Account</em>
                </MenuItem>
                {getAvailableToAccounts().map(account => (
                  <MenuItem key={account.account_id} value={account.account_id}>
                    {account.name} (${account.current_balance.toFixed(2)})
                  </MenuItem>
                ))}
              </Select>
              {errors.toAccount && <FormHelperText>{errors.toAccount}</FormHelperText>}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              error={!!errors.amount}
              helperText={errors.amount}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Transfer Date"
              type="date"
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={!!errors.date}
              helperText={errors.date}
              disabled={loading}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description (Optional)"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly transfer to savings"
              disabled={loading}
            />
          </Grid>

          {fromAccountId && toAccountId && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Transfer Summary:</strong><br />
                  From: {getAccountName(fromAccountId as number)}<br />
                  To: {getAccountName(toAccountId as number)}<br />
                  Amount: ${amount.toFixed(2)}<br />
                  <em>This will create two linked transactions with automatic double-entry accounting.</em>
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          color="primary"
        >
          {loading ? 'Processing...' : 'Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferDialog;