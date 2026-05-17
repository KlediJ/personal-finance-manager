interface SpendingFlowTransaction {
  transaction_type: string;
  amount: number;
  date?: string;
  account_id?: number;
  category_name?: string | null;
  payee_name?: string | null;
}

export const TOP_CATEGORIES = 6;
export const TOP_MERCHANTS = 8;

export interface MonthlySpendingRollupMetadata {
  topCategoryNames: string[];
  topMerchantNames: string[];
}

export function getMonthlySpendingRollupMetadata(
  transactions: SpendingFlowTransaction[]
): MonthlySpendingRollupMetadata {
  const expenses = transactions.filter((transaction) => transaction.transaction_type === 'expense');
  const categoryTotals = new Map<string, number>();
  const merchantTotals = new Map<string, number>();

  expenses.forEach((transaction) => {
    const categoryName = transaction.category_name || 'Uncategorized';
    const merchantName = transaction.payee_name || 'No payee';
    const value = Math.abs(transaction.amount);

    categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + value);
    merchantTotals.set(merchantName, (merchantTotals.get(merchantName) || 0) + value);
  });

  return {
    topCategoryNames: Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORIES)
      .map(([name]) => name),
    topMerchantNames: Array.from(merchantTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_MERCHANTS)
      .map(([name]) => name)
  };
}

export function getSankeyCategoryLabel(
  categoryName: string | null | undefined,
  metadata: MonthlySpendingRollupMetadata
): string {
  const normalizedCategoryName = categoryName || 'Uncategorized';
  return metadata.topCategoryNames.includes(normalizedCategoryName)
    ? normalizedCategoryName
    : 'Other categories';
}

export function getSankeyMerchantLabel(
  merchantName: string | null | undefined,
  metadata: MonthlySpendingRollupMetadata
): string {
  const normalizedMerchantName = merchantName || 'No payee';
  return metadata.topMerchantNames.includes(normalizedMerchantName)
    ? normalizedMerchantName
    : 'Other merchants';
}

export function isWithinMonth(date: string, monthKey: string): boolean {
  return date.startsWith(`${monthKey}-`);
}
