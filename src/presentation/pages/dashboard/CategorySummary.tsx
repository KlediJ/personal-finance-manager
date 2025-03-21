import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Box,
  Collapse,
  IconButton,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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
    'rgba(255, 99, 132, {opacity})',   // Red
    'rgba(54, 162, 235, {opacity})',   // Blue
    'rgba(255, 206, 86, {opacity})',   // Yellow
    'rgba(75, 192, 192, {opacity})',   // Green
    'rgba(153, 102, 255, {opacity})',  // Purple
    'rgba(255, 159, 64, {opacity})',   // Orange
    'rgba(199, 199, 199, {opacity})',  // Gray
    'rgba(83, 102, 255, {opacity})',   // Indigo
    'rgba(255, 99, 255, {opacity})',   // Pink
    'rgba(99, 255, 132, {opacity})'    // Lime
  ];
  
  const colorIndex = index % baseColors.length;
  return {
    background: baseColors[colorIndex].replace('{opacity}', '0.2'),
    main: baseColors[colorIndex].replace('{opacity}', '1.0')
  };
};

// Row component with expandable details
const CategoryRow = ({ 
  category, 
  index, 
  maxTotal, 
  transactions 
}: { 
  category: CategoryData; 
  index: number; 
  maxTotal: number;
  transactions: any[]; 
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Get the color for this category
  const color = getCategoryColor(index);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Find transactions for this category
  const categoryTransactions = transactions
    .filter(t => (t.category_name || 'Uncategorized') === category.name)
    .slice(0, 3); // Show only 3 most recent transactions
  
  // Handle click to navigate to all transactions for this category
  const handleViewAllClick = () => {
    navigate(`/transactions?category=${encodeURIComponent(category.name)}`);
  };
  
  // Calculate percentage of total
  const percentage = Math.round((Math.abs(category.total) / maxTotal) * 100);
  
  return (
    <>
      <TableRow 
        hover
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
          backgroundColor: open ? color.background : 'inherit'
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell padding="checkbox">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell 
          component="th" 
          scope="row"
          sx={{ 
            fontWeight: 'medium',
            borderLeft: `4px solid ${color.main}`
          }}
        >
          {category.name}
        </TableCell>
        <TableCell align="right">
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'medium',
              color: theme.palette.error.main
            }}
          >
            {formatCurrency(category.total)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Chip 
            label={`${percentage}%`} 
            size="small"
            sx={{ 
              backgroundColor: color.background,
              color: color.main,
              fontWeight: 'bold',
              minWidth: '45px'
            }} 
          />
        </TableCell>
        <TableCell align="right">
          {category.count}
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell 
          style={{ paddingBottom: 0, paddingTop: 0 }} 
          colSpan={5}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 'bold', mt: 1 }}>
                Recent Transactions
              </Typography>
              
              {categoryTransactions.length > 0 ? (
                <Table size="small" aria-label="related transactions">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryTransactions.map((transaction) => (
                      <TableRow key={transaction.transaction_id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description || 'No description'}</TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'medium',
                              color: theme.palette.error.main
                            }}
                          >
                            {formatCurrency(transaction.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent transactions in this category.
                </Typography>
              )}
              
              {categoryTransactions.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <Typography 
                    variant="body2" 
                    color="primary" 
                    sx={{ cursor: 'pointer', fontWeight: 'medium' }}
                    onClick={handleViewAllClick}
                  >
                    View all {category.count} transactions
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const CategorySummary: React.FC<CategorySummaryProps> = ({ data, transactions }) => {
  // Filter categories that have expenses (negative totals)
  const expenseCategories = data
    .filter(category => category.total < 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Get the maximum absolute value for scaling
  const maxTotal = expenseCategories.length > 0 
    ? Math.abs(expenseCategories[0].total) 
    : 0;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Top Expense Categories
      </Typography>
      
      {expenseCategories.length === 0 ? (
        <Typography variant="body2" color="textSecondary" align="center" sx={{ p: 2 }}>
          No expense data available. Add some transactions to see your spending categories.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">% of Total</TableCell>
                <TableCell align="right">Transactions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseCategories.map((category, index) => (
                <CategoryRow 
                  key={category.name}
                  category={category}
                  index={index}
                  maxTotal={maxTotal}
                  transactions={transactions}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default CategorySummary;
