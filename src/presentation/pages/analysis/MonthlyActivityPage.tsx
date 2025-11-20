import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Account } from '../../../data-storage/models/Account';
import { Transaction } from '../../../data-storage/models/Transaction';
import { Category } from '../../../data-storage/models/Category';

interface MonthlyActivityResponse {
  success: boolean;
  transactions?: Transaction[];
  categoryTotals?: Array<{ category_name: string; total_amount: number }>;
  merchantTotals?: Array<{ payee_name: string; total_amount: number }>;
  error?: string;
}

const MonthlyActivityPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Array<{ category_name: string; total_amount: number }>>([]);
  const [merchantTotals, setMerchantTotals] = useState<Array<{ payee_name: string; total_amount: number }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogTx, setCategoryDialogTx] = useState<Transaction | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [payeeDialogOpen, setPayeeDialogOpen] = useState(false);
  const [payeeDialogTx, setPayeeDialogTx] = useState<Transaction | null>(null);
  const [editedPayeeName, setEditedPayeeName] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [payeeFilter, setPayeeFilter] = useState<string | 'all'>('all');

  const summaryStats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        totalTransfers: 0,
        netIncome: 0,
        categorizedCount: 0,
        uncategorizedCount: 0,
        categorizedPercent: 0,
        topCategories: [] as Array<{ category_name: string; total_amount: number }>,
        topMerchants: [] as Array<{ payee_name: string; total_amount: number }>
      };
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfers = 0;
    let categorizedCount = 0;
    let uncategorizedCount = 0;

    const categoryTotalsMap: Record<string, number> = {};
    const merchantTotalsMap: Record<string, number> = {};

    const getCategoryTypeForTx = (t: any): string | null => {
      if (!t.category_id) return null;
      const category = categories.find(
        (c) => c.category_id === t.category_id
      );
      return category ? (category.type as string) : null;
    };

    transactions.forEach((t: any) => {
      const amount = t.amount || 0;
      const categoryType = getCategoryTypeForTx(t);

      const isTransfer =
        t.transaction_type === 'transfer' || categoryType === 'transfer';
      const isIncome =
        t.transaction_type === 'income' || categoryType === 'income';
      const isExpense =
        t.transaction_type === 'expense' || categoryType === 'expense';

      if (isTransfer) {
        // Transfers are neutral for P&L; track magnitude separately
        totalTransfers += Math.abs(amount);
      } else if (isIncome) {
        totalIncome += amount;
      } else if (isExpense) {
        totalExpense += amount;
      }

      if (t.category_id) {
        categorizedCount += 1;
      } else {
        uncategorizedCount += 1;
      }

      const categoryKey = t.category_name || 'Uncategorized';
      const payeeKey = t.payee_name || 'Unlabeled';

      categoryTotalsMap[categoryKey] =
        (categoryTotalsMap[categoryKey] || 0) + amount;
      merchantTotalsMap[payeeKey] =
        (merchantTotalsMap[payeeKey] || 0) + amount;
    });

    // Net income excludes transfers entirely
    const netIncome = totalIncome + totalExpense;

    const categoryTotalsArray = Object.entries(categoryTotalsMap).map(
      ([category_name, total_amount]) => ({ category_name, total_amount })
    );

    const merchantTotalsArray = Object.entries(merchantTotalsMap).map(
      ([payee_name, total_amount]) => ({ payee_name, total_amount })
    );

    const topCategories = categoryTotalsArray
      .filter((c) => c.category_name !== 'Uncategorized')
      .sort((a, b) => Math.abs(b.total_amount) - Math.abs(a.total_amount))
      .slice(0, 3);

    const topMerchants = merchantTotalsArray
      .filter((m) => m.payee_name !== 'Unlabeled')
      .sort((a, b) => Math.abs(b.total_amount) - Math.abs(a.total_amount))
      .slice(0, 3);

    const totalCount = transactions.length;
    const categorizedPercent =
      totalCount > 0 ? Math.round((categorizedCount / totalCount) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      totalTransfers,
      netIncome,
      categorizedCount,
      uncategorizedCount,
      categorizedPercent,
      topCategories,
      topMerchants
    };
  }, [transactions, categories]);

  const recomputeSummaries = (txs: Transaction[]) => {
    const categoryTotalsMap: Record<string, number> = {};
    const merchantTotalsMap: Record<string, number> = {};

    txs.forEach((t: any) => {
      const categoryKey = t.category_name || 'Uncategorized';
      const payeeKey = t.payee_name || 'Unlabeled';

      categoryTotalsMap[categoryKey] = (categoryTotalsMap[categoryKey] || 0) + t.amount;
      merchantTotalsMap[payeeKey] = (merchantTotalsMap[payeeKey] || 0) + t.amount;
    });

    const newCategoryTotals = Object.entries(categoryTotalsMap).map(([category_name, total_amount]) => ({
      category_name,
      total_amount
    }));

    const newMerchantTotals = Object.entries(merchantTotalsMap).map(([payee_name, total_amount]) => ({
      payee_name,
      total_amount
    }));

    setCategoryTotals(newCategoryTotals);
    setMerchantTotals(newMerchantTotals);
  };

  // Load accounts once
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const result = await window.api.accounts.getAll();
        setAccounts(result || []);
      } catch (e) {
        console.error('Error loading accounts for MonthlyActivityPage:', e);
      }
    };
    const loadCategories = async () => {
      try {
        const result = await window.api.categories.getAll();
        setCategories(result || []);
      } catch (e) {
        console.error('Error loading categories for MonthlyActivityPage:', e);
      }
    };
    loadAccounts();
    loadCategories();
  }, []);

  const loadMonthlyActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const accountId = selectedAccountId === 'all' ? undefined : selectedAccountId;
      const result: MonthlyActivityResponse = await window.api.transactions.getMonthlyActivity(month, accountId);

      if (!result.success) {
        setError(result.error || 'Failed to load monthly activity');
        setInfoMessage(null);
        setTransactions([]);
        setCategoryTotals([]);
        setMerchantTotals([]);
        return;
      }

      setTransactions(result.transactions || []);
      setCategoryTotals(result.categoryTotals || []);
      setMerchantTotals(result.merchantTotals || []);
      setInfoMessage(null);
    } catch (e) {
      console.error('Error loading monthly activity:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setInfoMessage(null);
      setTransactions([]);
      setCategoryTotals([]);
      setMerchantTotals([]);
    } finally {
      setLoading(false);
    }
  };

  // Load when month or account changes
  useEffect(() => {
    loadMonthlyActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedAccountId]);

  const handleAutoCategorize = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const accountId = selectedAccountId === 'all' ? undefined : selectedAccountId;
      const result = await window.api.transactions.autoCategorizeMonth(month, accountId);

      if (!result.success) {
        setError(result.error || 'Auto-categorization failed');
      } else {
        setInfoMessage(result.message || 'Auto-categorization completed.');
        await loadMonthlyActivity();
      }
    } catch (e) {
      console.error('Error during auto-categorization:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (tx: Transaction, newCategoryValue: string) => {
    if (!tx.transaction_id) return;
    try {
      setError(null);
      setInfoMessage(null);

      // Handle "create new category" option
      if (newCategoryValue === '__new__') {
        setCategoryDialogTx(tx);
        setNewCategoryName('');
        setCategoryDialogOpen(true);
        return;
      }

      const numericCategoryId =
        newCategoryValue === '' ? null : Number(newCategoryValue);

      const updated: Transaction = {
        ...tx,
        category_id: numericCategoryId
      };

      const result = await window.api.transactions.update(tx.transaction_id, updated);
      if (!result.success) {
        setError('Failed to update transaction category.');
      } else {
        setInfoMessage('Category updated.');

        const selectedCategory =
          numericCategoryId != null
            ? categories.find((c) => c.category_id === numericCategoryId)
            : undefined;

        setTransactions((prev) => {
          const updatedTransactions = prev.map((t: any) =>
            t.transaction_id === tx.transaction_id
              ? {
                  ...t,
                  category_id: numericCategoryId,
                  category_name: selectedCategory ? selectedCategory.name : undefined
                }
              : t
          );

        recomputeSummaries(updatedTransactions);
        return updatedTransactions;
      });

      // Send feedback to AI service for learning
      try {
        if (window.api && window.api.ai && window.api.ai.learnFromFeedback) {
          const correctCategory = categories.find(
            (c) => c.category_id === numericCategoryId
          );

          window.api.ai
            .learnFromFeedback({
              transaction: updated,
              correctCategory
            })
            .catch((err: any) => {
              console.error('Error sending category feedback to AI service:', err);
            });
        }
      } catch (feedbackError) {
        console.error('Error initiating category feedback:', feedbackError);
      }
      }
    } catch (e) {
      console.error('Error updating transaction category:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handlePayeeEdit = async (tx: Transaction) => {
    if (!tx.transaction_id) return;

    try {
      setError(null);
      setInfoMessage(null);

      const currentName = (tx as any).payee_name || '';
      setPayeeDialogTx(tx);
      setEditedPayeeName(currentName);
      setPayeeDialogOpen(true);
    } catch (e) {
      console.error('Error updating payee:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleConfirmNewCategory = async () => {
    if (!categoryDialogTx || !categoryDialogTx.transaction_id) return;

    const name = newCategoryName.trim();
    if (!name) {
      setError('Category name is required.');
      return;
    }

    try {
      setError(null);
      setInfoMessage(null);

      const existing = categories.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      let createdCategoryId: number | null = null;

      if (existing && existing.category_id != null) {
        createdCategoryId = existing.category_id;
      } else {
        const type =
          categoryDialogTx.transaction_type === 'income'
            ? 'income'
            : 'expense';

        const createResult = await window.api.categories.create({
          name,
          type
        } as Category);

        if (!createResult.success || createResult.id == null) {
          setError('Failed to create category.');
          return;
        }

        createdCategoryId = createResult.id;

        setCategories((prev) => [
          ...prev,
          {
            category_id: createResult.id,
            name,
            type
          } as Category
        ]);
      }

      if (!createdCategoryId) {
        return;
      }

      const updated: Transaction = {
        ...categoryDialogTx,
        category_id: createdCategoryId
      };

      const result = await window.api.transactions.update(
        categoryDialogTx.transaction_id,
        updated
      );

      if (!result.success) {
        setError('Failed to update transaction category.');
        return;
      }

      const selectedCategory = categories.find(
        (c) => c.category_id === createdCategoryId
      ) || {
        category_id: createdCategoryId,
        name,
        type: updated.transaction_type === 'income' ? 'income' : 'expense'
      };

      setTransactions((prev) => {
        const updatedTxs = prev.map((t: any) =>
          t.transaction_id === categoryDialogTx.transaction_id
            ? {
                ...t,
                category_id: createdCategoryId,
                category_name: selectedCategory.name
              }
            : t
        );
        recomputeSummaries(updatedTxs as unknown as Transaction[]);
        return updatedTxs;
      });

      // Send feedback to AI service for learning
      try {
        if (window.api && window.api.ai && window.api.ai.learnFromFeedback) {
          const correctCategory = selectedCategory;

          window.api.ai
            .learnFromFeedback({
              transaction: updated,
              correctCategory
            })
            .catch((err: any) => {
              console.error('Error sending category feedback to AI service:', err);
            });
        }
      } catch (feedbackError) {
        console.error('Error initiating category feedback:', feedbackError);
      }

      setInfoMessage('Category created and applied.');
      setCategoryDialogOpen(false);
      setCategoryDialogTx(null);
      setNewCategoryName('');
    } catch (e) {
      console.error('Error creating/applying new category:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleCancelNewCategory = () => {
    setCategoryDialogOpen(false);
    setCategoryDialogTx(null);
    setNewCategoryName('');
  };

  const handleConfirmPayeeEdit = async () => {
    if (!payeeDialogTx || !payeeDialogTx.transaction_id) return;

    const trimmed = editedPayeeName.trim();
    if (!trimmed) {
      setError('Payee name is required.');
      return;
    }

    try {
      setError(null);
      setInfoMessage(null);

      // Create or reuse payee by name
      const payeeResult = await window.api.payees.createIfNotExists({
        name: trimmed,
        default_category_id: payeeDialogTx.category_id || null
      } as any);

      if (!payeeResult.success || !payeeResult.id) {
        setError('Failed to update payee.');
        return;
      }

      const updated: Transaction = {
        ...payeeDialogTx,
        payee_id: payeeResult.id
      };

      const updateResult = await window.api.transactions.update(
        payeeDialogTx.transaction_id,
        updated
      );

      if (!updateResult.success) {
        setError('Failed to update transaction payee.');
        return;
      }

      setTransactions((prev) => {
        const updatedTxs = prev.map((t: any) =>
          t.transaction_id === payeeDialogTx.transaction_id
            ? {
                ...t,
                payee_id: payeeResult.id,
                payee_name: trimmed
              }
            : t
        );
        recomputeSummaries(updatedTxs as unknown as Transaction[]);
        return updatedTxs;
      });

      // Send feedback to AI service for learning
      try {
        if (window.api && window.api.ai && window.api.ai.learnFromFeedback) {
          const correctCategory =
            categories.find(
              (c) => c.category_id === payeeDialogTx.category_id
            ) || null;

          window.api.ai
            .learnFromFeedback({
              transaction: {
                ...payeeDialogTx,
                payee_id: payeeResult.id,
                payee_name: trimmed
              },
              correctCategory,
              correctPayee: {
                payee_id: payeeResult.id,
                name: trimmed
              }
            })
            .catch((err: any) => {
              console.error('Error sending payee feedback to AI service:', err);
            });
        }
      } catch (feedbackError) {
        console.error('Error initiating payee feedback:', feedbackError);
      }

      setInfoMessage('Payee updated.');
      setPayeeDialogOpen(false);
      setPayeeDialogTx(null);
      setEditedPayeeName('');
    } catch (e) {
      console.error('Error updating payee:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleCancelPayeeEdit = () => {
    setPayeeDialogOpen(false);
    setPayeeDialogTx(null);
    setEditedPayeeName('');
  };

  const categoryFilterOptions = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.category_name) {
        names.add(t.category_name);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const payeeFilterOptions = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.payee_name) {
        names.add(t.payee_name);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (showUncategorizedOnly) {
      result = result.filter((t) => !t.category_id);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((t: any) => t.category_name === categoryFilter);
    }

    if (payeeFilter !== 'all') {
      result = result.filter((t: any) => t.payee_name === payeeFilter);
    }

    return result;
  }, [transactions, showUncategorizedOnly, categoryFilter, payeeFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5">Monthly Activity</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="account-select-label">Account</InputLabel>
            <Select
              labelId="account-select-label"
              value={selectedAccountId}
              label="Account"
              onChange={(e) => {
                const value = e.target.value;
                setSelectedAccountId(value === 'all' ? 'all' : Number(value));
              }}
            >
              <MenuItem value="all">All Accounts</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.account_id} value={account.account_id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              value={categoryFilter}
              label="Category"
              onChange={(e) =>
                setCategoryFilter(e.target.value === 'all' ? 'all' : (e.target.value as string))
              }
            >
              <MenuItem value="all">All categories</MenuItem>
              {categoryFilterOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="payee-filter-label">Payee</InputLabel>
            <Select
              labelId="payee-filter-label"
              value={payeeFilter}
              label="Payee"
              onChange={(e) =>
                setPayeeFilter(e.target.value === 'all' ? 'all' : (e.target.value as string))
              }
            >
              <MenuItem value="all">All payees</MenuItem>
              {payeeFilterOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={showUncategorizedOnly}
                onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
              />
            }
            label="Show only uncategorized"
          />
          <Button
            variant="outlined"
            onClick={handleAutoCategorize}
            disabled={loading || transactions.length === 0}
          >
            Auto-Categorize
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {infoMessage && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {infoMessage}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Summary */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
              <Typography variant="h6" gutterBottom>
                Net Income
              </Typography>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {summaryStats.netIncome.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Income:{' '}
                {summaryStats.totalIncome.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expenses:{' '}
                {summaryStats.totalExpense.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Transfers:{' '}
                {summaryStats.totalTransfers.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
              <Typography variant="h6" gutterBottom>
                Categorization
              </Typography>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {summaryStats.categorizedPercent}% categorized
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categorized: {summaryStats.categorizedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uncategorized: {summaryStats.uncategorizedCount}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
              <Typography variant="h6" gutterBottom>
                Top Categories
              </Typography>
              {summaryStats.topCategories.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data for selected month.
                </Typography>
              ) : (
                summaryStats.topCategories.map((row) => (
                  <Box
                    key={row.category_name}
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2">{row.category_name}</Typography>
                    <Typography variant="body2">
                      {row.total_amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>

            <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
              <Typography variant="h6" gutterBottom>
                Top Merchants
              </Typography>
              {summaryStats.topMerchants.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data for selected month.
                </Typography>
              ) : (
                summaryStats.topMerchants.map((row) => (
                  <Box
                    key={row.payee_name}
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2">{row.payee_name}</Typography>
                    <Typography variant="body2">
                      {row.total_amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Box>

          {/* Detailed table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Payee</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" sx={{ py: 2 }}>
                          No transactions for selected month.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.transaction_id}>
                        <TableCell>{t.date}</TableCell>
                        <TableCell>
                          {/* account_name is joined in electron-dev monthly query; fallback to account_id */}
                          {(t as any).account_name || `Account ${t.account_id}`}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {t.payee_name || ''}
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handlePayeeEdit(t)}
                              sx={{ minWidth: 'auto', textTransform: 'none' }}
                            >
                              Edit
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell>{t.description || ''}</TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={t.category_id ?? ''}
                              onChange={(e) => handleCategoryChange(t, e.target.value as string)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Uncategorized</em>
                              </MenuItem>
                              <MenuItem value="__new__">
                                <em>Create new category…</em>
                              </MenuItem>
                              {categories.map((cat) => (
                                <MenuItem key={cat.category_id} value={cat.category_id}>
                                  {cat.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="right">
                          {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* New Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={handleCancelNewCategory} maxWidth="xs" fullWidth>
        <DialogTitle>Create New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNewCategory}>Cancel</Button>
          <Button onClick={handleConfirmNewCategory} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Payee Dialog */}
      <Dialog open={payeeDialogOpen} onClose={handleCancelPayeeEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Payee</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Payee Name"
            fullWidth
            value={editedPayeeName}
            onChange={(e) => setEditedPayeeName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPayeeEdit}>Cancel</Button>
          <Button onClick={handleConfirmPayeeEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonthlyActivityPage;
