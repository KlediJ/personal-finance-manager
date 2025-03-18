import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  FormHelperText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
import { TransactionType } from '../../../../data-storage/models/Transaction';

interface ColumnMappingStepProps {
  headers: string[];
  mappings: Record<string, string>;
  onMappingChanged: (field: string, value: string) => void;
  fileType: 'csv' | 'excel' | null;
  sheets?: { name: string, headers: string[], data: any[] }[];
  selectedSheet: string | null;
  onSheetSelected: (sheetName: string) => void;
}

interface FieldMapping {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

const fieldMappings: FieldMapping[] = [
  {
    key: 'date',
    label: 'Date',
    required: true,
    description: 'Transaction date (required)'
  },
  {
    key: 'amount',
    label: 'Amount',
    required: true,
    description: 'Transaction amount (required)'
  },
  {
    key: 'description',
    label: 'Description',
    required: false,
    description: 'Transaction description or memo'
  },
  {
    key: 'account_id',
    label: 'Account',
    required: true,
    description: 'Account ID or name (if not mapped, will use default account)'
  },
  {
    key: 'transaction_type',
    label: 'Type',
    required: false,
    description: 'Transaction type (income, expense, transfer)'
  },
  {
    key: 'category_id',
    label: 'Category',
    required: false,
    description: 'Transaction category'
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    description: 'Transaction status (pending, cleared, reconciled)'
  }
];

const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  headers,
  mappings,
  onMappingChanged,
  fileType,
  sheets,
  selectedSheet,
  onSheetSelected
}) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Load accounts for dropdown
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountData = await window.api.accounts.getAll();
        setAccounts(accountData);
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    };
    
    loadAccounts();
  }, []);

  // Prepare preview data - show first 5 rows
  useEffect(() => {
    if (sheets && selectedSheet) {
      const sheet = sheets.find(s => s.name === selectedSheet);
      if (sheet && sheet.data.length > 0) {
        setPreviewData(sheet.data.slice(0, 5));
      }
    }
  }, [sheets, selectedSheet]);

  // Handle mapping change
  const handleMappingChange = (event: SelectChangeEvent) => {
    const field = event.target.name;
    const value = event.target.value;
    
    if (field) {
      onMappingChanged(field, value);
    }
  };

  // Handle sheet tab change
  const handleSheetChange = (event: React.SyntheticEvent, newValue: string) => {
    onSheetSelected(newValue);
  };

  // Fixed account mapping
  const handleAccountChange = (event: SelectChangeEvent) => {
    onMappingChanged('account_id', event.target.value);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map Columns
      </Typography>
      
      {fileType === 'excel' && sheets && sheets.length > 1 && (
        <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedSheet} 
            onChange={handleSheetChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            {sheets.map((sheet) => (
              <Tab 
                key={sheet.name} 
                label={sheet.name} 
                value={sheet.name}
              />
            ))}
          </Tabs>
        </Box>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {fieldMappings.map((field) => (
          <Grid item xs={12} md={6} key={field.key}>
            <FormControl 
              fullWidth 
              required={field.required}
              error={field.required && !mappings[field.key]}
            >
              <InputLabel>{field.label}</InputLabel>
              {field.key === 'account_id' ? (
                // Special case for account - select actual account rather than mapping
                <Select
                  name="account_id"
                  value={mappings['account_id'] || ''}
                  onChange={handleAccountChange}
                  label={field.label}
                >
                  <MenuItem value="">
                    <em>Not mapped</em>
                  </MenuItem>
                  {accounts.map((account) => (
                    <MenuItem key={account.account_id} value={account.account_id.toString()}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                // Standard column mapping
                <Select
                  name={field.key}
                  value={mappings[field.key] || ''}
                  onChange={handleMappingChange}
                  label={field.label}
                >
                  <MenuItem value="">
                    <em>Not mapped</em>
                  </MenuItem>
                  {headers.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              )}
              <FormHelperText>{field.description}</FormHelperText>
            </FormControl>
          </Grid>
        ))}
      </Grid>
      
      <Paper sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>
          Data Preview (First 5 rows)
        </Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell key={header}>
                    <Typography variant="caption" fontWeight="bold">
                      {header}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.length > 0 ? (
                previewData.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={`${index}-${header}`}>
                        {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={headers.length} align="center">
                    No data to preview
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Box>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Map the columns from your file to the appropriate transaction fields.
          At minimum, you need to map Date and Amount fields. If a column is not mapped, that field will not be imported.
        </Typography>
      </Box>
    </Box>
  );
};

export default ColumnMappingStep;
