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
  Stack,
  Select,
  MenuItem
} from '@mui/material';
import { Transaction } from '../../../../data-storage/models/Transaction';
import { Category } from '../../../../data-storage/models/Category';

interface DataPreviewStepProps {
  validatedData: (Transaction & { suggested_category?: string })[];
  validationErrors: any[];
  stats: { total: number, valid: number, invalid: number } | null;
  categories: Category[];
  onCategoryChange: (index: number, categoryId: number | null) => void;
}

const DataPreviewStep: React.FC<DataPreviewStepProps> = ({
  validatedData,
  validationErrors,
  stats,
  categories,
  onCategoryChange
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
                    <TableCell>Category</TableCell>
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
                          <Select
                            value={transaction.category_id ? transaction.category_id.toString() : ''}
                            onChange={(e) => onCategoryChange(index, e.target.value === '' ? null : parseInt(e.target.value))}
                            size="small"
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>{transaction.suggested_category || 'None'}</em>
                            </MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.category_id} value={cat.category_id!.toString()}>{cat.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
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
                      <TableCell colSpan={6} align="center">
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
          Click "Import" to proceed with importing the valid transactions, or go back to adjust your column mappings.
        </Typography>
      </Box>
    </Box>
  );
};

export default DataPreviewStep;
