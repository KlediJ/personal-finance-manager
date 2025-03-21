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
  CardHeader
} from '@mui/material';
import Chart from 'chart.js/auto';
import { Account } from '../../../data-storage/models/Account';

interface AccountTypeData {
  totalBalance: number;
  accounts: Account[];
}

interface AccountSummary {
  [key: string]: AccountTypeData;
}

const AccountSummaryPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>({});

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Load accounts data
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        setLoading(true);
        const accounts = await window.api.accounts.getAll();
        
        // Group accounts by type
        const summary: AccountSummary = {};
        
        accounts.forEach((account: Account) => {
          if (!summary[account.type]) {
            summary[account.type] = {
              totalBalance: 0,
              accounts: []
            };
          }
          
          summary[account.type].accounts.push(account);
          summary[account.type].totalBalance += account.current_balance;
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
      type: 'bar',
      data: {
        labels: accounts.map(account => account.name),
        datasets: [{
          label: 'Balance',
          data: accounts.map(account => account.current_balance),
          backgroundColor: 
            accountType === 'credit_card' ? 'rgba(255, 99, 132, 0.7)' : 
            accountType === 'investment' ? 'rgba(54, 162, 235, 0.7)' : 
            accountType === 'loan' ? 'rgba(255, 159, 64, 0.7)' : 
            'rgba(75, 192, 192, 0.7)',
          borderColor: 
            accountType === 'credit_card' ? 'rgb(255, 99, 132)' : 
            accountType === 'investment' ? 'rgb(54, 162, 235)' : 
            accountType === 'loan' ? 'rgb(255, 159, 64)' : 
            'rgb(75, 192, 192)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
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
        {Object.entries(accountSummary).map(([accountType, data]) => (
          <Grid item xs={12} key={accountType}>
            <Card>
              <CardHeader 
                title={accountType.charAt(0).toUpperCase() + accountType.slice(1) + ' Accounts'} 
                subheader={`Total: ${formatCurrency(data.totalBalance)}`}
                sx={{ 
                  backgroundColor: 
                    accountType === 'credit_card' ? 'rgba(255, 99, 132, 0.1)' : 
                    accountType === 'investment' ? 'rgba(54, 162, 235, 0.1)' : 
                    accountType === 'loan' ? 'rgba(255, 159, 64, 0.1)' : 
                    'rgba(75, 192, 192, 0.1)'
                }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* Accounts List */}
                  <Box sx={{ flex: 1, mr: { xs: 0, md: 2 }, mb: { xs: 2, md: 0 } }}>
                    <Typography variant="subtitle1" gutterBottom>Accounts</Typography>
                    {data.accounts.map((account) => (
                      <Box key={account.account_id} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{account.name}</Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: account.current_balance < 0 ? 'error.main' : 'inherit'
                            }}
                          >
                            {formatCurrency(account.current_balance, account.currency)}
                          </Typography>
                        </Box>
                        <Divider sx={{ mt: 0.5 }} />
                      </Box>
                    ))}
                  </Box>
                  
                  {/* Chart Container */}
                  <Box 
                    id={`chart-${accountType}`}
                    sx={{ flex: 2, height: 200 }}
                    ref={(el) => {
                      if (el) {
                        // Use setTimeout to ensure DOM is ready
                        setTimeout(() => createChart(el as HTMLDivElement, data.accounts, accountType), 0);
                      }
                    }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AccountSummaryPage;