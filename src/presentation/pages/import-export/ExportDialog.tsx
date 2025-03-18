import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  FormHelperText,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { TransactionType } from '../../../data-storage/models/Transaction';
import { Account } from '../../../data-storage/models/Account';
import DownloadIcon from '@mui/icons-material/Download';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  // State for export options
  const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Load accounts
  useEffect(() => {
    if (open) {
      // Set default dates for last month
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      
      setStartDate(lastMonth.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      
      // Load accounts
      const loadAccounts = async () => {
        try {
          const data = await window.api.accounts.getAll();
          setAccounts(data);
        } catch (error) {
          console.error('Error loading accounts:', error);
        }
      };
      
      loadAccounts();
    }
  }, [open]);
  
  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setFileType('csv');
      setAccountId('');
      setTransactionType('');
    }
  }, [open]);
  
  // Handle file type change
  const handleFileTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileType(event.target.value as 'csv' | 'excel');
  };
  
  // Handle export
  const handleExport = async () => {
    setLoading(true);
    
    try {
      // Show save dialog
      const saveResult = await window.api.export.showSaveDialog({
        format: fileType,
        defaultPath: `transactions_export_${startDate}_to_${endDate}`
      });
      
      if (saveResult.canceled || !saveResult.filePath) {
        setLoading(false);
        return;
      }
      
      // Prepare filters
      const filters: any = {};
      
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      
      if (accountId) {
        filters.accountId = accountId;
      }
      
      if (transactionType) {
        filters.transactionType = transactionType;
      }
      
      // Call export function based on file type
      let result;
      if (fileType === 'csv') {
        result = await window.api.export.transactionsToCSV({
          filePath: saveResult.filePath,
          filters
        });
      } else {
        result = await window.api.export.transactionsToExcel({
          filePath: saveResult.filePath,
          filters
        });
      }
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully exported ${result.count} transactions to ${fileType.toUpperCase()} file`,
          severity: 'success'
        });
        onClose();
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setSnackbar({
        open: true,
        message: `Failed to export: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Export Transactions</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Export Format</FormLabel>
                  <RadioGroup
                    row
                    value={fileType}
                    onChange={handleFileTypeChange}
                  >
                    <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                    <FormControlLabel value="excel" control={<Radio />} label="Excel" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Account (Optional)</InputLabel>
                  <Select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value as number)}
                    label="Account (Optional)"
                  >
                    <MenuItem value="">
                      <em>All Accounts</em>
                    </MenuItem>
                    {accounts.map((account) => (
                      <MenuItem key={account.account_id} value={account.account_id}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Filter transactions by account
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Transaction Type (Optional)</InputLabel>
                  <Select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    label="Transaction Type (Optional)"
                  >
                    <MenuItem value="">
                      <em>All Types</em>
                    </MenuItem>
                    {Object.values(TransactionType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Filter by transaction type
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                The export will include all transactions matching your criteria.
                Select a date range and optional filters, then click Export to save the file.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
            disabled={loading || !startDate || !endDate}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
      
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
    </>
  );
};

export default ExportDialog;
