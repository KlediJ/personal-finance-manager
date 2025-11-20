import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  transaction_id: number;
  date: string;
  description: string;
  amount: number;
  payee_name: string;
}

interface PayeeData {
  name: string;
  total: number;
  count: number;
  transactions?: Transaction[];
}

interface PayeeSummaryProps {
  data: PayeeData[];
  transactions: any[];
}

// Generate colors for payees (similar to CategorySummary)
const getPayeeColor = (index: number) => {
  const baseColors = [
    'rgba(255, 99, 132, {opacity})', // Red
    'rgba(54, 162, 235, {opacity})', // Blue
    'rgba(255, 206, 86, {opacity})', // Yellow
    'rgba(75, 192, 192, {opacity})', // Green
    'rgba(153, 102, 255, {opacity})', // Purple
    'rgba(255, 159, 64, {opacity})', // Orange
    'rgba(199, 199, 199, {opacity})', // Gray
    'rgba(83, 102, 255, {opacity})', // Indigo
    'rgba(255, 99, 255, {opacity})', // Pink
    'rgba(99, 255, 132, {opacity})' // Lime
  ];

  const colorIndex = index % baseColors.length;
  return {
    background: baseColors[colorIndex].replace('{opacity}', '0.2'),
    main: baseColors[colorIndex].replace('{opacity}', '1.0')
  };
};

const PayeeSummary: React.FC<PayeeSummaryProps> = ({ data, transactions }) => {
  // Filter payees that have expenses (negative totals)
  const expensePayees = data
    .filter((payee) => payee.total < 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const theme = useTheme();
  const navigate = useNavigate();
  const totalTransactions = transactions.length;
  const topPayees = expensePayees.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Top Expense Payees
      </Typography>

      {totalTransactions > 0 && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Based on {totalTransactions} transactions
        </Typography>
      )}

      {expensePayees.length === 0 ? (
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ p: 2 }}
        >
          No payee data available. Add some transactions with payees to see
          your spending breakdown.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {topPayees.map((payee, index) => {
            const color = getPayeeColor(index);

            return (
              <Tooltip
                key={payee.name}
                title="View transactions for this payee"
                placement="top"
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'background.default',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: theme.palette.action.hover
                    }
                  }}
                  onClick={() =>
                    navigate(
                      `/transactions?payee=${encodeURIComponent(payee.name)}`
                    )
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: color.main
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 'medium' }}
                      >
                        {payee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {payee.count} transaction
                        {payee.count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ minWidth: 140, textAlign: 'right' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'medium',
                        color: theme.palette.error.main
                      }}
                    >
                      {formatCurrency(Math.abs(payee.total))}
                    </Typography>
                    <Chip
                      label="Top spend"
                      size="small"
                      sx={{
                        mt: 0.5,
                        backgroundColor: color.background,
                        color: color.main,
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default PayeeSummary;
