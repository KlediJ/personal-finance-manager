import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  FormHelperText,
  SelectChangeEvent,
  CircularProgress,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { Budget, BudgetPeriod } from '../../../data-storage/models/Budget';
import { Category, CategoryType } from '../../../data-storage/models/Category';

interface BudgetFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (budget: Budget) => void;
  budget: Budget | null;
}

// Default budget values
const defaultBudget: Budget = {
  category_id: 0,
  amount: 0,
  period: BudgetPeriod.MONTHLY,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const BudgetFormDialog: React.FC<BudgetFormDialogProps> = ({
  open,
  onClose,
  onSave,
  budget
}) => {
  const [formValues, setFormValues] = useState<Budget>(defaultBudget);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | 'all'>('all');
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
  const [suggestLoading, setSuggestLoading] = useState<boolean>(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        // Load all categories; we'll filter by type in the UI
        const expenseCategories = await window.api.categories.getByType(CategoryType.EXPENSE);
        const incomeCategories = await window.api.categories.getByType(CategoryType.INCOME);
        const allCategories: Category[] = [...incomeCategories, ...expenseCategories];
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadCategories();
    }
  }, [open]);

  // Initialize form with budget data if editing
  useEffect(() => {
    if (budget) {
      setFormValues(budget);
    } else {
      setFormValues({
        ...defaultBudget,
        // Set default end date based on period
        end_date: getDefaultEndDate(defaultBudget.start_date, BudgetPeriod.MONTHLY)
      });
    }
    setErrors({});
  }, [budget, open]);
  // Load suggested amount when category or filter changes
  useEffect(() => {
    const loadSuggestion = async () => {
      if (!formValues.category_id || !open) {
        setSuggestedAmount(null);
        return;
      }

      try {
        setSuggestLoading(true);

        // Look back over the last 3 full months for this category
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const past = new Date();
        past.setMonth(past.getMonth() - 3);
        const startDate = past.toISOString().split('T')[0];

        const allInRange = await window.api.transactions.getByDateRange(startDate, endDate);
        const byCategory = allInRange.filter(
          (t: any) => t.category_id === formValues.category_id
        );

        if (byCategory.length === 0) {
          setSuggestedAmount(null);
          return;
        }

        const category = categories.find(c => c.category_id === formValues.category_id);
        const isExpense = category?.type === CategoryType.EXPENSE;

        const total = byCategory.reduce((sum: number, t: any) => sum + t.amount, 0);
        const months = 3;

        // For expenses, amounts are typically negative; flip sign for budget
        const averagePerMonth = isExpense ? Math.abs(total) / months : total / months;

        setSuggestedAmount(Number.isFinite(averagePerMonth) ? averagePerMonth : null);
      } catch (error) {
        console.error('Error computing suggested budget amount:', error);
        setSuggestedAmount(null);
      } finally {
        setSuggestLoading(false);
      }
    };

    loadSuggestion();
  }, [formValues.category_id, open, categories]);

  // Calculate default end date based on period
  const getDefaultEndDate = (startDate: string, period: BudgetPeriod): string => {
    const date = new Date(startDate);
    
    switch (period) {
      case BudgetPeriod.MONTHLY:
        // Last day of the month
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        break;
      case BudgetPeriod.QUARTERLY:
        // Add 3 months and set to last day
        date.setMonth(date.getMonth() + 3);
        date.setDate(0);
        break;
      case BudgetPeriod.ANNUAL:
        // Add 1 year and subtract 1 day
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() - 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormValues({
        ...formValues,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormValues({
        ...formValues,
        [name]: value
      });
      
      // If changing start date, update end date based on period
      if (name === 'start_date') {
        setFormValues(prev => ({
          ...prev,
          [name]: value,
          end_date: getDefaultEndDate(value, prev.period)
        }));
      }
    }
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    
    if (name === 'category_id') {
      setFormValues({
        ...formValues,
        [name]: parseInt(value)
      });
      setSuggestedAmount(null);
    } else if (name === 'period') {
      const period = value as BudgetPeriod;
      setFormValues({
        ...formValues,
        [name]: period,
        // Update end date based on new period
        end_date: getDefaultEndDate(formValues.start_date, period)
      });
    } else {
      setFormValues({
        ...formValues,
        [name]: value
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formValues.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    if (formValues.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }
    
    if (!formValues.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formValues.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formValues.end_date < formValues.start_date) {
      newErrors.end_date = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formValues);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {budget ? 'Edit Budget' : 'Create New Budget'}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress sx={{ my: 3, display: 'block', mx: 'auto' }} />
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Budget type
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={categoryFilter}
                  onChange={(_e, val) => {
                    if (!val) return;
                    setCategoryFilter(val);
                  }}
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value={CategoryType.INCOME}>Income</ToggleButton>
                  <ToggleButton value={CategoryType.EXPENSE}>Expense</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.category_id}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={`${formValues.category_id || ''}`}
                  onChange={handleSelectChange}
                  label="Category"
                >
                  {categories
                    .filter(category => {
                      if (categoryFilter === 'all') return true;
                      return category.type === categoryFilter;
                    })
                    .map(category => (
                      <MenuItem key={category.category_id} value={`${category.category_id}`}>
                        {category.name}
                      </MenuItem>
                    ))}
                </Select>
                {errors.category_id && <FormHelperText>{errors.category_id}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="amount"
                label="Budget Amount"
                type="number"
                fullWidth
                value={formValues.amount}
                onChange={handleChange}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>

            {suggestedAmount !== null && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Suggested monthly amount based on last 3 months:{' '}
                    <strong>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(suggestedAmount)}
                    </strong>
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setFormValues(prev => ({
                        ...prev,
                        amount: Number(suggestedAmount.toFixed(2))
                      }))
                    }
                    disabled={suggestLoading}
                  >
                    Use suggestion
                  </Button>
                </Box>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select
                  name="period"
                  value={formValues.period}
                  onChange={handleSelectChange}
                  label="Period"
                >
                  <MenuItem value={BudgetPeriod.MONTHLY}>Monthly</MenuItem>
                  <MenuItem value={BudgetPeriod.QUARTERLY}>Quarterly</MenuItem>
                  <MenuItem value={BudgetPeriod.ANNUAL}>Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="start_date"
                label="Start Date"
                type="date"
                fullWidth
                value={formValues.start_date}
                onChange={handleChange}
                error={!!errors.start_date}
                helperText={errors.start_date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="end_date"
                label="End Date"
                type="date"
                fullWidth
                value={formValues.end_date}
                onChange={handleChange}
                error={!!errors.end_date}
                helperText={errors.end_date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BudgetFormDialog;
