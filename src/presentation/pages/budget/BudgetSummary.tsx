import React, { useEffect, useRef } from 'react';
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
import Chart from 'chart.js/auto';

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

  // Split into income vs expense budgets
  const incomeBudgets = budgetProgress.filter(item => item.category_type === 'income');
  const expenseBudgets = budgetProgress.filter(item => item.category_type === 'expense');

  // Calculate totals by type
  const incomeBudgetTotal = incomeBudgets.reduce((sum, item) => sum + item.budget_amount, 0);
  const incomeActualTotal = incomeBudgets.reduce((sum, item) => sum + item.spent_amount, 0);

  const expenseBudgetTotal = expenseBudgets.reduce((sum, item) => sum + item.budget_amount, 0);
  const expenseActualTotal = expenseBudgets.reduce((sum, item) => sum + item.spent_amount, 0);

  const netBudgetTotal = incomeBudgetTotal - expenseBudgetTotal;
  const netActualTotal = incomeActualTotal - expenseActualTotal;

  const expenseAsIncomePct = incomeActualTotal > 0
    ? (expenseActualTotal / incomeActualTotal) * 100
    : 0;

  // Donut chart refs for expense categories
  const donutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const donutChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!donutCanvasRef.current) return;

    if (donutChartRef.current) {
      donutChartRef.current.destroy();
      donutChartRef.current = null;
    }

    if (expenseBudgets.length === 0) return;

    const ctx = donutCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = expenseBudgets.map(item => item.category_name);
    const data = expenseBudgets.map(item => item.budget_amount);

    const colors = [
      '#1976d2',
      '#f57c00',
      '#388e3c',
      '#d32f2f',
      '#7b1fa2',
      '#0097a7',
      '#c2185b',
      '#512da8'
    ];

    donutChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, idx) => colors[idx % colors.length]),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed as number;
                let base = `${label}: ${formatCurrency(value)}`;
                if (incomeBudgetTotal > 0) {
                  const pctOfIncome = (value / incomeBudgetTotal) * 100;
                  base += ` (${pctOfIncome.toFixed(1)}% of income budget)`;
                }
                return base;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    return () => {
      if (donutChartRef.current) {
        donutChartRef.current.destroy();
        donutChartRef.current = null;
      }
    };
  }, [expenseBudgets, incomeBudgetTotal]);

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
              {/* Income tile */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Income Budget
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(incomeBudgetTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Actual: {formatCurrency(incomeActualTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {incomeBudgetTotal > 0
                        ? `${((incomeActualTotal / incomeBudgetTotal) * 100).toFixed(1)}% of income budget used`
                        : 'No income budgets defined'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Expense tile */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Expense Budget
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(expenseBudgetTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Actual: {formatCurrency(expenseActualTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {expenseBudgetTotal > 0
                        ? `${((expenseActualTotal / expenseBudgetTotal) * 100).toFixed(1)}% of expense budget used`
                        : 'No expense budgets defined'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {incomeActualTotal > 0
                        ? `Expenses ${expenseAsIncomePct.toFixed(1)}% of income`
                        : 'No income actuals to compare'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Net tile */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Net Position
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(netActualTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Planned net: {formatCurrency(netBudgetTotal)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        netBudgetTotal !== 0
                          ? Math.min(
                              100,
                              Math.abs((netActualTotal / netBudgetTotal) * 100)
                            )
                          : 0
                      }
                      color={getStatusColor(
                        netBudgetTotal !== 0
                          ? Math.abs((netActualTotal / netBudgetTotal) * 100)
                          : 0
                      )}
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
                Expense Categories (vs income budget)
              </Typography>
              <Tooltip title="Add Budget">
                <IconButton onClick={onAddBudget} color="primary">
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {/* Donut on the left */}
              <Grid item xs={12} md={6}>
                {expenseBudgets.length === 0 || incomeBudgetTotal === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Define income and expense budgets to see distribution.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ maxWidth: 320, mx: 'auto' }}>
                    <canvas ref={donutCanvasRef} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                      sx={{ mt: 1 }}
                    >
                      Donut shows expense budgets; hover for each category’s share of income budget.
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* List on the right */}
              <Grid item xs={12} md={6}>
                {expenseBudgets.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No expense budgets defined for this month.
                  </Typography>
                ) : (
                  <>
                    {expenseBudgets.map((item) => {
                      const expenseShareOfIncomeBudget =
                        incomeBudgetTotal > 0
                          ? (item.budget_amount / incomeBudgetTotal) * 100
                          : null;

                      return (
                        <Box key={item.budget_id} sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 0.5
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.category_name}
                            </Typography>
                            <Chip
                              label={`${item.percentage.toFixed(1)}% of its budget`}
                              color={getStatusColor(item.percentage)}
                              size="small"
                            />
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(item.spent_amount)} spent
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(item.remaining_amount)} remaining of{' '}
                              {formatCurrency(item.budget_amount)}
                            </Typography>
                          </Box>

                          {expenseShareOfIncomeBudget !== null && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {expenseShareOfIncomeBudget.toFixed(1)}% of income budget
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default BudgetSummary;
