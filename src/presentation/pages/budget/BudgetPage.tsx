import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import BudgetList from './BudgetList';
import BudgetFormDialog from './BudgetFormDialog';
import BudgetSummary from './BudgetSummary';
import { Budget, BudgetPeriod } from '../../../data-storage/models/Budget';

// Interface for budget with category information
interface BudgetWithCategory extends Budget {
  category_name: string;
  category_type: string;
  category_icon?: string;
}

// Interface for budget progress information
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

const BudgetPage: React.FC = () => {
  // State for budgets
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for dialog
  const [openBudgetForm, setOpenBudgetForm] = useState<boolean>(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  // State for budget progress
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  
  // State for tab
  const [tabValue, setTabValue] = useState<number>(0);

  // Load budgets
  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if window.api exists
      if (!window.api) {
        console.error('Electron API not available - window.api is undefined');
        setError('Application API is not available. Please restart the application.');
        setLoading(false);
        return;
      }
      
      // Check if budgets API is available
      if (!window.api.budgets) {
        console.error('Budget API not available. Available APIs:', Object.keys(window.api));
        setError('Budget functionality is not available. Please restart the application.');
        setLoading(false);
        return;
      }
      
      // Check if the specific method exists
      if (!window.api.budgets.getAllWithCategories) {
        console.error('Budget API methods missing. Available methods:', Object.keys(window.api.budgets));
        setError('Budget methods are not properly initialized. Please restart the application.');
        setLoading(false);
        return;
      }
      
      // Load all budgets with category information
      console.log('Fetching budgets with getAllWithCategories()...');
      const budgetsData = await window.api.budgets.getAllWithCategories();
      console.log('Budget data received:', budgetsData);
      setBudgets(budgetsData || []);
      
      // Load budget progress for current month
      console.log('Fetching budget progress...');
      const progressData = await window.api.budgets.getBudgetProgress();
      console.log('Budget progress data received:', progressData);
      setBudgetProgress(progressData || []);
      
    } catch (error) {
      console.error('Error loading budgets:', error);
      setError('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load budgets on component mount
  useEffect(() => {
    loadBudgets();
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle opening budget form for a new budget
  const handleAddBudget = () => {
    setSelectedBudget(null);
    setOpenBudgetForm(true);
  };

  // Handle opening budget form for editing an existing budget
  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setOpenBudgetForm(true);
  };

  // Handle closing budget form
  const handleCloseForm = () => {
    setOpenBudgetForm(false);
  };

  // Handle saving a budget
  const handleSaveBudget = async (budget: Budget) => {
    try {
      setLoading(true);
      
      if (budget.budget_id) {
        // Update existing budget
        await window.api.budgets.update(budget.budget_id, budget);
      } else {
        // Create new budget
        await window.api.budgets.create(budget);
      }
      
      // Reload budgets
      await loadBudgets();
      
      // Close form
      setOpenBudgetForm(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      setError('Failed to save budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a budget
  const handleDeleteBudget = async (budgetId: number) => {
    try {
      setLoading(true);
      
      // Delete budget
      await window.api.budgets.delete(budgetId);
      
      // Reload budgets
      await loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      setError('Failed to delete budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Budget Management</Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton 
              onClick={loadBudgets}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddBudget}
            disabled={loading}
          >
            New Budget
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Budget Progress" />
          <Tab label="Budget Management" />
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Content */}
      {!loading && (
        <>
          {/* Budget Progress */}
          {tabValue === 0 && (
            <BudgetSummary 
              budgetProgress={budgetProgress} 
              onAddBudget={handleAddBudget}
            />
          )}

          {/* Budget Management */}
          {tabValue === 1 && (
            <BudgetList 
              budgets={budgets} 
              onEdit={handleEditBudget} 
              onDelete={handleDeleteBudget} 
            />
          )}
        </>
      )}

      {/* Budget Form Dialog */}
      <BudgetFormDialog
        open={openBudgetForm}
        onClose={handleCloseForm}
        onSave={handleSaveBudget}
        budget={selectedBudget}
      />
    </Box>
  );
};

export default BudgetPage;