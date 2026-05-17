import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography
} from '@mui/material';

interface WelcomeDialogProps {
  open: boolean;
  accountCount: number;
  onClose: () => void;
  onGoToAccounts: () => void;
  onGoToLedger: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  open,
  accountCount,
  onClose,
  onGoToAccounts,
  onGoToLedger
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Welcome to Libri</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Libri is a private, local desktop finance tracker. Your data stays on your computer.
        </Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
          <Chip label="Local-first" color="primary" variant="outlined" />
          <Chip label="Private" color="primary" variant="outlined" />
          <Chip label="Manual control + smart assistance" color="primary" variant="outlined" />
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Start here
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            1. Create your accounts. If you track more than one account, name them clearly so transfers are easier to review.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            2. Import transactions from CSV or Excel.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            3. Use Ledger to clean up categories, payees, and transfers.
          </Typography>
          <Typography variant="body2">
            4. Dashboard becomes more useful as your data gets cleaner.
          </Typography>
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Main sections
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Dashboard shows balances, monthly trends, and spending flow once your data is organized.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Accounts is where you create and manage the accounts you track.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Ledger is your working area for reviewing, editing, categorizing, and correcting transactions.
          </Typography>
          <Typography variant="body2">
            Settings is where you manage supporting lists like categories and payees.
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          What&apos;s coming next
        </Typography>
        <Typography variant="body2">
          We&apos;re working on smarter repeated-transaction suggestions, easier bulk cleanup, and richer dashboard insights while keeping you in control.
        </Typography>

        {accountCount === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            You don&apos;t have any accounts yet, so the best next step is to create your first one.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Maybe Later</Button>
        <Button onClick={onGoToLedger} disabled={accountCount === 0}>
          Open Ledger
        </Button>
        <Button variant="contained" onClick={onGoToAccounts}>
          {accountCount === 0 ? 'Create Accounts' : 'Review Accounts'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeDialog;
