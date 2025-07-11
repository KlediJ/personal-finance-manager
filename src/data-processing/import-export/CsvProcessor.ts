import Papa from 'papaparse';
import { Transaction, TransactionType, TransactionStatus } from '../../data-storage/models/Transaction';
import { Account } from '../../data-storage/models/Account';

/**
 * Handles CSV file parsing, validation, and transformation for transaction imports
 */
export class CsvProcessor {
  /**
   * Parse a CSV file into a structured format
   * 
   * @param fileContent The raw CSV content as a string
   * @returns The parsed data and metadata
   */
  static parseFile(fileContent: string): Promise<{
    data: any[];
    meta: any;
    errors?: any[];
  }> {
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors && results.errors.length > 0) {
            // If there are errors, still resolve with the data but include errors
            resolve({
              data: results.data,
              meta: results.meta,
              errors: results.errors
            });
          } else {
            resolve({
              data: results.data,
              meta: results.meta
            });
          }
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Map and validate CSV data to transaction format
   * 
   * @param data The parsed CSV data
   * @param mappings Column mappings (CSV column name -> transaction field)
   * @param accounts Available accounts for validation
   * @returns Validated transactions and any validation errors
   */
  static validateAndMapTransactions(
    data: any[], 
    mappings: Record<string, string>,
    accounts: Account[]
  ): {
    validTransactions: Transaction[];
    errors: Array<{ row: number; errors: Record<string, string> }>;
    stats: { total: number; valid: number; invalid: number };
  } {
    const validTransactions: Transaction[] = [];
    const errors: Array<{ row: number; errors: Record<string, string> }> = [];
    
    // Process each row in the CSV
    data.forEach((row, index) => {
      const transaction: Partial<Transaction> = {};
      let hasErrors = false;
      const rowErrors: Record<string, string> = {};
      
      // Map and validate required fields
      
      // 1. Account ID handling
      if (mappings.account_id) {
        // If the mapping is a direct account ID number
        if (!isNaN(Number(mappings.account_id))) {
          const accountId = Number(mappings.account_id);
          const account = accounts.find(a => a.account_id === accountId);
          if (account) {
            transaction.account_id = accountId;
          } else {
            rowErrors.account_id = `Account ID ${accountId} does not exist`;
            hasErrors = true;
          }
        } 
        // If it's a column name in the CSV
        else if (row[mappings.account_id] !== undefined) {
          // Try to match by ID first
          const accountId = Number(row[mappings.account_id]);
          if (!isNaN(accountId)) {
            const account = accounts.find(a => a.account_id === accountId);
            if (account) {
              transaction.account_id = accountId;
            } else {
              // Try to match by name
              const accountByName = accounts.find(
                a => a.name.toLowerCase() === String(row[mappings.account_id]).toLowerCase()
              );
              if (accountByName) {
                transaction.account_id = accountByName.account_id;
              } else {
                rowErrors.account_id = `Account '${row[mappings.account_id]}' not found`;
                hasErrors = true;
              }
            }
          } else {
            // Try to match by name
            const accountByName = accounts.find(
              a => a.name.toLowerCase() === String(row[mappings.account_id]).toLowerCase()
            );
            if (accountByName) {
              transaction.account_id = accountByName.account_id;
            } else {
              rowErrors.account_id = `Account '${row[mappings.account_id]}' not found`;
              hasErrors = true;
            }
          }
        } else {
          rowErrors.account_id = 'Account ID is required';
          hasErrors = true;
        }
      } else {
        // If no account mapping, use the first account
        if (accounts.length > 0) {
          transaction.account_id = accounts[0].account_id;
        } else {
          rowErrors.account_id = 'No accounts available';
          hasErrors = true;
        }
      }
      
      // 2. Date validation
      if (mappings.date && row[mappings.date] !== undefined) {
        try {
          let dateValue: Date;
          
          // Handle different date formats
          if (typeof row[mappings.date] === 'string') {
            dateValue = new Date(row[mappings.date]);
          } else if (typeof row[mappings.date] === 'number') {
            // Excel date number (days since 1900)
            if (row[mappings.date] > 10000) { // Arbitrary cutoff for Excel dates
              // Excel date serial to JS date
              const excelEpoch = new Date(1899, 11, 30);
              dateValue = new Date(excelEpoch.getTime() + (row[mappings.date] * 24 * 60 * 60 * 1000));
            } else {
              // Unix timestamp (seconds since 1970)
              dateValue = new Date(row[mappings.date] * 1000);
            }
          } else if (row[mappings.date] instanceof Date) {
            dateValue = row[mappings.date];
          } else {
            throw new Error('Unsupported date format');
          }
          
          if (isNaN(dateValue.getTime())) {
            rowErrors.date = 'Invalid date format';
            hasErrors = true;
          } else {
            // Format as YYYY-MM-DD for SQLite (preserve local date, avoid timezone conversion)
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            transaction.date = `${year}-${month}-${day}`;
          }
        } catch (e) {
          rowErrors.date = 'Invalid date format';
          hasErrors = true;
        }
      } else {
        rowErrors.date = 'Date is required';
        hasErrors = true;
      }
      
      // 3. Amount validation
      if (mappings.amount && row[mappings.amount] !== undefined) {
        let amountValue: any = row[mappings.amount];
        
        // Handle amount as string with currency symbols or thousand separators
        if (typeof amountValue === 'string') {
          // Remove currency symbols and thousand separators
          amountValue = amountValue.replace(/[^0-9.-]/g, '');
        }
        
        const amount = Number(amountValue);
        
        if (isNaN(amount)) {
          rowErrors.amount = 'Amount must be a number';
          hasErrors = true;
        } else {
          transaction.amount = amount;
        }
      } else {
        rowErrors.amount = 'Amount is required';
        hasErrors = true;
      }
      
      // 4. Transaction type handling
      if (mappings.transaction_type && row[mappings.transaction_type] !== undefined) {
        const rawType = String(row[mappings.transaction_type]).toLowerCase();
        
        // Map common variations to standard types
        if (['income', 'deposit', 'credit', 'revenue', 'in'].includes(rawType)) {
          transaction.transaction_type = TransactionType.INCOME;
        } else if (['expense', 'payment', 'debit', 'charge', 'out', 'withdrawal'].includes(rawType)) {
          transaction.transaction_type = TransactionType.EXPENSE;
        } else if (['transfer', 'move', 'between'].includes(rawType)) {
          transaction.transaction_type = TransactionType.TRANSFER;
        } else {
          // Infer type based on amount sign if not explicitly set
          if (transaction.amount !== undefined) {
            transaction.transaction_type = transaction.amount >= 0 
              ? TransactionType.INCOME 
              : TransactionType.EXPENSE;
          } else {
            transaction.transaction_type = TransactionType.EXPENSE; // Default
          }
        }
      } else {
        // Infer from amount if available
        if (transaction.amount !== undefined) {
          transaction.transaction_type = transaction.amount >= 0 
            ? TransactionType.INCOME 
            : TransactionType.EXPENSE;
        } else {
          transaction.transaction_type = TransactionType.EXPENSE; // Default
        }
      }
      
      // 5. Optional fields
      // Description
      if (mappings.description && row[mappings.description] !== undefined) {
        transaction.description = String(row[mappings.description] || '');
      }
      
      // Category ID (placeholder for now - would need category lookup by name)
      if (mappings.category_id && row[mappings.category_id] !== undefined) {
        const categoryId = Number(row[mappings.category_id]);
        if (!isNaN(categoryId)) {
          transaction.category_id = categoryId;
        } else {
          // For now, just set to null - later we could add category lookup by name
          transaction.category_id = null;
        }
      }
      
      // Status
      if (mappings.status && row[mappings.status] !== undefined) {
        const rawStatus = String(row[mappings.status]).toLowerCase();
        
        if (['pending', 'p', 'uncleared'].includes(rawStatus)) {
          transaction.status = TransactionStatus.PENDING;
        } else if (['cleared', 'c', 'processed'].includes(rawStatus)) {
          transaction.status = TransactionStatus.CLEARED;
        } else if (['reconciled', 'r', 'verified'].includes(rawStatus)) {
          transaction.status = TransactionStatus.RECONCILED;
        } else {
          transaction.status = TransactionStatus.PENDING; // Default
        }
      } else {
        transaction.status = TransactionStatus.PENDING; // Default
      }
      
      // Add processed row or errors
      if (hasErrors) {
        errors.push({ row: index + 1, errors: rowErrors });
      } else {
        // Ensure required fields are present
        if (
          transaction.account_id !== undefined &&
          transaction.date !== undefined &&
          transaction.amount !== undefined &&
          transaction.transaction_type !== undefined
        ) {
          validTransactions.push(transaction as Transaction);
        } else {
          // This shouldn't happen if validation is thorough
          errors.push({ 
            row: index + 1, 
            errors: { general: 'Missing required fields after validation' } 
          });
        }
      }
    });
    
    return {
      validTransactions,
      errors,
      stats: {
        total: data.length,
        valid: validTransactions.length,
        invalid: errors.length
      }
    };
  }

  /**
   * Generate a CSV string from transaction data
   * 
   * @param transactions The transactions to export
   * @returns CSV string
   */
  static formatTransactionsForExport(transactions: any[]): string {
    // Transform transactions for easier consumption by PapaParse
    const formattedTransactions = transactions.map(t => ({
      date: t.date,
      account: t.account_name || `Account ${t.account_id}`,
      description: t.description || '',
      category: t.category_name || '',
      amount: t.amount,
      type: t.transaction_type,
      status: t.status
    }));
    
    // Use PapaParse to convert to CSV
    return Papa.unparse(formattedTransactions, {
      header: true,
      newline: '\r\n',
      delimiter: ','
    });
  }
}
