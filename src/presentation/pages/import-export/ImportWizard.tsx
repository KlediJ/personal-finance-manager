import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import FileSelectionStep from './ImportWizardSteps/FileSelectionStep';
import ColumnMappingStep from './ImportWizardSteps/ColumnMappingStep';
import DataPreviewStep from './ImportWizardSteps/DataPreviewStep';
import ConfirmationStep from './ImportWizardSteps/ConfirmationStep';
import type { Category } from '../../../data-storage/models/Category';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  'Select File',
  'Map Columns',
  'Preview Data',
  'Import'
];

const ImportWizard: React.FC<ImportWizardProps> = ({ open, onClose }) => {
  // State for the wizard
  const [activeStep, setActiveStep] = useState(0);
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ name: string, headers: string[], data: any[] }[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [importStats, setImportStats] = useState<{ total: number, valid: number, invalid: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean, count: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorizing, setCategorizing] = useState(false);

  // Reset wizard state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setActiveStep(0);
        setFileType(null);
        setFilePath(null);
        setFileName(null);
        setImportData([]);
        setHeaders([]);
        setSheets([]);
        setSelectedSheet(null);
        setMappings({});
        setValidatedData([]);
        setValidationErrors([]);
        setImportStats(null);
        setError(null);
        setImportResult(null);
        setCategories([]);
        setCategorizing(false);
      }, 300);
    }
  }, [open]);

  // Handle file selection
  const handleFileSelected = async (
    type: 'csv' | 'excel', 
    path: string, 
    name: string, 
    data: any[], 
    fileHeaders: string[],
    fileSheets?: { name: string, headers: string[], data: any[] }[]
  ) => {
    setFileType(type);
    setFilePath(path);
    setFileName(name);

    if (type === 'csv') {
      setImportData(data);
      setHeaders(fileHeaders);
    } else if (type === 'excel' && fileSheets) {
      setSheets(fileSheets);
      if (fileSheets.length > 0) {
        setSelectedSheet(fileSheets[0].name);
        setImportData(fileSheets[0].data);
        setHeaders(fileSheets[0].headers);
      }
    }

    // Create default mappings
    const defaultMappings: Record<string, string> = {};
    
    // Try to intelligently map common column names
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // Map date column
      if (lowerHeader.includes('date')) {
        defaultMappings['date'] = header;
      }
      
      // Map amount column
      if (lowerHeader.includes('amount') || lowerHeader.includes('sum') || 
          lowerHeader.includes('value') || lowerHeader.includes('price')) {
        defaultMappings['amount'] = header;
      }
      
      // Map description column
      if (lowerHeader.includes('desc') || lowerHeader.includes('memo') || 
          lowerHeader.includes('note') || lowerHeader.includes('details')) {
        defaultMappings['description'] = header;
      }
      
      // Map category column
      if (lowerHeader.includes('cat')) {
        defaultMappings['category_id'] = header;
      }
      
      // Map type column
      if (lowerHeader.includes('type')) {
        defaultMappings['transaction_type'] = header;
      }
    });
    
    setMappings(defaultMappings);
  };

  // Handle sheet selection for Excel files
  const handleSheetSelected = (sheetName: string) => {
    const sheet = sheets.find(s => s.name === sheetName);
    if (sheet) {
      setSelectedSheet(sheetName);
      setImportData(sheet.data);
      setHeaders(sheet.headers);
    }
  };

  // Handle column mapping
  const handleMappingChanged = (field: string, value: string) => {
    setMappings({
      ...mappings,
      [field]: value
    });
  };

  // Validate data before import
  const validateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get accounts for validation in the next step
      const accounts = await window.api.accounts.getAll();
      
      // If account_id is not mapped, use the first account
      if (!mappings['account_id'] && accounts.length > 0) {
        setMappings({
          ...mappings,
          account_id: accounts[0].account_id.toString()
        });
      }
      
      // Call the validation IPC handler
      const result = await window.api.import.validateTransactions(importData, mappings);
      
      if (result.success) {
        setValidatedData(result.validTransactions);
        setValidationErrors(result.errors || []);
        setImportStats(result.stats);
        await fetchCategorySuggestions(result.validTransactions);
      } else {
        // Use custom error message or default if no errors array is present
        setError(result.errors && result.errors.length > 0 ? 'Validation errors found' : 'Validation failed');
      }
    } catch (err) {
      console.error('Error validating data:', err);
      setError('Failed to validate import data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorySuggestions = async (transactions: any[]) => {
    setCategorizing(true);
    try {
      const descriptions = transactions.map(t => t.description || '');
      const res = await window.api.transactions.categorize(descriptions);
      if (res.success && res.categories) {
        const allCats = await window.api.categories.getAll();
        setCategories(allCats);
        const map = new Map(allCats.map(c => [c.name.toLowerCase(), c.category_id]));
        const updated = transactions.map((t, idx) => {
          const name = res.categories![idx];
          const id = map.get(name.toLowerCase()) || null;
          return { ...t, category_id: id, suggested_category: name };
        });
        setValidatedData(updated);
      }
    } catch (err) {
      console.error('Error fetching category suggestions:', err);
    } finally {
      setCategorizing(false);
    }
  };

  // Import validated data
  const importTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the import IPC handler
      const result = await window.api.import.saveTransactions(validatedData);
      
      if (result.success) {
        setImportResult({
          success: true,
          count: result.count || 0
        });
      } else {
        setError(result.error || 'Import failed');
        setImportResult({
          success: false,
          count: 0
        });
      }
    } catch (err) {
      console.error('Error importing data:', err);
      setError('Failed to import transactions');
      setImportResult({
        success: false,
        count: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index: number, categoryId: number | null) => {
    setValidatedData(prev => prev.map((t, i) => i === index ? { ...t, category_id: categoryId } : t));
  };

  // Handle next button
  const handleNext = async () => {
    if (loading || categorizing) return;
    if (activeStep === 1) {
      // Validate data before moving to preview step
      await validateData();
    } else if (activeStep === 2) {
      // Import data
      await importTransactions();
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Handle back button
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Close wizard
  const handleClose = () => {
    onClose();
  };

  // Determine if next button should be disabled
  const isNextDisabled = () => {
    if (activeStep === 0) {
      return !filePath || loading || categorizing;
    }
    if (activeStep === 1) {
      return loading || categorizing || !mappings['date'] || !mappings['amount'];
    }
    if (activeStep === 2) {
      return loading || categorizing || validatedData.length === 0;
    }
    return loading || categorizing;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Transactions</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading || categorizing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">
              {categorizing ? 'Generating category suggestions...' : activeStep === 1 ? 'Validating data...' : 'Importing transactions...'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ minHeight: '300px' }}>
            {activeStep === 0 && (
              <FileSelectionStep 
                onFileSelected={handleFileSelected}
              />
            )}
            
            {activeStep === 1 && (
              <ColumnMappingStep
                headers={headers}
                mappings={mappings}
                onMappingChanged={handleMappingChanged}
                fileType={fileType}
                sheets={sheets}
                selectedSheet={selectedSheet}
                onSheetSelected={handleSheetSelected}
              />
            )}
            
            {activeStep === 2 && (
              <DataPreviewStep
                validatedData={validatedData}
                validationErrors={validationErrors}
                stats={importStats}
                categories={categories}
                onCategoryChange={handleCategoryChange}
              />
            )}
            
            {activeStep === 3 && (
              <ConfirmationStep
                result={importResult}
                fileName={fileName}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {activeStep === 3 ? (
          <Button onClick={handleClose}>Close</Button>
        ) : (
          <>
            <Button 
              onClick={handleBack} 
              disabled={activeStep === 0 || loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isNextDisabled() || loading}
            >
              {activeStep === steps.length - 2 ? 'Import' : 'Next'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportWizard;
