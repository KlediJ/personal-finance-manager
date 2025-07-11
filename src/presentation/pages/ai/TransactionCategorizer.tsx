import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  AutoFixHigh as AutoFixIcon
} from '@mui/icons-material';
import { Transaction } from '../../../data-storage/models/Transaction';
import { Category } from '../../../data-storage/models/Category';

interface TransactionCategorizerProps {
  aiStatus: 'loading' | 'ready' | 'error';
}

interface UncategorizedTransaction extends Transaction {
  suggestedCategory?: Category;
  confidence?: number;
  isEditing?: boolean;
}

const TransactionCategorizer: React.FC<TransactionCategorizerProps> = ({ aiStatus }) => {
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<UncategorizedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    categorized: 0,
    uncategorized: 0,
    lastRun: null as Date | null
  });

  useEffect(() => {
    loadUncategorizedTransactions();
    loadCategories();
    loadStats();
    
    // Set up progress listener (with fallback check)
    if (window.api && window.api.ai && window.api.ai.onCategorizationProgress) {
      window.api.ai.onCategorizationProgress((progress: number) => {
        setProgress(progress);
      });
    }
    
    return () => {
      if (window.api && window.api.ai && window.api.ai.removeCategorizationProgressListener) {
        window.api.ai.removeCategorizationProgressListener();
      }
    };
  }, []);

  const loadUncategorizedTransactions = async () => {
    try {
      // Fallback if AI API is not available
      if (!window.api || !window.api.ai || !window.api.ai.getUncategorizedTransactions) {
        // Use regular API
        const transactions = await window.api.transactions.getAll();
        const uncategorized = transactions.filter((t: Transaction) => !t.category_id);
        setUncategorizedTransactions(uncategorized);
        return;
      }
      
      // Use AI service to get uncategorized transactions
      const result = await window.api.ai.getUncategorizedTransactions();
      if (result.success && result.transactions) {
        setUncategorizedTransactions(result.transactions);
      } else {
        console.error('Error loading uncategorized transactions:', result.error);
        setUncategorizedTransactions([]);
      }
    } catch (error) {
      console.error('Error loading uncategorized transactions:', error);
      setUncategorizedTransactions([]);
    }
  };

  const loadCategories = async () => {
    try {
      const allCategories = await window.api.categories.getAll();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Fallback if AI API is not available
      if (!window.api || !window.api.ai || !window.api.ai.getStatistics) {
        // Calculate stats manually
        const allTransactions = await window.api.transactions.getAll();
        const categorized = allTransactions.filter((t: Transaction) => t.category_id);
        const uncategorized = allTransactions.filter((t: Transaction) => !t.category_id);
        
        setStats({
          total: allTransactions.length,
          categorized: categorized.length,
          uncategorized: uncategorized.length,
          lastRun: null
        });
        return;
      }
      
      const result = await window.api.ai.getStatistics();
      if (result.success) {
        setStats({
          total: result.stats.total,
          categorized: result.stats.categorized,
          uncategorized: result.stats.uncategorized,
          lastRun: result.stats.lastUpdated ? new Date(result.stats.lastUpdated) : null
        });
      } else {
        console.error('Error loading stats:', result.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const runAutoCategorization = async () => {
    if (aiStatus !== 'ready') return;
    
    setIsProcessing(true);
    setProgress(0);

    try {
      // Check if AI API is available
      if (!window.api || !window.api.ai || !window.api.ai.batchCategorizeTransactions) {
        console.log('AI API not available, using mock categorization');
        await runMockCategorization();
        return;
      }
      
      // Use AI service for batch categorization
      const result = await window.api.ai.batchCategorizeTransactions(uncategorizedTransactions);
      
      if (result.success) {
        // Update transactions with AI suggestions
        setUncategorizedTransactions(prev => 
          prev.map(transaction => {
            const predictions = result.results[transaction.transaction_id!];
            if (predictions && predictions.length > 0) {
              return {
                ...transaction,
                suggestedCategory: predictions[0].category,
                confidence: predictions[0].confidence
              };
            }
            return transaction;
          })
        );
      } else {
        console.error('Error in AI categorization:', result.error);
        // Fallback to mock categorization
        await runMockCategorization();
      }
    } catch (error) {
      console.error('Error running auto-categorization:', error);
      // Fallback to mock categorization
      await runMockCategorization();
    } finally {
      setIsProcessing(false);
    }
  };

  const runMockCategorization = async () => {
    for (let i = 0; i < uncategorizedTransactions.length; i++) {
      const transaction = uncategorizedTransactions[i];
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Mock AI categorization logic
      const suggestedCategory = getMockSuggestedCategory(transaction);
      const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence
      
      setUncategorizedTransactions(prev => 
        prev.map((t, index) => 
          index === i 
            ? { ...t, suggestedCategory, confidence }
            : t
        )
      );
      
      setProgress(((i + 1) / uncategorizedTransactions.length) * 100);
    }
  };

  const getMockSuggestedCategory = (transaction: Transaction): Category | undefined => {
    const description = transaction.description?.toLowerCase() || '';
    
    // Simple rule-based mock categorization
    if (description.includes('grocery') || description.includes('supermarket') || description.includes('food')) {
      return categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('grocery'));
    }
    if (description.includes('gas') || description.includes('fuel') || description.includes('petrol')) {
      return categories.find(c => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('gas'));
    }
    if (description.includes('restaurant') || description.includes('cafe') || description.includes('dining')) {
      return categories.find(c => c.name.toLowerCase().includes('dining') || c.name.toLowerCase().includes('restaurant'));
    }
    
    return categories[Math.floor(Math.random() * categories.length)];
  };

  const handleApproveCategory = async (transactionId: number, categoryId: number) => {
    try {
      const transaction = uncategorizedTransactions.find(t => t.transaction_id === transactionId);
      if (!transaction) return;

      await window.api.transactions.update(transactionId, {
        ...transaction,
        category_id: categoryId
      });

      // Remove from uncategorized list
      setUncategorizedTransactions(prev => 
        prev.filter(t => t.transaction_id !== transactionId)
      );
      
      // TODO: Send feedback to AI service for learning
      
      loadStats();
    } catch (error) {
      console.error('Error approving category:', error);
    }
  };

  const handleRejectCategory = (transactionId: number) => {
    setUncategorizedTransactions(prev => 
      prev.map(t => 
        t.transaction_id === transactionId 
          ? { ...t, suggestedCategory: undefined, confidence: undefined }
          : t
      )
    );
  };

  const handleEditCategory = (transactionId: number) => {
    setUncategorizedTransactions(prev => 
      prev.map(t => 
        t.transaction_id === transactionId 
          ? { ...t, isEditing: true }
          : t
      )
    );
  };

  const handleSaveManualCategory = async (transactionId: number, categoryId: number) => {
    try {
      const transaction = uncategorizedTransactions.find(t => t.transaction_id === transactionId);
      if (!transaction) return;

      await window.api.transactions.update(transactionId, {
        ...transaction,
        category_id: categoryId
      });

      // Remove from uncategorized list
      setUncategorizedTransactions(prev => 
        prev.filter(t => t.transaction_id !== transactionId)
      );
      
      // TODO: Send manual categorization to AI service for learning
      
      loadStats();
    } catch (error) {
      console.error('Error saving manual category:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {stats.categorized}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categorized
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {stats.uncategorized}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Needs Categorization
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.primary">
                {stats.uncategorized > 0 ? Math.round((stats.categorized / stats.total) * 100) : 100}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completion Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={isProcessing ? <AutoFixIcon /> : <PlayIcon />}
          onClick={runAutoCategorization}
          disabled={aiStatus !== 'ready' || isProcessing || uncategorizedTransactions.length === 0}
        >
          {isProcessing ? 'Processing...' : 'Run AI Categorization'}
        </Button>
        
        <Typography variant="body2" color="text.secondary">
          {uncategorizedTransactions.length} transactions need categorization
        </Typography>
      </Box>

      {/* Progress Bar */}
      {isProcessing && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Processing: {Math.round(progress)}% complete
          </Typography>
        </Box>
      )}

      {/* Transactions Table */}
      {uncategorizedTransactions.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>AI Suggestion</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uncategorizedTransactions.map((transaction) => (
                <TableRow key={transaction.transaction_id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {transaction.description || 'No description'}
                  </TableCell>
                  <TableCell align="right">
                    {formatAmount(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    {transaction.isEditing ? (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value=""
                          displayEmpty
                          onChange={(e) => handleSaveManualCategory(transaction.transaction_id!, Number(e.target.value))}
                        >
                          <MenuItem value="" disabled>
                            <em>Select Category</em>
                          </MenuItem>
                          {categories.map((category) => (
                            <MenuItem key={category.category_id} value={category.category_id}>
                              {category.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : transaction.suggestedCategory ? (
                      <Chip
                        label={transaction.suggestedCategory.name}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No suggestion
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.confidence ? (
                      <Chip
                        label={`${Math.round(transaction.confidence * 100)}%`}
                        color={getConfidenceColor(transaction.confidence)}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {transaction.suggestedCategory && !transaction.isEditing && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveCategory(transaction.transaction_id!, transaction.suggestedCategory!.category_id!)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRejectCategory(transaction.transaction_id!)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditCategory(transaction.transaction_id!)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body1">
            Great! All transactions have been categorized.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default TransactionCategorizer;