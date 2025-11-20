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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio
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
  suggestedPayee?: string;
  suggestedPayeeId?: number | null;
  confidence?: number;
  payeeConfidence?: number;
  isEditing?: boolean;
  extractedInfo?: {
    merchant?: string;
    location?: string;
    paymentMethod?: string;
    transactionType?: string;
    keywords?: string[];
  };
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

  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    transaction: UncategorizedTransaction | null;
    categoryId: number | null;
    payeeId?: number | null;
  }>({ transaction: null, categoryId: null, payeeId: null });
  const [scopeChoice, setScopeChoice] = useState<'INSTANCE' | 'MERCHANT' | 'MERCHANT_AMOUNT'>('INSTANCE');

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
      // Always try regular API first for more reliable data
      const transactions = await window.api.transactions.getAll();
      const uncategorized = transactions.filter((t: Transaction) => !t.category_id);
      
      console.log(`Found ${uncategorized.length} uncategorized transactions out of ${transactions.length} total`);
      setUncategorizedTransactions(uncategorized);
      
      // Optional: Try AI service as well for comparison
      if (window.api && window.api.ai && window.api.ai.getUncategorizedTransactions) {
        try {
          const aiResult = await window.api.ai.getUncategorizedTransactions();
          if (aiResult.success && aiResult.transactions) {
            console.log(`AI service found ${aiResult.transactions.length} uncategorized transactions`);
            // Use AI result if it's more detailed (has additional AI-specific fields)
            if (aiResult.transactions.length === uncategorized.length) {
              setUncategorizedTransactions(aiResult.transactions);
            }
          } else {
            console.log('AI service failed, using regular API result:', aiResult.error);
          }
        } catch (aiError) {
          console.log('AI service error, using regular API result:', aiError);
        }
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
      // Always calculate stats manually from regular API for reliability
      const allTransactions = await window.api.transactions.getAll();
      const categorized = allTransactions.filter((t: Transaction) => t.category_id);
      const uncategorized = allTransactions.filter((t: Transaction) => !t.category_id);
      
      const calculatedStats = {
        total: allTransactions.length,
        categorized: categorized.length,
        uncategorized: uncategorized.length,
        lastRun: null as Date | null
      };
      
      console.log(`Stats: ${calculatedStats.categorized} categorized, ${calculatedStats.uncategorized} uncategorized out of ${calculatedStats.total} total`);
      setStats(calculatedStats);
      
      // Optional: Try AI service as well for comparison
      if (window.api && window.api.ai && window.api.ai.getStatistics) {
        try {
          const aiResult = await window.api.ai.getStatistics();
          if (aiResult.success) {
            console.log(`AI Stats: ${aiResult.stats.categorized} categorized, ${aiResult.stats.uncategorized} uncategorized out of ${aiResult.stats.total} total`);
            // Use AI result if it has additional information (like lastRun)
            setStats({
              ...calculatedStats,
              lastRun: aiResult.stats.lastUpdated ? new Date(aiResult.stats.lastUpdated) : null
            });
          } else {
            console.log('AI statistics failed, using calculated stats:', aiResult.error);
          }
        } catch (aiError) {
          console.log('AI statistics error, using calculated stats:', aiError);
        }
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
      console.log(`Starting AI categorization for ${uncategorizedTransactions.length} transactions`);
      
      // Check if AI API is available
      if (!window.api || !window.api.ai || !window.api.ai.batchCategorizeTransactions) {
        console.log('AI API not available, using mock categorization');
        await runMockCategorization();
        return;
      }
      
      // Use AI service for batch categorization
      const result = await window.api.ai.batchCategorizeTransactions(uncategorizedTransactions);
      
      if (result.success && result.results) {
        console.log(`AI categorization completed successfully with ${Object.keys(result.results).length} results`);
        
        // Update transactions with AI suggestions and auto-create payees
        const updatedTransactions = await Promise.all(
          uncategorizedTransactions.map(async transaction => {
            const aiResult = result.results![transaction.transaction_id!];
            if (aiResult) {
              // Extract category prediction
              const categoryPrediction = aiResult.categoryPredictions?.[0];
              const payeeExtraction = aiResult.payeeExtraction;
              
              console.log(`Transaction ${transaction.transaction_id}: AI Result:`, {
                category: categoryPrediction?.category?.name,
                categoryConfidence: categoryPrediction?.confidence,
                payee: payeeExtraction?.payee?.name,
                payeeConfidence: payeeExtraction?.confidence,
                extractedInfo: aiResult.extractedInfo
              });

              let suggestedPayeeId = null;
              let suggestedPayeeName = payeeExtraction?.payee?.name;

              // Auto-create payee if AI extracted one and confidence is high
              if (payeeExtraction?.extracted && payeeExtraction.confidence > 0.7) {
                try {
                  // Use the new createIfNotExists method to prevent duplicates
                  const payeeResult = await window.api.payees.createIfNotExists({
                    name: payeeExtraction.payee.name,
                    default_category_id: categoryPrediction?.category?.category_id || null
                  });

                  if (payeeResult.success) {
                    suggestedPayeeId = payeeResult.id;
                    if (payeeResult.created) {
                      console.log(`Auto-created new payee: ${payeeExtraction.payee.name} with ID ${payeeResult.id}`);
                    } else {
                      console.log(`Using existing payee: ${payeeExtraction.payee.name} with ID ${payeeResult.id}`);
                    }
                  }
                } catch (error) {
                  console.error('Error auto-creating payee:', error);
                }
              }
              
              return {
                ...transaction,
                suggestedCategory: categoryPrediction?.category,
                confidence: categoryPrediction?.confidence,
                suggestedPayee: suggestedPayeeName,
                suggestedPayeeId: suggestedPayeeId,
                payeeConfidence: payeeExtraction?.confidence,
                extractedInfo: aiResult.extractedInfo
              } as UncategorizedTransaction;
            }
            return transaction;
          })
        );

        setUncategorizedTransactions(updatedTransactions);
      } else {
        console.error('Error in AI categorization:', result.error);
        // Fallback to mock categorization
        console.log('Falling back to mock categorization');
        await runMockCategorization();
      }
    } catch (error) {
      console.error('Error running auto-categorization:', error);
      // Fallback to mock categorization
      console.log('Exception occurred, falling back to mock categorization');
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

  const directApproveCategory = async (transactionId: number, categoryId: number, payeeId?: number) => {
    try {
      const transaction = uncategorizedTransactions.find(t => t.transaction_id === transactionId);
      if (!transaction) return;

      const updateData: any = {
        ...transaction,
        category_id: categoryId
      };

      // Include payee if provided
      if (payeeId) {
        updateData.payee_id = payeeId;
      }

      await window.api.transactions.update(transactionId, updateData);

      // Send feedback to AI service for future learning (no-op in Phase 1)
      try {
        if (window.api && window.api.ai && window.api.ai.learnFromFeedback) {
          const correctCategory = categories.find(c => c.category_id === categoryId);
          const correctPayee = payeeId
            ? { payee_id: payeeId, name: transaction.suggestedPayee || '' }
            : undefined;

          await window.api.ai.learnFromFeedback({
            transaction,
            correctCategory,
            correctPayee
          });
        }
      } catch (feedbackError) {
        console.error('Error sending feedback to AI service:', feedbackError);
      }

      // Remove from uncategorized list
      setUncategorizedTransactions(prev => 
        prev.filter(t => t.transaction_id !== transactionId)
      );
      
      loadStats();
    } catch (error) {
      console.error('Error approving category:', error);
    }
  };

  const openScopeDialogForApproval = (transaction: UncategorizedTransaction, categoryId: number, payeeId?: number | null) => {
    setPendingApproval({
      transaction,
      categoryId,
      payeeId: payeeId ?? null
    });
    setScopeChoice('INSTANCE');
    setScopeDialogOpen(true);
  };

  const handleConfirmScope = async () => {
    if (!pendingApproval.transaction || !pendingApproval.categoryId) {
      setScopeDialogOpen(false);
      return;
    }

    const tx = pendingApproval.transaction;
    const categoryId = pendingApproval.categoryId;
    const payeeId = pendingApproval.payeeId ?? undefined;

    try {
      if (scopeChoice === 'INSTANCE') {
        await directApproveCategory(tx.transaction_id!, categoryId, payeeId);
      } else {
        // Create a rule based on the transaction description (and amount for MERCHANT_AMOUNT)
        if (window.api && window.api.ai && window.api.ai.addCategorizationRule) {
          try {
            await window.api.ai.addCategorizationRule({
              transaction: tx,
              categoryId,
              scope: scopeChoice
            });
          } catch (ruleError) {
            console.error('Error creating categorization rule:', ruleError);
          }
        }

        await directApproveCategory(tx.transaction_id!, categoryId, payeeId);
      }
    } finally {
      setScopeDialogOpen(false);
      setPendingApproval({ transaction: null, categoryId: null, payeeId: null });
    }
  };

  const handleCreateAndApprovePayee = async (transactionId: number, payeeName: string, categoryId?: number) => {
    try {
      const transaction = uncategorizedTransactions.find(t => t.transaction_id === transactionId);
      if (!transaction) return;

      // Use createIfNotExists to prevent duplicates
      const payeeResult = await window.api.payees.createIfNotExists({
        name: payeeName,
        default_category_id: categoryId || null
      });

      if (payeeResult.success) {
        // Update transaction with payee and category
        const updateData: any = {
          ...transaction,
          payee_id: payeeResult.id
        };

        if (categoryId) {
          updateData.category_id = categoryId;
        }

        await window.api.transactions.update(transactionId, updateData);

        // Send feedback to AI service for future learning (no-op in Phase 1)
        try {
          if (window.api && window.api.ai && window.api.ai.learnFromFeedback) {
            const correctCategory = categoryId
              ? categories.find(c => c.category_id === categoryId)
              : undefined;

            await window.api.ai.learnFromFeedback({
              transaction,
              correctCategory,
              correctPayee: {
                payee_id: payeeResult.id,
                name: payeeName
              }
            });
          }
        } catch (feedbackError) {
          console.error('Error sending feedback to AI service:', feedbackError);
        }

        // Remove from uncategorized list
        setUncategorizedTransactions(prev => 
          prev.filter(t => t.transaction_id !== transactionId)
        );
        
        loadStats();
      }
    } catch (error) {
      console.error('Error creating payee:', error);
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
    const transaction = uncategorizedTransactions.find(t => t.transaction_id === transactionId);
    if (!transaction) return;
    openScopeDialogForApproval(transaction, categoryId);
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
          {isProcessing ? 'Applying rules...' : 'Run Smart Categorization'}
        </Button>
        
        <Typography variant="body2" color="text.secondary">
          {uncategorizedTransactions.length} transactions need categorization using current rules and patterns
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
                <TableCell>AI Category</TableCell>
                <TableCell>AI Payee</TableCell>
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
                    {transaction.suggestedPayee ? (
                      <Chip
                        label={transaction.suggestedPayee}
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No payee
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {transaction.confidence ? (
                        <Chip
                          label={`Cat: ${Math.round(transaction.confidence * 100)}%`}
                          color={getConfidenceColor(transaction.confidence)}
                          variant="outlined"
                          size="small"
                        />
                      ) : null}
                      {transaction.payeeConfidence ? (
                        <Chip
                          label={`Payee: ${Math.round(transaction.payeeConfidence * 100)}%`}
                          color={getConfidenceColor(transaction.payeeConfidence)}
                          variant="outlined"
                          size="small"
                        />
                      ) : null}
                      {!transaction.confidence && !transaction.payeeConfidence ? '-' : null}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {transaction.suggestedCategory && !transaction.isEditing && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openScopeDialogForApproval(transaction, transaction.suggestedCategory!.category_id!)}
                            title="Approve Category Only"
                          >
                            <CheckIcon />
                          </IconButton>
                          {transaction.suggestedPayee && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => {
                              if (transaction.suggestedPayeeId) {
                                   // Payee already exists, just approve both
                                   openScopeDialogForApproval(
                                     transaction,
                                     transaction.suggestedCategory!.category_id!,
                                     transaction.suggestedPayeeId
                                   );
                                } else {
                                  // Create new payee and approve both
                                  handleCreateAndApprovePayee(
                                    transaction.transaction_id!, 
                                    transaction.suggestedPayee!, 
                                    transaction.suggestedCategory?.category_id
                                  );
                                }
                              }}
                              sx={{ minWidth: 'auto', fontSize: '0.75rem', px: 1 }}
                              title={transaction.suggestedPayeeId ? "Approve Category & Existing Payee" : "Create Payee & Approve Both"}
                            >
                              ✓ Both
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRejectCategory(transaction.transaction_id!)}
                            title="Reject Suggestions"
                          >
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditCategory(transaction.transaction_id!)}
                        title="Manual Edit"
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

      {/* Scope Selection Dialog */}
      <Dialog
        open={scopeDialogOpen}
        onClose={() => setScopeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Apply Categorization</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            How should this category change be applied?
          </Typography>
          <RadioGroup
            value={scopeChoice}
            onChange={(_, value) => {
              if (value === 'INSTANCE' || value === 'MERCHANT' || value === 'MERCHANT_AMOUNT') {
                setScopeChoice(value);
              }
            }}
          >
            <FormControlLabel
              value="INSTANCE"
              control={<Radio />}
              label="This transaction only"
            />
            <FormControlLabel
              value="MERCHANT"
              control={<Radio />}
              label="All transactions with similar description (merchant rule)"
            />
            <FormControlLabel
              value="MERCHANT_AMOUNT"
              control={<Radio />}
              label="Transactions with this description and amount (merchant + amount rule)"
            />
          </RadioGroup>
          <Typography variant="caption" color="text.secondary">
            Rules are applied before AI suggestions and only affect matching transactions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScopeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmScope}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionCategorizer;
