import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

interface BudgetProgress {
  budget_id: number;
  category_id: number;
  category_name: string;
  category_type: string;
  category_icon?: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage: number;
}

interface BudgetSummaryProps {
  budgetProgress: BudgetProgress[];
  onAddBudget: () => void;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ budgetProgress, onAddBudget }) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate total budget and spent amounts
  const totalBudget = budgetProgress.reduce((sum, item) => sum + item.budget_amount, 0);
  const totalSpent = budgetProgress.reduce((sum, item) => sum + item.spent_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Get status color based on percentage
  const getStatusColor = (percentage: number) => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'error';
  };

  // Get status icon based on percentage
  const getStatusIcon = (percentage: number) => {
    if (percentage < 70) return <CheckCircleIcon color="success" />;
    if (percentage < 90) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  return (
    <Box>
      {budgetProgress.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Budget Data
          </Typography>
          <Typography paragraph>
            You don't have any active budgets for the current month.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddBudget}
            sx={{ mt: 2 }}
          >
            Create Budget
          </Button>
        </Paper>
      ) : (
        <>
          {/* Budget Overview Card */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Budget Overview
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Total Budget
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(totalBudget)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Spent
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(totalSpent)}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {totalPercentage.toFixed(1)}% of budget
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Remaining
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(totalRemaining)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(totalPercentage, 100)}
                      color={getStatusColor(totalPercentage)}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Category Budget Progress */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Category Budget Progress
              </Typography>
              <Tooltip title="Add Budget">
                <IconButton onClick={onAddBudget} color="primary">
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {budgetProgress.map((item) => (
                <Grid item xs={12} key={item.budget_id}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {item.category_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(item.percentage)}
                        <Chip
                          label={`${item.percentage.toFixed(1)}%`}
                          color={getStatusColor(item.percentage)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.percentage, 100)}
                      color={getStatusColor(item.percentage)}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(item.spent_amount)} spent
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(item.remaining_amount)} remaining of {formatCurrency(item.budget_amount)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default BudgetSummary;