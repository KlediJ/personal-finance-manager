import React, { useState, useEffect, useMemo } from 'react';
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
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useNavigate } from 'react-router-dom';
import CategoryBreakdown from './charts/CategoryBreakdown';
import PayeeSummary from './PayeeSummary';
import CategorySummary from './CategorySummary';

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  // State for dashboard data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Account summary data
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Transaction summary data
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [rangeTransactions, setRangeTransactions] = useState<any[]>([]);
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  const [payeeSummary, setPayeeSummary] = useState<any[]>([]);
  
  // Monthly totals
  const [currentMonthIncome, setCurrentMonthIncome] = useState<number>(0);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<number>(0);
  const [currentMonthCategorizedCount, setCurrentMonthCategorizedCount] = useState<number>(0);
  const [currentMonthUncategorizedCount, setCurrentMonthUncategorizedCount] = useState<number>(0);

  const [selectedPivotCategory, setSelectedPivotCategory] = useState<string | null>(null);

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
      console.log('Dashboard recent transactions:', transactions);
      setRecentTransactions(transactions);
      
      // Get current month's transactions for income/expense summary
      const currentMonthStart = getCurrentMonthStart();
      const currentMonthEnd = getCurrentMonthEnd();
      const monthTransactions = await window.api.transactions.getByDateRange(
        currentMonthStart, currentMonthEnd
      );
      console.log('Dashboard month transactions:', monthTransactions);
      
      // Calculate monthly totals and categorization progress
      let incomeTotal = 0;
      let expenseTotal = 0;
      let categorizedCount = 0;
      let uncategorizedCount = 0;
      
      monthTransactions.forEach((t: any) => {
        if (t.transaction_type === 'income') {
          incomeTotal += t.amount;
        } else if (t.transaction_type === 'expense') {
          expenseTotal += t.amount; // Note: expense amounts are negative
        }

        if (t.category_id) {
          categorizedCount += 1;
        } else {
          uncategorizedCount += 1;
        }
      });
      
      setCurrentMonthIncome(incomeTotal);
      setCurrentMonthExpenses(expenseTotal);
      setCurrentMonthCategorizedCount(categorizedCount);
      setCurrentMonthUncategorizedCount(uncategorizedCount);
      
      // Get transactions for category/payee analysis (last 6 months)
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 5); // 6 months including current
      
      const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = getCurrentMonthEnd();
      
      const rangeTx = await window.api.transactions.getByDateRange(startDate, endDate);
      setRangeTransactions(rangeTx);
      
      // Process category breakdown
      const categoryData = processCategoryData(rangeTx);
      setCategorySummary(categoryData);
      
      // Process payee breakdown
      const payeeData = processPayeeData(rangeTx);
      console.log('Dashboard payee data:', payeeData);
      setPayeeSummary(payeeData);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // Process transaction data into payee breakdown
  const processPayeeData = (transactions: any[]) => {
    const payees = new Map();
    
    // Group transactions by payee
    transactions.forEach((t: any) => {
      // Skip transfers
      if (t.transaction_type === 'transfer') return;
      
      const payeeName = t.payee_name || 'No payee';
      
      if (!payees.has(payeeName)) {
        payees.set(payeeName, {
          name: payeeName,
          total: 0,
          count: 0
        });
      }
      
      const payeeData = payees.get(payeeName);
      payeeData.total += t.amount;
      payeeData.count += 1;
      payees.set(payeeName, payeeData);
    });
    
    // Convert to array and sort by total (absolute value)
    return Array.from(payees.values())
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  };

  // Load data when component mounts
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Calculate net change (income + expenses)
  const netChange = currentMonthIncome + currentMonthExpenses;
  const totalMonthTransactions =
    currentMonthCategorizedCount + currentMonthUncategorizedCount;
  const categorizedPercent =
    totalMonthTransactions > 0
      ? Math.round(
          (currentMonthCategorizedCount / totalMonthTransactions) * 100
        )
      : 0;

  const pivotData = useMemo(() => {
    if (!rangeTransactions || rangeTransactions.length === 0) {
      return {
        categoryName: null as string | null,
        total: 0,
        merchants: [] as Array<{ name: string; total: number; count: number }>
      };
    }

    const expenses = rangeTransactions.filter(
      (t: any) => t.transaction_type === 'expense'
    );

    const byCategory = new Map<
      string,
      { total: number; merchants: Map<string, { total: number; count: number }> }
    >();

    expenses.forEach((t: any) => {
      const categoryName = t.category_name || 'Uncategorized';
      const payeeName = t.payee_name || 'No payee';

      if (!byCategory.has(categoryName)) {
        byCategory.set(categoryName, {
          total: 0,
          merchants: new Map()
        });
      }

      const entry = byCategory.get(categoryName)!;
      entry.total += t.amount;

      if (!entry.merchants.has(payeeName)) {
        entry.merchants.set(payeeName, { total: 0, count: 0 });
      }
      const merchantEntry = entry.merchants.get(payeeName)!;
      merchantEntry.total += t.amount;
      merchantEntry.count += 1;
    });

    const effectiveCategory =
      selectedPivotCategory && byCategory.has(selectedPivotCategory)
        ? selectedPivotCategory
        : null;

    if (!effectiveCategory) {
      return {
        categoryName: null as string | null,
        total: 0,
        merchants: [] as Array<{ name: string; total: number; count: number }>
      };
    }

    const catEntry = byCategory.get(effectiveCategory)!;
    const merchantsArray = Array.from(catEntry.merchants.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 8);

    return {
      categoryName: effectiveCategory,
      total: catEntry.total,
      merchants: merchantsArray
    };
  }, [rangeTransactions, selectedPivotCategory]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<MonetizationOnIcon />}
            onClick={() => navigate('/budget')}
          >
            Budget
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
              <Typography color="textSecondary" gutterBottom variant="subtitle2">
                Categorization (This Month)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {categorizedPercent}%
                  </Typography>
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    {currentMonthCategorizedCount} categorized
                  </Typography>
                  <Typography color="textSecondary">
                    {currentMonthUncategorizedCount} uncategorized
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Category breakdown and pivot */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Spending by Category
              </Typography>
              <Box sx={{ height: 300 }}>
                <CategoryBreakdown
                  data={categorySummary}
                  onCategoryClick={(name) =>
                    setSelectedPivotCategory((prev) =>
                      prev === name ? null : name
                    )
                  }
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Category × Merchant Pivot
              </Typography>
              {pivotData.categoryName ? (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {pivotData.categoryName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Total spend:{' '}
                    {Math.abs(pivotData.total).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </Typography>
                  {pivotData.merchants.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mt: 1 }}
                    >
                      No merchants found for this category.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {pivotData.merchants.map((m) => (
                        <Box
                          key={m.name}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover
                            },
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                          onClick={() =>
                            navigate(
                              `/transactions?category=${encodeURIComponent(
                                pivotData.categoryName || ''
                              )}&payee=${encodeURIComponent(m.name)}`
                            )
                          }
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {m.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {m.count} transaction
                              {m.count !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'medium',
                              color: theme.palette.error.main
                            }}
                          >
                            {Math.abs(m.total).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD'
                            })}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Click a category in the chart to see its top merchants.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Category Summary Table with drill-down */}
          <Grid item xs={12} md={5}>
            <CategorySummary data={categorySummary} transactions={recentTransactions} />
          </Grid>

          {/* Payee Summary */}
          <Grid item xs={12} md={7}>
            <PayeeSummary data={payeeSummary} transactions={recentTransactions} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
