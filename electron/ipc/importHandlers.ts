import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { DatabaseConnection } from '../../src/data-storage/database/DatabaseConnection';
import { Transaction, TransactionStatus, TransactionType } from '../../src/data-storage/models/Transaction';
import { AccountingService } from '../../src/data-storage/services/AccountingService';

interface CsvParseResult {
  success: boolean;
  data: any[];
  meta: any;
  errors?: any[];
  error?: any;
}

interface ExcelSheet {
  name: string;
  headers: string[];
  data: any[];
}

interface ExcelParseResult {
  success: boolean;
  sheets: ExcelSheet[];
  error?: string;
}

interface ValidationError {
  row: number;
  errors: Record<string, string>;
}

interface ValidationResult {
  success: boolean;
  validTransactions: Transaction[];
  errors: ValidationError[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export function setupImportHandlers(): void {
  /**
   * File open dialog for imports
   */
  ipcMain.handle('import:showFileDialog', async (_event, _options?: any) => {
    const result = await dialog.showOpenDialog({
      title: 'Select File to Import',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'Excel Files', extensions: ['xlsx'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return { canceled: false, filePath: result.filePaths[0] };
  });

  /**
   * CSV parsing using PapaParse (matches legacy behavior closely)
   */
  ipcMain.handle('import:parseCSV', async (_event, filePath: string): Promise<CsvParseResult> => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');

      return await new Promise<CsvParseResult>((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          // Try to handle different delimiters in case the CSV isn't standard
          delimitersToGuess: [',', '\t', ';', '|'],
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              // Filter out non-critical errors to match the more forgiving dev behavior
              const criticalErrors = results.errors.filter(
                (e: any) =>
                  e.type !== 'FieldMismatch' &&
                  e.code !== 'TooFewFields' &&
                  e.code !== 'TooManyFields'
              );

              if (criticalErrors.length > 0) {
                reject({
                  success: false,
                  errors: criticalErrors
                });
                return;
              }
            }

            resolve({
              success: true,
              data: results.data,
              meta: results.meta
            });
          },
          error: (error: any) => {
            reject({ success: false, error });
          }
        });
      });
    } catch (error: any) {
      console.error('CSV parsing error:', error);
      return {
        success: false,
        data: [],
        meta: {},
        error: error?.message ?? 'Unknown CSV parsing error'
      };
    }
  });

  /**
   * Excel parsing using ExcelJS (matches legacy behavior closely)
   */
  ipcMain.handle('import:parseExcel', async (_event, filePath: string): Promise<ExcelParseResult> => {
    try {
      if (filePath.toLowerCase().endsWith('.xls')) {
        return {
          success: false,
          sheets: [],
          error: 'Legacy .xls files are not supported. Please save the file as .xlsx and try again.'
        };
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const result: ExcelParseResult = {
        success: true,
        sheets: []
      };

      workbook.eachSheet((worksheet) => {
        const sheetData: any[] = [];
        const headers: string[] = [];

        if (worksheet.rowCount < 1) {
          return;
        }

        // First row as header (with fallbacks) – mirrors legacy logic
        const headerRow = worksheet.getRow(1);
        let hasValidHeaders = false;

        headerRow.eachCell((cell, colNumber) => {
          let headerValue: any;

          if ((cell as any).formula) {
            headerValue = (cell as any).result ?? cell.value;
          } else {
            headerValue = cell.value;
          }

          if (headerValue !== null && headerValue !== undefined) {
            if (typeof headerValue === 'object' && (headerValue as any).text) {
              headerValue = (headerValue as any).text;
            } else if (typeof headerValue !== 'string') {
              headerValue = String(headerValue);
            }
            hasValidHeaders = true;
          } else {
            headerValue = `Column${colNumber}`;
          }

          headers[colNumber - 1] = headerValue;
        });

        // If first row is not good, try second row as headers
        if (!hasValidHeaders && worksheet.rowCount > 1) {
          const secondRow = worksheet.getRow(2);
          secondRow.eachCell((cell, colNumber) => {
            let headerValue: any = cell.value;
            if (headerValue !== null && headerValue !== undefined) {
              if (typeof headerValue === 'object' && (headerValue as any).text) {
                headerValue = (headerValue as any).text;
              } else if (typeof headerValue !== 'string') {
                headerValue = String(headerValue);
              }
              headers[colNumber - 1] = headerValue;
              hasValidHeaders = true;
            }
          });
        }

        const startRow = hasValidHeaders ? 2 : 1;

        for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          const rowData: Record<string, any> = {};
          let hasData = false;

          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (!header) return;

            let cellValue: any;
            const anyCell: any = cell;

            if (anyCell.formula) {
              cellValue = anyCell.result ?? anyCell.value;
            } else {
              cellValue = cell.value;
            }

            rowData[header] = cellValue;
            hasData = true;
          });

          if (hasData) {
            sheetData.push(rowData);
          }
        }

        result.sheets.push({
          name: worksheet.name,
          headers,
          data: sheetData
        });
      });

      if (result.sheets.length === 0) {
        return { success: false, sheets: [], error: 'No data found in Excel file' };
      }

      return result;
    } catch (error: any) {
      console.error('Excel parsing error:', error);
      return {
        success: false,
        sheets: [],
        error: error?.message ?? 'Unknown Excel parsing error'
      };
    }
  });

  /**
   * Validate transaction rows against accounts & categories,
   * and normalize into Transaction objects the rest of the app can consume.
   * This closely follows the proven logic from the dev main.js.
   */
  ipcMain.handle(
    'import:validateTransactions',
    async (_event, data: any[], mappings: Record<string, string>): Promise<ValidationResult> => {
      try {
        const db = DatabaseConnection.getInstance();

        const accounts: any[] = db.prepare('SELECT * FROM accounts').all();
        const categories: any[] = db.prepare('SELECT * FROM categories').all();

        const validatedData: Transaction[] = [];
        const errors: ValidationError[] = [];

        data.forEach((row: any, index: number) => {
          const transaction: any = {};
          const rowErrors: Record<string, string> = {};
          let hasErrors = false;

          // 1. Account resolution (fixed ID, ID column, or name) – matches dev behavior
          if (mappings.account_id) {
            // Fixed account ID for all rows
            if (!isNaN(Number(mappings.account_id))) {
              const accountId = Number(mappings.account_id);
              const account = accounts.find((a: any) => a.account_id === accountId);
              if (account) {
                transaction.account_id = accountId;
              } else {
                rowErrors.account_id = `Account ID ${accountId} does not exist`;
                hasErrors = true;
              }
            } else if (row[mappings.account_id] !== undefined) {
              const rawVal = row[mappings.account_id];
              if (!isNaN(Number(rawVal))) {
                const accountId = Number(rawVal);
                const account = accounts.find((a: any) => a.account_id === accountId);
                if (account) {
                  transaction.account_id = accountId;
                } else {
                  const accountByName = accounts.find(
                    (a: any) =>
                      String(a.name).toLowerCase() === String(rawVal).toLowerCase()
                  );
                  if (accountByName) {
                    transaction.account_id = accountByName.account_id;
                  } else {
                    rowErrors.account_id = `Account '${rawVal}' not found`;
                    hasErrors = true;
                  }
                }
              } else {
                const accountByName = accounts.find(
                  (a: any) =>
                    String(a.name).toLowerCase() === String(rawVal).toLowerCase()
                );
                if (accountByName) {
                  transaction.account_id = accountByName.account_id;
                } else {
                  rowErrors.account_id = `Account '${rawVal}' not found`;
                  hasErrors = true;
                }
              }
            } else {
              rowErrors.account_id = 'Account column is empty';
              hasErrors = true;
            }
          } else {
            const defaultAccount =
              accounts.find((a: any) => a.active === 1) ?? accounts[0];
            if (defaultAccount) {
              transaction.account_id = defaultAccount.account_id;
            } else {
              rowErrors.account_id = 'No accounts available';
              hasErrors = true;
            }
          }

          // 2. Date parsing – supports multiple formats and Excel serials
          if (mappings.date && row[mappings.date] !== undefined) {
            try {
              let dateValue: Date | null = null;
              const rawDate = row[mappings.date];

              if (rawDate instanceof Date) {
                dateValue = rawDate;
              } else if (typeof rawDate === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                  dateValue = new Date(rawDate);
                } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(rawDate)) {
                  const parts = rawDate.split(/[\/\-]/);
                  if (parts.length === 3) {
                    if (parseInt(parts[0], 10) > 12) {
                      dateValue = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                      dateValue = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                    }
                  } else {
                    dateValue = new Date(rawDate);
                  }
                } else {
                  dateValue = new Date(rawDate);
                }
              } else if (typeof rawDate === 'number') {
                // Excel serial or timestamp heuristic
                if (rawDate > 10000) {
                  const excelEpoch = new Date(1899, 11, 30);
                  dateValue = new Date(
                    excelEpoch.getTime() + rawDate * 24 * 60 * 60 * 1000
                  );
                } else {
                  dateValue = new Date(rawDate * 1000);
                }
              }

              if (!dateValue || isNaN(dateValue.getTime())) {
                rowErrors.date = `Invalid date: ${row[mappings.date]}`;
                hasErrors = true;
              } else {
                transaction.date = dateValue.toISOString().split('T')[0];
              }
            } catch {
              rowErrors.date = `Invalid date: ${row[mappings.date]}`;
              hasErrors = true;
            }
          } else {
            rowErrors.date = 'Date is required';
            hasErrors = true;
          }

          // 3. Amount parsing and normalization
          if (mappings.amount && row[mappings.amount] !== undefined) {
            let amount = row[mappings.amount];

            if (typeof amount === 'string') {
              amount = amount.replace(/[^0-9\-.,]/g, '');
              amount = amount.replace(',', '.');
              amount = parseFloat(amount);
            }

            if (typeof amount !== 'number' || isNaN(amount)) {
              rowErrors.amount = `Invalid amount: ${row[mappings.amount]}`;
              hasErrors = true;
            } else {
              transaction.amount = amount;
            }
          } else {
            rowErrors.amount = 'Amount is required';
            hasErrors = true;
          }

          // 4. Transaction type
          if (mappings.transaction_type && row[mappings.transaction_type] !== undefined) {
            let typeValue = String(row[mappings.transaction_type]).toLowerCase();
            if (['income', 'credit', 'deposit'].includes(typeValue)) {
              transaction.transaction_type = TransactionType.INCOME;
            } else if (['expense', 'debit', 'withdrawal'].includes(typeValue)) {
              transaction.transaction_type = TransactionType.EXPENSE;
            } else if (['transfer', 'xfer', 'internal_transfer'].includes(typeValue)) {
              transaction.transaction_type = TransactionType.TRANSFER;
            } else {
              if (transaction.amount !== undefined) {
                transaction.transaction_type =
                  transaction.amount >= 0
                    ? TransactionType.INCOME
                    : TransactionType.EXPENSE;
              } else {
                transaction.transaction_type = TransactionType.EXPENSE;
              }
            }
          } else {
            if (transaction.amount !== undefined) {
              transaction.transaction_type =
                transaction.amount >= 0
                  ? TransactionType.INCOME
                  : TransactionType.EXPENSE;

              if (
                transaction.transaction_type === TransactionType.EXPENSE &&
                transaction.amount > 0
              ) {
                transaction.amount = -Math.abs(transaction.amount);
              }
            } else {
              transaction.transaction_type = TransactionType.EXPENSE;
            }
          }

          // 5. Optional description
          if (mappings.description && row[mappings.description] !== undefined) {
            transaction.description = String(row[mappings.description] ?? '');
          }

          // 6. Optional category mapping by ID or name
          if (mappings.category_id && row[mappings.category_id] !== undefined) {
            const raw = row[mappings.category_id];
            if (!isNaN(Number(raw))) {
              const categoryId = Number(raw);
              const category = categories.find(
                (c: any) => c.category_id === categoryId
              );
              if (category) {
                transaction.category_id = categoryId;
              } else {
                transaction.category_id = null;
              }
            } else {
              const categoryName = String(raw).toLowerCase();
              const exact = categories.find(
                (c: any) => String(c.name).toLowerCase() === categoryName
              );
              if (exact) {
                transaction.category_id = exact.category_id;
              } else {
                const partial = categories.find((c: any) => {
                  const name = String(c.name).toLowerCase();
                  return (
                    name.includes(categoryName) || categoryName.includes(name)
                  );
                });
                transaction.category_id = partial ? partial.category_id : null;
              }
            }
          }

          // 7. Default status
          transaction.status = TransactionStatus.PENDING;

          if (hasErrors) {
            errors.push({
              row: index + 1,
              errors: rowErrors
            });
          } else {
            validatedData.push(transaction as Transaction);
          }
        });

        return {
          success: errors.length === 0,
          validTransactions: validatedData,
          errors,
          stats: {
            total: data.length,
            valid: validatedData.length,
            invalid: errors.length
          }
        };
      } catch (error: any) {
        console.error('Error validating transactions for import:', error);
        return {
          success: false,
          validTransactions: [],
          errors: [],
          stats: {
            total: data.length,
            valid: 0,
            invalid: data.length
          }
        };
      }
    }
  );

  /**
   * Persist validated transactions using the existing AccountingService,
   * so imports go through the same double-entry logic as normal entries.
   */
  ipcMain.handle(
    'import:saveTransactions',
    async (_event, transactions: Transaction[]) => {
      try {
        const accountingService = new AccountingService();
        let successCount = 0;

        for (const tx of transactions) {
          try {
            const result = accountingService.createTransaction(tx);
            if (result.success) {
              successCount++;
            }
          } catch (err) {
            console.error('Error creating transaction during import:', err);
          }
        }

        return {
          success: successCount === transactions.length,
          count: successCount
        };
      } catch (error: any) {
        console.error('Error saving imported transactions:', error);
        return {
          success: false,
          count: 0,
          error: error?.message ?? 'Unknown error while saving transactions'
        };
      }
    }
  );
}
