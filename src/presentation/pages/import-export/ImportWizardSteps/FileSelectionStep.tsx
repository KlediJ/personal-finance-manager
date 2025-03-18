import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TableChartIcon from '@mui/icons-material/TableChart';
// Browser-compatible path basename function
function getBasename(filepath: string): string {
  return filepath.split(/[\\/]/).pop() || 'file';
}

interface FileSelectionStepProps {
  onFileSelected: (
    type: 'csv' | 'excel',
    filePath: string,
    fileName: string,
    data: any[],
    headers: string[],
    sheets?: { name: string, headers: string[], data: any[] }[]
  ) => void;
}

const FileSelectionStep: React.FC<FileSelectionStepProps> = ({ onFileSelected }) => {
  const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  // Handle file type selection
  const handleFileTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileType(event.target.value as 'csv' | 'excel');
  };

  // Handle file selection
  const handleSelectFile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Open file dialog
      const result = await window.api.import.showFileDialog({
        filters: fileType === 'csv' ? [{ name: 'CSV Files', extensions: ['csv'] }] :
                                      [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
      });
      
      if (result.canceled || !result.filePath) {
        setLoading(false);
        return;
      }
      
      // Store file info
      setFilePath(result.filePath);
      setFileName(getBasename(result.filePath));
      
      // Parse file based on type
      if (fileType === 'csv') {
        await handleCsvFile(result.filePath);
      } else {
        await handleExcelFile(result.filePath);
      }
    } catch (err: any) {
      console.error('Error selecting file:', err);
      setError(`Failed to select file: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file parsing
  const handleCsvFile = async (filePath: string) => {
    try {
      const result = await window.api.import.parseCSV(filePath);
      
      if (!result.success) {
        throw new Error(result.errors && result.errors.length > 0 ? 
          `Failed to parse CSV file: ${result.errors[0].message}` : 
          'Failed to parse CSV file');
      }
      
      onFileSelected(
        'csv',
        filePath,
        getBasename(filePath),
        result.data,
        result.meta.fields || []
      );
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      setError(`Failed to parse CSV file: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Excel file parsing
  const handleExcelFile = async (filePath: string) => {
    try {
      const result = await window.api.import.parseExcel(filePath);
      
      if (!result.success) {
        throw new Error('Failed to parse Excel file');
      }
      
      if (result.sheets.length === 0) {
        throw new Error('No sheets found in Excel file');
      }
      
      onFileSelected(
        'excel',
        filePath,
        getBasename(filePath),
        result.sheets[0].data,
        result.sheets[0].headers,
        result.sheets
      );
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      setError(`Failed to parse Excel file: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select a file to import
      </Typography>
      
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">File Type</FormLabel>
        <RadioGroup
          row
          name="file-type"
          value={fileType}
          onChange={handleFileTypeChange}
        >
          <FormControlLabel 
            value="csv" 
            control={<Radio />} 
            label="CSV File" 
          />
          <FormControlLabel 
            value="excel" 
            control={<Radio />} 
            label="Excel File" 
          />
        </RadioGroup>
      </FormControl>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper
        elevation={3}
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '2px dashed #aaa',
          borderRadius: 2,
          backgroundColor: '#f8f8f8'
        }}
      >
        {loading ? (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">
              {fileType === 'csv' ? 'Reading CSV file...' : 'Reading Excel file...'}
            </Typography>
          </Box>
        ) : (
          <>
            {fileName ? (
              <Box sx={{ textAlign: 'center' }}>
                {fileType === 'csv' ? <InsertDriveFileIcon fontSize="large" color="primary" sx={{ mb: 2 }} /> :
                                     <TableChartIcon fontSize="large" color="primary" sx={{ mb: 2 }} />}
                <Typography variant="body1" gutterBottom>
                  {fileName}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectFile}
                  sx={{ mt: 1 }}
                >
                  Choose a different file
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <UploadFileIcon fontSize="large" color="action" sx={{ mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Click the button below to select a {fileType === 'csv' ? 'CSV' : 'Excel'} file
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSelectFile}
                  startIcon={<UploadFileIcon />}
                  sx={{ mt: 1 }}
                >
                  Select File
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> The file should contain transaction data with columns for date, amount,
          description, and other transaction details. The next step will allow you to map these columns
          to the correct fields in the database.
        </Typography>
      </Box>
    </Box>
  );
};

export default FileSelectionStep;
