import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { DatabaseConnection } from '../../src/data-storage/database/DatabaseConnection';

interface ExportOptions {
  filePath: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
    transactionType?: string;
  };
}

interface ShowSaveDialogOptions {
  format?: 'csv' | 'excel';
  defaultPath?: string;
}

export function setupExportHandlers(): void {
  ipcMain.handle('export:showSaveDialog', async (_event, options?: ShowSaveDialogOptions) => {
    const format = options?.format ?? 'csv';
    const defaultBase = options?.defaultPath ?? 'transactions_export';
    const suggestedName =
      format === 'excel' ? `${defaultBase}.xlsx` : `${defaultBase}.csv`;

    const result = await dialog.showSaveDialog({
      title: 'Export Transactions',
      defaultPath: suggestedName,
      filters:
        format === 'excel'
          ? [
              { name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }
            ]
          : [{ name: 'CSV', extensions: ['csv'] }]
    });

    return {
      canceled: result.canceled,
      filePath: result.filePath
    };
  });

  ipcMain.handle('export:transactionsToCSV', async (_event, options: ExportOptions) => {
    try {
      const rows = getFilteredTransactions(options);
      const csv = buildCsv(rows);
      fs.writeFileSync(options.filePath, csv, { encoding: 'utf8' });
      return {
        success: true,
        path: options.filePath,
        count: rows.length
      };
    } catch (error) {
      console.error('Error exporting transactions to CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('export:transactionsToExcel', async (_event, options: ExportOptions) => {
    try {
      // For the lightweight version, generate a CSV-compatible file even for "Excel".
      const rows = getFilteredTransactions(options);
      const csv = buildCsv(rows);
      fs.writeFileSync(options.filePath, csv, { encoding: 'utf8' });
      return {
        success: true,
        path: options.filePath,
        count: rows.length
      };
    } catch (error) {
      console.error('Error exporting transactions to Excel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

function getFilteredTransactions(options: ExportOptions): any[] {
  const db = DatabaseConnection.getInstance();

  const filters = options.filters ?? {};
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (filters.startDate && filters.endDate) {
    whereClauses.push('t.date BETWEEN ? AND ?');
    params.push(filters.startDate, filters.endDate);
  }

  if (typeof filters.accountId === 'number') {
    whereClauses.push('t.account_id = ?');
    params.push(filters.accountId);
  }

  if (filters.transactionType) {
    whereClauses.push('t.transaction_type = ?');
    params.push(filters.transactionType);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.date,
      t.description,
      t.amount,
      t.transaction_type,
      a.name AS account_name,
      c.name AS category_name,
      p.name AS payee_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.account_id
    LEFT JOIN categories c ON t.category_id = c.category_id
    LEFT JOIN payees p ON t.payee_id = p.payee_id
    ${whereSql}
    ORDER BY t.date, t.transaction_id
  `;

  const rows = db.prepare(sql).all(...params);
  return rows;
}

function buildCsv(rows: any[]): string {
  const headers = [
    'Date',
    'Account',
    'Payee',
    'Category',
    'Description',
    'Type',
    'Amount'
  ];

  const lines = rows.map((row) => {
    const values = [
      row.date ?? '',
      row.account_name ?? '',
      row.payee_name ?? '',
      row.category_name ?? '',
      row.description ?? '',
      row.transaction_type ?? '',
      row.amount ?? ''
    ];
    return values.map(csvEscape).join(',');
  });

  return [headers.join(','), ...lines].join('\n');
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
