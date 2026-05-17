import React from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Account } from '../../../../data-storage/models/Account';
import { Transaction } from '../../../../data-storage/models/Transaction';

type TransferResolution = 'transfer' | 'regular' | 'skip';

interface TransferCandidate {
  id: string;
  transactionIndex: number;
  transaction: Transaction;
  detectedBy: string[];
  resolution: TransferResolution;
  fromAccountId: number | '';
  toAccountId: number | '';
}

interface TransferReviewStepProps {
  candidates: TransferCandidate[];
  accounts: Account[];
  onCandidateChange: (candidateId: string, updates: Partial<TransferCandidate>) => void;
}

const TransferReviewStep: React.FC<TransferReviewStepProps> = ({
  candidates,
  accounts,
  onCandidateChange
}) => {
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const findAccountName = (accountId: number | '') =>
    accounts.find((account) => account.account_id === accountId)?.name || 'Not selected';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Transfer Candidates
      </Typography>

      {candidates.length === 0 ? (
        <Alert severity="success">
          No transfer candidates were detected. The import will proceed with regular transactions only.
        </Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            Review transactions that look like transfers. Confirm the source and destination accounts,
            keep the row as a normal transaction, or skip it for now.
          </Alert>

          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Detected By</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>From Account</TableCell>
                  <TableCell>To Account</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>{formatDate(candidate.transaction.date)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {candidate.transaction.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Imported account: {findAccountName(candidate.transaction.account_id)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatAmount(candidate.transaction.amount)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {candidate.detectedBy.map((reason) => (
                          <Chip key={reason} label={reason} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Action</InputLabel>
                        <Select
                          label="Action"
                          value={candidate.resolution}
                          onChange={(event) =>
                            onCandidateChange(candidate.id, {
                              resolution: event.target.value as TransferResolution
                            })
                          }
                        >
                          <MenuItem value="transfer">Create transfer</MenuItem>
                          <MenuItem value="regular">Keep as regular transaction</MenuItem>
                          <MenuItem value="skip">Skip for now</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl
                        size="small"
                        fullWidth
                        disabled={candidate.resolution !== 'transfer'}
                        error={
                          candidate.resolution === 'transfer' &&
                          (!candidate.fromAccountId ||
                            candidate.fromAccountId === candidate.toAccountId)
                        }
                      >
                        <InputLabel>From</InputLabel>
                        <Select
                          label="From"
                          value={candidate.fromAccountId}
                          onChange={(event) =>
                            onCandidateChange(candidate.id, {
                              fromAccountId: event.target.value as number | ''
                            })
                          }
                        >
                          <MenuItem value="">
                            <em>Select account</em>
                          </MenuItem>
                          {accounts.map((account) => (
                            <MenuItem key={account.account_id} value={account.account_id}>
                              {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl
                        size="small"
                        fullWidth
                        disabled={candidate.resolution !== 'transfer'}
                        error={
                          candidate.resolution === 'transfer' &&
                          (!candidate.toAccountId ||
                            candidate.fromAccountId === candidate.toAccountId)
                        }
                      >
                        <InputLabel>To</InputLabel>
                        <Select
                          label="To"
                          value={candidate.toAccountId}
                          onChange={(event) =>
                            onCandidateChange(candidate.id, {
                              toAccountId: event.target.value as number | ''
                            })
                          }
                        >
                          <MenuItem value="">
                            <em>Select account</em>
                          </MenuItem>
                          {accounts.map((account) => (
                            <MenuItem key={account.account_id} value={account.account_id}>
                              {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Confirmed transfers will use Libri&apos;s linked transfer workflow. Items kept as regular
              transactions will import as income or expense based on the sign of the amount.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default TransferReviewStep;
