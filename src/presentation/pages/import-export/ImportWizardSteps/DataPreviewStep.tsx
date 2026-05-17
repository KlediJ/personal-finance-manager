import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Chip,
  Stack
} from '@mui/material';
import { Transaction } from '../../../../data-storage/models/Transaction';

interface DataPreviewStepProps {
  validatedData: Transaction[];
  validationErrors: any[];
  stats: { total: number, valid: number, invalid: number } | null;
  transferCandidateCount?: number;
}

const DataPreviewStep: React.FC<DataPreviewStepProps> = ({
  validatedData,
  validationErrors,
  stats,
  transferCandidateCount = 0
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format date for display (avoid timezone issues)
  const formatDate = (dateString: string) => {
    // Parse date without timezone conversion
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'income': 'Income',
      'expense': 'Expense',
      'transfer': 'Transfer'
    };
    return typeMap[type] || type;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Preview
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Alert severity={stats && stats.invalid > 0 ? 'warning' : 'success'}>
          <AlertTitle>Validation Summary</AlertTitle>
          {stats ? (
            <Typography variant="body2">
              Total rows: {stats.total} | 
              Valid: {stats.valid} | 
              Invalid: {stats.invalid}
              {transferCandidateCount > 0 ? ` | Transfer candidates: ${transferCandidateCount}` : ''}
            </Typography>
          ) : (
            'No data to import'
          )}
        </Alert>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label={`Valid Transactions (${validatedData.length})`} />
              <Tab 
                label={`Errors (${validationErrors.length})`} 
                disabled={validationErrors.length === 0}
              />
            </Tabs>
          </Box>
          
          {/* Valid Transactions Tab */}
          {tabValue === 0 && (
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validatedData.length > 0 ? (
                    validatedData.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description || 'No description'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getTransactionTypeLabel(transaction.transaction_type)} 
                            size="small"
                            color={
                              transaction.transaction_type === 'income' ? 'success' :
                              transaction.transaction_type === 'expense' ? 'error' :
                              'primary'
                            }
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: transaction.transaction_type === 'expense' ? 'error.main' : 
                                 transaction.transaction_type === 'income' ? 'success.main' : 
                                 'inherit' 
                        }}>
                          {formatAmount(transaction.amount)}
                        </TableCell>
                        <TableCell>{transaction.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No valid transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Errors Tab */}
          {tabValue === 1 && (
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Fields</TableCell>
                    <TableCell>Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationErrors.length > 0 ? (
                    validationErrors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>
                          {Object.keys(error.errors).join(', ')}
                        </TableCell>
                        <TableCell>
                          <Stack direction="column" spacing={1}>
                            {Object.entries(error.errors).map(([field, message]) => (
                              <Chip 
                                key={field} 
                                label={`${field}: ${message}`} 
                                color="error" 
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No errors found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
      
      <Box>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Only valid transactions will be imported. Review the data above to ensure everything looks correct.
          Click "Next" to review grouped category suggestions, then transfer candidates before importing, or go back to adjust your column mappings.
        </Typography>
      </Box>
    </Box>
  );
};

export default DataPreviewStep;
