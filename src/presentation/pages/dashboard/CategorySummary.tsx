import React from 'react';
import { Paper, Typography, Box, Tooltip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  transaction_id: number;
  date: string;
  description: string;
  amount: number;
  category_name: string;
}

interface CategoryData {
  name: string;
  total: number;
  count: number;
  transactions?: Transaction[];
}

interface CategorySummaryProps {
  data: CategoryData[];
  transactions: any[];
}

// Generate colors for categories (should match colors in CategoryBreakdown)
const getCategoryColor = (index: number) => {
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

const CategorySummary: React.FC<CategorySummaryProps> = ({ data, transactions }) => {
  // Filter categories that have expenses (negative totals)
  const expenseCategories = data
    .filter((category) => category.total < 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const theme = useTheme();
  const navigate = useNavigate();
  const totalTransactions = transactions.length;
  const topCategories = expenseCategories.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Top Expense Categories
      </Typography>

      {totalTransactions > 0 && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Based on {totalTransactions} transactions
        </Typography>
      )}

      {expenseCategories.length === 0 ? (
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ p: 2 }}
        >
          No expense data available. Add some transactions to see your spending
          categories.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {topCategories.map((category, index) => {
            const color = getCategoryColor(index);

            return (
              <Tooltip
                key={category.name}
                title="View transactions for this category"
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
                      `/transactions?category=${encodeURIComponent(
                        category.name
                      )}`
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
                        {category.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.count} transaction
                        {category.count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'medium',
                      color: theme.palette.error.main
                    }}
                  >
                    {formatCurrency(Math.abs(category.total))}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default CategorySummary;
