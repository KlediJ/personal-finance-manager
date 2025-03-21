import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Stack,
  useTheme
} from '@mui/material';
import Chart from 'chart.js/auto';
import { Account } from '../../../data-storage/models/Account';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface AccountActivity {
  inflow: number;
  outflow: number;
  net: number;
  transactions: any[];
}

interface AccountTypeData {
  totalBalance: number;
  accounts: Account[];
  activity?: AccountActivity;
}

interface AccountSummary {
  [key: string]: AccountTypeData;
}

const AccountSummaryPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>({});
  const theme = useTheme();

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Get the last 30 days boundaries
  const getLast30DaysBoundaries = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Format as YYYY-MM-DD
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return { startDate, endDate };
  };

  // Load accounts data
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        setLoading(true);
        const accounts = await window.api.accounts.getAll();
        
        // Get transactions for the last 30 days
        const { startDate, endDate } = getLast30DaysBoundaries();
        const recentTransactions = await window.api.transactions.getByDateRange(startDate, endDate);
        
        // Group accounts by type
        const summary: AccountSummary = {};
        
        accounts.forEach((account: Account) => {
          if (!summary[account.type]) {
            summary[account.type] = {
              totalBalance: 0,
              accounts: [],
              activity: {
                inflow: 0,
                outflow: 0,
                net: 0,
                transactions: []
              }
            };
          }
          
          summary[account.type].accounts.push(account);
          summary[account.type].totalBalance += account.current_balance;
        });
        
        // Calculate 30-day activity for each account type
        recentTransactions.forEach((transaction: any) => {
          const accountType = accounts.find(a => a.account_id === transaction.account_id)?.type;
          if (accountType && summary[accountType]?.activity) {
            if (transaction.transaction_type === 'income') {
              summary[accountType].activity!.inflow += transaction.amount;
              summary[accountType].activity!.net += transaction.amount;
            } else if (transaction.transaction_type === 'expense') {
              summary[accountType].activity!.outflow += Math.abs(transaction.amount);
              summary[accountType].activity!.net += transaction.amount; // Already negative
            }
            
            summary[accountType].activity!.transactions.push(transaction);
          }
        });
        
        setAccountSummary(summary);
      } catch (error) {
        console.error('Error loading account data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAccountData();
  }, []);

  // Function to create a chart
  const createChart = (container: HTMLDivElement | null, accounts: Account[], accountType: string) => {
    if (!container || accounts.length === 0) return;
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Get context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Create chart
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: accounts.map(account => account.name),
        datasets: [{
          label: 'Balance',
          data: accounts.map(account => Math.abs(account.current_balance)),
          backgroundColor: accounts.map((_, index) => {
            const colors = [
              'rgba(75, 192, 192, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(153, 102, 255, 0.7)',
              'rgba(255, 159, 64, 0.7)',
              'rgba(255, 99, 132, 0.7)',
              'rgba(255, 206, 86, 0.7)'
            ];
            return colors[index % colors.length];
          }),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 10,
              font: {
                size: 10
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatCurrency(accounts[context.dataIndex].current_balance);
                return label;
              }
            }
          }
        }
      }
    });
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render no accounts state
  if (Object.keys(accountSummary).length === 0) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Account Summary</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No accounts found. Create an account to see the summary.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Render account summary sections
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Account Summary</Typography>
      
      <Grid container spacing={3}>
        {Object.entries(accountSummary).length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No accounts found. Go to Settings → Accounts to create an account and get started.
            </Alert>
          </Grid>
        ) : (
          Object.entries(accountSummary).map(([accountType, data]) => (
            <Grid item xs={12} key={accountType}>
              <Card>
                <CardHeader 
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="h6">
                        {accountType.charAt(0).toUpperCase() + accountType.slice(1) + ' Accounts'}
                      </Typography>
                      <Chip 
                        label={formatCurrency(data.totalBalance)} 
                        color={data.totalBalance >= 0 ? 'primary' : 'error'}
                        size="medium"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  }
                  sx={{ 
                    backgroundColor: 
                      accountType === 'credit_card' ? 'rgba(255, 99, 132, 0.1)' : 
                      accountType === 'investment' ? 'rgba(54, 162, 235, 0.1)' : 
                      accountType === 'loan' ? 'rgba(255, 159, 64, 0.1)' : 
                      'rgba(75, 192, 192, 0.1)'
                  }}
                />
                
                <CardContent>
                  <Grid container spacing={3}>
                    {/* 30-Day Summary */}
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                          Last 30 Days Activity
                        </Typography>
                        
                        <Stack spacing={2}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Money In</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrendingUpIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="success.main" fontWeight="bold">
                                  {formatCurrency(data.activity?.inflow || 0)}
                                </Typography>
                              </Box>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(100, ((data.activity?.inflow || 0) / (Math.max(data.activity?.inflow || 0, data.activity?.outflow || 0) || 1)) * 100)} 
                              color="success"
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Money Out</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrendingDownIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="error.main" fontWeight="bold">
                                  {formatCurrency(data.activity?.outflow || 0)}
                                </Typography>
                              </Box>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(100, ((data.activity?.outflow || 0) / (Math.max(data.activity?.inflow || 0, data.activity?.outflow || 0) || 1)) * 100)} 
                              color="error"
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          
                          <Box sx={{ p: 1, backgroundColor: 'background.paper', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight="medium">Net Flow</Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                color={(data.activity?.net || 0) >= 0 ? 'success.main' : 'error.main'}
                              >
                                {formatCurrency(data.activity?.net || 0)}
                              </Typography>
                            </Box>
                          </Box>
                        </Stack>
                      </Box>
                    </Grid>
                    
                    {/* Accounts Table */}
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Accounts
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell align="right">Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.accounts.map((account) => (
                              <TableRow key={account.account_id}>
                                <TableCell>{account.name}</TableCell>
                                <TableCell 
                                  align="right"
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: account.current_balance < 0 ? 'error.main' : 'inherit'
                                  }}
                                >
                                  {formatCurrency(account.current_balance, account.currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                    
                    {/* Chart Container */}
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Balance Distribution
                      </Typography>
                      <Box 
                        id={`chart-${accountType}`}
                        sx={{ height: 180 }}
                        ref={(el) => {
                          if (el) {
                            // Use setTimeout to ensure DOM is ready
                            setTimeout(() => createChart(el as HTMLDivElement, data.accounts, accountType), 0);
                          }
                        }} 
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default AccountSummaryPage;