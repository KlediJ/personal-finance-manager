import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Transaction } from '../../data-storage/models/Transaction';
import { Payee } from '../../data-storage/models/Payee';

interface AIPayeeExtractorProps {
  transaction: Transaction;
  onPayeeSelected: (payee: Payee) => void;
  onCategorySelected: (categoryId: number) => void;
  disabled?: boolean;
}

interface ExtractionResult {
  payee?: Payee;
  confidence?: number;
  categoryPredictions?: Array<{ category: any; confidence: number }>;
  extractedInfo?: any;
}

const AIPayeeExtractor: React.FC<AIPayeeExtractorProps> = ({
  transaction,
  onPayeeSelected,
  onCategorySelected,
  disabled = false
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtractPayee = async () => {
    if (!transaction.description || disabled) return;

    setIsExtracting(true);
    setError(null);

    try {
      if (window.api && window.api.ai && window.api.ai.createPayeeFromTransaction) {
        const result = await window.api.ai.createPayeeFromTransaction(transaction);
        
        if (result.success) {
          setExtractionResult({
            payee: result.payee,
            confidence: result.confidence,
            categoryPredictions: result.categoryPredictions,
            extractedInfo: result.extractedInfo
          });
          setShowConfirmDialog(true);
        } else {
          setError(result.message || result.error || 'Failed to extract payee');
        }
      } else {
        // Mock extraction for development
        const mockPayee: Payee = {
          name: transaction.description?.split(' ')[0] || 'Unknown Merchant',
          default_category_id: null
        };
        
        setExtractionResult({
          payee: mockPayee,
          confidence: 0.85,
          categoryPredictions: [
            { category: { category_id: 1, name: 'Food & Dining' }, confidence: 0.85 }
          ]
        });
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error('Error extracting payee:', error);
      setError('Failed to extract payee information');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmPayee = () => {
    if (extractionResult?.payee) {
      onPayeeSelected(extractionResult.payee);
      
      // Also suggest category if available
      if (extractionResult.categoryPredictions && extractionResult.categoryPredictions.length > 0) {
        const bestCategory = extractionResult.categoryPredictions[0];
        if (bestCategory.category.category_id) {
          onCategorySelected(bestCategory.category.category_id);
        }
      }
    }
    setShowConfirmDialog(false);
    setExtractionResult(null);
  };

  const handleCancelExtraction = () => {
    setShowConfirmDialog(false);
    setExtractionResult(null);
  };

  // Auto-extract when transaction description changes
  useEffect(() => {
    if (transaction.description && transaction.description.length > 5) {
      // Auto-extract for new transactions
      const timeoutId = setTimeout(() => {
        if (!extractionResult && !isExtracting) {
          handleExtractPayee();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [transaction.description]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={isExtracting ? <CircularProgress size={16} /> : <SmartToyIcon />}
          onClick={handleExtractPayee}
          disabled={disabled || isExtracting || !transaction.description}
        >
          {isExtracting ? 'Extracting...' : 'AI Extract Payee'}
        </Button>
        
        {extractionResult && (
          <Chip
            label={`${extractionResult.payee?.name} (${Math.round((extractionResult.confidence || 0) * 100)}%)`}
            color="success"
            size="small"
            icon={<PersonAddIcon />}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelExtraction}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          AI Payee Extraction
        </DialogTitle>
        <DialogContent>
          {extractionResult && (
            <Box>
              <Typography variant="body1" gutterBottom>
                AI has extracted the following payee information:
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {extractionResult.payee?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {Math.round((extractionResult.confidence || 0) * 100)}%
                  </Typography>
                </CardContent>
              </Card>

              {extractionResult.categoryPredictions && extractionResult.categoryPredictions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Suggested Categories:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {extractionResult.categoryPredictions.map((prediction, index) => (
                      <Chip
                        key={index}
                        label={`${prediction.category.name} (${Math.round(prediction.confidence * 100)}%)`}
                        color={index === 0 ? 'primary' : 'default'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {extractionResult.extractedInfo && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Additional Information:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {extractionResult.extractedInfo.location && (
                      <Chip label={`Location: ${extractionResult.extractedInfo.location}`} size="small" />
                    )}
                    {extractionResult.extractedInfo.paymentMethod && (
                      <Chip label={`Payment: ${extractionResult.extractedInfo.paymentMethod}`} size="small" />
                    )}
                    {extractionResult.extractedInfo.transactionType && (
                      <Chip label={`Type: ${extractionResult.extractedInfo.transactionType}`} size="small" />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelExtraction}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmPayee}
            variant="contained"
            startIcon={<PersonAddIcon />}
          >
            Create Payee
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIPayeeExtractor;