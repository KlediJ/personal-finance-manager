import React from 'react';
import { Box, Typography, Paper, Alert, AlertTitle } from '@mui/material';
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';

interface ConfirmationStepProps {
  result: {
    success: boolean;
    count: number;
    importedTransactions: number;
    importedTransfers: number;
    skippedCount: number;
    failedCount: number;
  } | null;
  fileName: string | null;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  result,
  fileName
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Results
      </Typography>
      
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          mb: 3
        }}
      >
        {result && result.success ? (
          <>
            <CheckCircleOutline color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Import Successful
            </Typography>
            <Typography variant="body1" textAlign="center">
              Successfully imported {result.count} items from {fileName}
            </Typography>
          </>
        ) : (
          <>
            <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Import Failed
            </Typography>
            <Typography variant="body1" textAlign="center">
              Failed to import transactions from {fileName}
            </Typography>
          </>
        )}
      </Paper>
      
      <Alert severity={result?.success ? 'success' : 'error'}>
        <AlertTitle>{result?.success ? 'Success' : 'Error'}</AlertTitle>
        {result?.success ? (
          <Typography variant="body2">
            Imported {result.importedTransactions} regular transactions and {result.importedTransfers} transfers.
            {result.skippedCount > 0
              ? ` Deferred ${result.skippedCount} transfer candidate(s) for later review in Ledger.`
              : ''}
            You can now view and manage them in the Transactions page.
          </Typography>
        ) : (
          <Typography variant="body2">
            Imported {result?.importedTransactions || 0} regular transactions and {result?.importedTransfers || 0} transfers.
            {result && result.skippedCount > 0
              ? ` Deferred ${result.skippedCount} transfer candidate(s) for later review.`
              : ''}
            {result && result.failedCount > 0 ? ` ${result.failedCount} item(s) failed.` : ''}
          </Typography>
        )}
      </Alert>
    </Box>
  );
};

export default ConfirmationStep;
