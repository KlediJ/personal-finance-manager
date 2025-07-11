import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Transaction {
  transaction_id: number;
  date: string;
  description: string;
  amount: number;
  transaction_type: string;
  account_id: number;
  category_id?: number;
  status: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const navigate = useNavigate();

  // Format transaction date
  const formatDate = (dateString: string) => {
    // Parse the date components to avoid timezone issues
    // dateString is in format YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    // Create date using local timezone (month is 0-indexed in JS)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: string): 'success' | 'error' | 'primary' => {
    if (type === 'income') return 'success';
    if (type === 'expense') return 'error';
    return 'primary'; // transfer
  };

  // Navigate to transactions page
  const handleViewAll = () => {
    navigate('/transactions');
  };

  // Navigate to specific transaction
  const handleRowClick = (transactionId: number) => {
    navigate(`/transactions?id=${transactionId}`);
  };

  // Get appropriate transaction type label
  const getTransactionTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'income': 'Income',
      'expense': 'Expense',
      'transfer': 'Transfer'
    };
    return typeMap[type] || type;
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Recent Transactions</Typography>
        <Button 
          endIcon={<ArrowForwardIcon />} 
          onClick={handleViewAll}
          size="small"
        >
          View All
        </Button>
      </Box>
      
      <TableContainer sx={{ flex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    No recent transactions found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow 
                  key={transaction.transaction_id}
                  hover
                  onClick={() => handleRowClick(transaction.transaction_id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    {transaction.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTransactionTypeLabel(transaction.transaction_type)}
                      color={getTransactionTypeColor(transaction.transaction_type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: transaction.transaction_type === 'expense' 
                        ? 'error.main' 
                        : transaction.transaction_type === 'income' 
                          ? 'success.main' 
                          : 'inherit' 
                    }}
                  >
                    {formatAmount(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentTransactions;
