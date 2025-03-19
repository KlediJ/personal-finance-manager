import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  Chip,
  useTheme,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Account {
  account_id: number;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
  active: boolean;
}

interface AccountsSummaryProps {
  accounts: Account[];
}

const AccountsSummary: React.FC<AccountsSummaryProps> = ({ accounts }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Calculate maximum balance for scaling the progress bars
  let maxBalance = 0;
  accounts.forEach(account => {
    const absBalance = Math.abs(account.current_balance);
    if (absBalance > maxBalance) {
      maxBalance = absBalance;
    }
  });

  // Get appropriate account type label
  const getAccountTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'checking': 'Checking',
      'savings': 'Savings',
      'credit_card': 'Credit Card',
      'investment': 'Investment',
      'loan': 'Loan',
      'cash': 'Cash'
    };
    return typeMap[type] || type;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Handle click on account to navigate to account details
  const handleAccountClick = (accountId: number) => {
    navigate(`/accounts?id=${accountId}`);
  };

  // Sort accounts: active first, then by balance (highest to lowest)
  const sortedAccounts = [...accounts].sort((a, b) => {
    // Active accounts first
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    
    // Then by balance (absolute value, highest first)
    return Math.abs(b.current_balance) - Math.abs(a.current_balance);
  });

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Accounts
      </Typography>
      
      {accounts.length === 0 ? (
        <Typography variant="body2" color="textSecondary" align="center" sx={{ p: 2 }}>
          No accounts found. Add an account to get started.
        </Typography>
      ) : (
        <List disablePadding>
          {sortedAccounts.map((account, index) => (
            <React.Fragment key={account.account_id}>
              {index > 0 && <Divider />}
              <ListItemButton 
                onClick={() => handleAccountClick(account.account_id)}
                sx={{ px: 1, py: 1.5 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{account.name}</Typography>
                        <Chip 
                          label={getAccountTypeLabel(account.type)} 
                          size="small"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            backgroundColor: theme.palette.grey[200] 
                          }}
                        />
                        {!account.active && (
                          <Chip 
                            label="Inactive" 
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: theme.palette.grey[300] 
                            }}
                          />
                        )}
                      </Box>
                      <Typography 
                        variant="subtitle1"
                        sx={{ 
                          fontWeight: 'medium',
                          color: account.current_balance >= 0 
                            ? theme.palette.success.main 
                            : theme.palette.error.main
                        }}
                      >
                        {formatCurrency(account.current_balance, account.currency)}
                      </Typography>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (Math.abs(account.current_balance) / maxBalance) * 100)}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: account.current_balance >= 0 
                              ? theme.palette.success.main 
                              : theme.palette.error.main
                          }
                        }}
                      />
                    </Box>
                  }
                />
              </ListItemButton>
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default AccountsSummary;
