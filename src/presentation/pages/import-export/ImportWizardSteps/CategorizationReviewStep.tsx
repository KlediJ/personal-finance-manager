import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Category } from '../../../../data-storage/models/Category';
import { Payee } from '../../../../data-storage/models/Payee';
import { Transaction, TransactionType } from '../../../../data-storage/models/Transaction';

export interface CategorizationGroup {
  id: string;
  sampleDescription: string;
  count: number;
  totalAmount: number;
  sampleAmount: number;
  transactionType: TransactionType;
  transactionIndexes: number[];
  representativeTransaction: Transaction;
  currentCategoryId: number | '';
  currentCategoryName: string;
  currentPayeeName: string;
  suggestedCategoryId: number | '';
  suggestedCategoryName?: string;
  suggestedPayeeName?: string;
  confidence?: number | null;
  rationale?: string | null;
  status: 'pending' | 'applied';
  saveRule: boolean;
}

interface CategorizationReviewStepProps {
  categories: Category[];
  payees: Payee[];
  groups: CategorizationGroup[];
  stats?: {
    eligibleCount: number;
    groupedCount: number;
    singletonCount: number;
  };
  loading: boolean;
  onGroupChange: (groupId: string, updates: Partial<CategorizationGroup>) => void;
  onApplyGroup: (groupId: string) => Promise<void> | void;
  onApplyAllSuggested: () => Promise<void> | void;
}

const CategorizationReviewStep: React.FC<CategorizationReviewStepProps> = ({
  categories,
  payees,
  groups,
  stats,
  loading,
  onGroupChange,
  onApplyGroup,
  onApplyAllSuggested
}) => {
  const pendingGroups = groups.filter((group) => group.status === 'pending');
  const appliedGroups = groups.filter((group) => group.status === 'applied');

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

  const getConfidenceColor = (confidence?: number | null) => {
    if (confidence === undefined || confidence === null) {
      return 'default';
    }

    if (confidence >= 0.9) {
      return 'success';
    }

    if (confidence >= 0.7) {
      return 'warning';
    }

    return 'default';
  };

  const getSelectedCategory = (group: CategorizationGroup) =>
    categories.find((category) => category.category_id === group.currentCategoryId) || null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Similar Transactions
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Group similar uncategorized transactions once instead of fixing each row by hand. Any category or payee you apply here will be copied onto every matching imported row before save.
      </Alert>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 3
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`${groups.length} groups`} color="primary" variant="outlined" />
          <Chip label={`${pendingGroups.length} pending`} color="warning" variant="outlined" />
          <Chip label={`${appliedGroups.length} applied`} color="success" variant="outlined" />
        </Stack>

        <Button
          variant="contained"
          onClick={onApplyAllSuggested}
          disabled={loading || groups.length === 0}
        >
          Apply All Current Suggestions
        </Button>
      </Box>

      {groups.length === 0 ? (
        <Alert severity="info">
          {stats && stats.eligibleCount > 0
            ? `Found ${stats.eligibleCount} uncategorized transaction${stats.eligibleCount === 1 ? '' : 's'}, but none share a repeated description pattern yet. There is nothing to bulk-apply here, so you can continue to transfer review and import.`
            : 'No uncategorized transactions need grouped review. You can continue to transfer review and import.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {groups.map((group) => (
            <Grid item xs={12} key={group.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', md: 'center' },
                      flexDirection: { xs: 'column', md: 'row' },
                      gap: 2,
                      mb: 2
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {group.sampleDescription || 'No description'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                        <Chip label={`${group.count} transactions`} size="small" />
                        <Chip label={`Sample ${formatAmount(group.sampleAmount)}`} size="small" variant="outlined" />
                        <Chip label={`Group total ${formatAmount(group.totalAmount)}`} size="small" variant="outlined" />
                        {group.confidence !== undefined && group.confidence !== null && (
                          <Chip
                            label={`${Math.round(group.confidence * 100)}% confidence`}
                            size="small"
                            color={getConfidenceColor(group.confidence)}
                          />
                        )}
                        <Chip
                          label={group.status === 'applied' ? 'Applied' : 'Pending'}
                          size="small"
                          color={group.status === 'applied' ? 'success' : 'warning'}
                        />
                      </Stack>
                    </Box>

                    {group.rationale && (
                      <Typography variant="body2" color="text.secondary">
                        {group.rationale}
                      </Typography>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <Autocomplete
                        freeSolo
                        options={categories}
                        getOptionLabel={(option) =>
                          typeof option === 'string' ? option : option.name
                        }
                        value={getSelectedCategory(group)}
                        inputValue={group.currentCategoryName}
                        onChange={(_, value) => {
                          if (typeof value === 'string') {
                            onGroupChange(group.id, {
                              currentCategoryId: '',
                              currentCategoryName: value
                            });
                            return;
                          }

                          if (!value) {
                            onGroupChange(group.id, {
                              currentCategoryId: '',
                              currentCategoryName: ''
                            });
                            return;
                          }

                          onGroupChange(group.id, {
                            currentCategoryId: value.category_id ?? '',
                            currentCategoryName: value.name
                          });
                        }}
                        onInputChange={(_, value) => {
                          const matchingCategory = categories.find(
                            (category) => category.name.toLowerCase() === value.trim().toLowerCase()
                          );

                          onGroupChange(group.id, {
                            currentCategoryId: matchingCategory?.category_id ?? '',
                            currentCategoryName: value
                          });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Category"
                            helperText="Choose an existing category or type a new one."
                          />
                        )}
                      />
                      {group.suggestedCategoryName && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Suggested category: {group.suggestedCategoryName}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Autocomplete
                        freeSolo
                        options={payees.map((payee) => payee.name)}
                        value={group.currentPayeeName}
                        onChange={(_, value) =>
                          onGroupChange(group.id, {
                            currentPayeeName: typeof value === 'string' ? value : ''
                          })
                        }
                        onInputChange={(_, value) =>
                          onGroupChange(group.id, {
                            currentPayeeName: value
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Payee"
                            helperText="Choose an existing payee or type a new one."
                          />
                        )}
                      />
                      {group.suggestedPayeeName && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Suggested payee: {group.suggestedPayeeName}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Button
                        fullWidth
                        variant={group.status === 'applied' ? 'outlined' : 'contained'}
                        onClick={() => onApplyGroup(group.id)}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {group.status === 'applied'
                          ? `Reapply to ${group.count}`
                          : `Apply to ${group.count}`}
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={group.saveRule}
                            onChange={(event) =>
                              onGroupChange(group.id, { saveRule: event.target.checked })
                            }
                            disabled={!group.currentCategoryId}
                          />
                        }
                        label="Save a future category rule from this group"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CategorizationReviewStep;
