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
  CircularProgress
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

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        // Only get expense categories for budgeting
        const categoriesData = await window.api.categories.getByType(CategoryType.EXPENSE);
        setCategories(categoriesData);
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
              <FormControl fullWidth error={!!errors.category_id}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={`${formValues.category_id || ''}`}
                  onChange={handleSelectChange}
                  label="Category"
                >
                  {categories.map(category => (
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