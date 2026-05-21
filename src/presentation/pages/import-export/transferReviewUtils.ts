import { Account } from '../../../data-storage/models/Account';
import { Transaction, TransactionType } from '../../../data-storage/models/Transaction';

export type TransferResolution = 'transfer' | 'regular' | 'skip';

export interface TransferCandidate {
  id: string;
  transactionIndex: number;
  transaction: Transaction;
  detectedBy: string[];
  resolution: TransferResolution;
  fromAccountId: number | '';
  toAccountId: number | '';
}

const TRANSFER_KEYWORD_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\btransfer\b/i, reason: 'Description contains "transfer"' },
  { pattern: /\bxfer\b/i, reason: 'Description contains "xfer"' },
  { pattern: /\bmove money\b/i, reason: 'Description contains "move money"' },
  { pattern: /\bfunds transfer\b/i, reason: 'Description contains "funds transfer"' },
  { pattern: /\bonline transfer\b/i, reason: 'Description contains "online transfer"' },
  { pattern: /\bpayment thank you\b/i, reason: 'Description contains "payment thank you"' },
  { pattern: /\bcard payment\b/i, reason: 'Description contains "card payment"' }
];

export const getTransferDetectionReasons = (
  transaction: Transaction,
  options?: { includeDeferredReason?: boolean }
): string[] => {
  const detectedBy: string[] = [];
  const description = `${transaction.description || ''} ${transaction.payee_name || ''}`.trim();

  if (options?.includeDeferredReason) {
    detectedBy.push('Previously deferred during import');
  }

  if (transaction.transaction_type === TransactionType.TRANSFER) {
    detectedBy.push('Transaction type mapped as transfer');
  }

  for (const rule of TRANSFER_KEYWORD_PATTERNS) {
    if (rule.pattern.test(description)) {
      detectedBy.push(rule.reason);
    }
  }

  return Array.from(new Set(detectedBy));
};

const getDefaultTransferAccounts = (
  transaction: Transaction,
  availableAccounts: Account[]
): { fromAccountId: number | ''; toAccountId: number | '' } => {
  const importedAccountExists = availableAccounts.some(
    (account) => account.account_id === transaction.account_id
  );

  return {
    fromAccountId:
      transaction.amount < 0 && importedAccountExists ? transaction.account_id : '',
    toAccountId:
      transaction.amount > 0 && importedAccountExists ? transaction.account_id : ''
  };
};

export const buildImportTransferCandidates = (
  transactions: Transaction[],
  availableAccounts: Account[]
): TransferCandidate[] => {
  return transactions.flatMap((transaction, transactionIndex) => {
    const detectedBy = getTransferDetectionReasons(transaction);

    if (detectedBy.length === 0) {
      return [];
    }

    const { fromAccountId, toAccountId } = getDefaultTransferAccounts(
      transaction,
      availableAccounts
    );

    return [{
      id: `${transactionIndex}-${transaction.date}-${transaction.amount}-${transaction.description || 'transaction'}`,
      transactionIndex,
      transaction,
      detectedBy,
      resolution: 'transfer',
      fromAccountId,
      toAccountId
    }];
  });
};

export const buildPendingTransferCandidates = (
  transactions: Transaction[],
  availableAccounts: Account[]
): TransferCandidate[] => {
  return transactions
    .filter((transaction) => transaction.pending_transfer_review)
    .map((transaction, index) => {
      const detectedBy = getTransferDetectionReasons(transaction, {
        includeDeferredReason: true
      });
      const { fromAccountId, toAccountId } = getDefaultTransferAccounts(
        transaction,
        availableAccounts
      );

      return {
        id: `pending-${transaction.transaction_id || index}`,
        transactionIndex: index,
        transaction,
        detectedBy,
        resolution: 'transfer' as TransferResolution,
        fromAccountId,
        toAccountId
      };
    });
};

export const normalizeTransferCandidateAsRegular = (
  transaction: Transaction,
  options?: { pendingTransferReview?: boolean }
): Transaction => {
  const nextTransactionType =
    transaction.transaction_type === TransactionType.TRANSFER
      ? (transaction.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE)
      : transaction.transaction_type;

  return {
    ...transaction,
    transaction_type: nextTransactionType,
    transaction_subtype: undefined,
    linked_transaction_id: undefined,
    pending_transfer_review: Boolean(options?.pendingTransferReview)
  };
};
