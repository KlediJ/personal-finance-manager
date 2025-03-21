import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MonthlyChart from './charts/MonthlyChart';
import CategoryBreakdown from './charts/CategoryBreakdown';
import RecentTransactions from './RecentTransactions';
import CategorySummary from './CategorySummary';

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  // State for dashboard data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Account summary data
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Transaction summary data
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  
  // Monthly totals
  const [currentMonthIncome, setCurrentMonthIncome] = useState<number>(0);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<number>(0);

  // Date handling helpers
  const getCurrentMonthStart = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  };
  
  const getCurrentMonthEnd = () => {
    const date = new Date();
    // Set to the last day of the current month
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
  };

  // Get dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load accounts data
      const accountsData = await window.api.accounts.getAll();
      setAccounts(accountsData);
      
      // Get total balance
      const balance = await window.api.accounts.getTotalBalance();
      setTotalBalance(balance);
      
      // Get recent transactions (last 10)
      const transactions = await window.api.transactions.getRecent(10);
      setRecentTransactions(transactions);
      
      // Get current month's transactions for income/expense summary
      const currentMonthStart = getCurrentMonthStart();
      const currentMonthEnd = getCurrentMonthEnd();
      const monthTransactions = await window.api.transactions.getByDateRange(
        currentMonthStart, currentMonthEnd
      );
      
      // Calculate monthly totals
      let incomeTotal = 0;
      let expenseTotal = 0;
      
      monthTransactions.forEach((t: any) => {
        if (t.transaction_type === 'income') {
          incomeTotal += t.amount;
        } else if (t.transaction_type === 'expense') {
          expenseTotal += t.amount; // Note: expense amounts are negative
        }
      });
      
      setCurrentMonthIncome(incomeTotal);
      setCurrentMonthExpenses(expenseTotal);
      
      // Get monthly data for chart (last 6 months)
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 5); // 6 months including current
      
      const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = getCurrentMonthEnd();
      
      const rangeTransactions = await window.api.transactions.getByDateRange(startDate, endDate);
      
      // Process monthly data
      const monthlySummary = processMonthlyData(rangeTransactions);
      setMonthlyData(monthlySummary);
      
      // Process category breakdown
      const categoryData = processCategoryData(rangeTransactions);
      setCategorySummary(categoryData);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Process transaction data into monthly summaries
  const processMonthlyData = (transactions: any[]) => {
    const monthlyMap = new Map();
    
    // Initialize monthly data for the last 6 months
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Get month name (e.g., "Jan 2023")
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyMap.set(monthKey, {
        month: monthName,
        income: 0,
        expenses: 0,
        net: 0
      });
    }
    
    // Aggregate transaction data by month
    transactions.forEach((t: any) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyMap.has(monthKey)) {
        const monthData = monthlyMap.get(monthKey);
        
        if (t.transaction_type === 'income') {
          monthData.income += t.amount;
        } else if (t.transaction_type === 'expense') {
          monthData.expenses += t.amount; // Note: expense amounts are negative
        }
        
        monthData.net = monthData.income + monthData.expenses;
        monthlyMap.set(monthKey, monthData);
      }
    });
    
    // Convert map to array and sort by month (oldest to newest)
    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        // Extract year and month for comparison
        const aDate = new Date(a.month);
        const bDate = new Date(b.month);
        return aDate.getTime() - bDate.getTime();
      });
  };

  // Process transaction data into category breakdown
  const processCategoryData = (transactions: any[]) => {
    const categories = new Map();
    
    // Group transactions by category
    transactions.forEach((t: any) => {
      // Skip transfers
      if (t.transaction_type === 'transfer') return;
      
      const categoryName = t.category_name || 'Uncategorized';
      
      if (!categories.has(categoryName)) {
        categories.set(categoryName, {
          name: categoryName,
          total: 0,
          count: 0
        });
      }
      
      const categoryData = categories.get(categoryName);
      categoryData.total += t.amount;
      categoryData.count += 1;
      categories.set(categoryName, categoryData);
    });
    
    // Convert to array and sort by total (absolute value)
    return Array.from(categories.values())
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  };

  // Load data when component mounts
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Calculate net change (income + expenses)
  const netChange = currentMonthIncome + currentMonthExpenses;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="contained" 
            onClick={loadDashboardData}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Summary Cards Row */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                Total Balance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {totalBalance.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </Typography>
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <AccountBalanceWalletIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: totalBalance >= 0 ? 'success.light' : 'error.light',
                    opacity: 0.6
                  }} 
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                Income This Month
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {currentMonthIncome.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </Typography>
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>
                <ArrowUpwardIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'success.light',
                    opacity: 0.6
                  }} 
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                Expenses This Month
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {Math.abs(currentMonthExpenses).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: theme.palette.text.secondary
                    }}
                  >
                    <Typography component="span" color="inherit">
                      Net: 
                    </Typography>
                    <Chip 
                      label={netChange.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      })}
                      size="small"
                      color={netChange >= 0 ? "success" : "error"}
                    />
                  </Box>
                </Box>
                <ArrowDownwardIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'error.light',
                    opacity: 0.6
                  }} 
                />
              </Box>
            </Paper>
          </Grid>

          {/* Charts Row */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Monthly Income & Expenses
              </Typography>
              <Box sx={{ height: 300 }}>
                <MonthlyChart data={monthlyData} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Spending by Category
              </Typography>
              <Box sx={{ height: 300 }}>
                <CategoryBreakdown data={categorySummary} />
              </Box>
            </Paper>
          </Grid>

          {/* Category Summary Table with drill-down */}
          <Grid item xs={12} md={5}>
            <CategorySummary data={categorySummary} transactions={recentTransactions} />
          </Grid>

          {/* Recent Transactions */}
          <Grid item xs={12} md={7}>
            <RecentTransactions transactions={recentTransactions} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
