import { Workbook, Worksheet, Cell, Row } from 'exceljs';
import { Transaction, TransactionType, TransactionStatus } from '../../data-storage/models/Transaction';
import { Account } from '../../data-storage/models/Account';

/**
 * Handles Excel file parsing, validation, and transformation for imports and exports
 */
export class ExcelProcessor {
  /**
   * Parse an Excel file into a structured format
   * 
   * @param workbook The ExcelJS workbook
   * @returns The structured sheet data with headers and rows
   */
  static parseWorkbook(workbook: Workbook): {
    sheets: Array<{
      name: string;
      headers: string[];
      data: any[];
    }>;
  } {
    const result: {
      sheets: Array<{
        name: string;
        headers: string[];
        data: any[];
      }>;
    } = { sheets: [] };
    
    // Process each worksheet
    workbook.eachSheet((worksheet, sheetId) => {
      // Extract headers from the first row
      const headers: string[] = [];
      const firstRow = worksheet.getRow(1);
      
      firstRow.eachCell((cell, colNumber) => {
        // Convert to string to ensure we have a valid header
        let header = ExcelProcessor.getCellValue(cell);
        
        // If header is empty or not a string, use a generic name
        if (header === null || header === undefined) {
          header = `Column${colNumber}`;
        } else if (typeof header !== 'string') {
          header = String(header);
        }
        
        headers[colNumber - 1] = header;
      });
      
      const data: any[] = [];
      
      // Process each data row
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          const rowData = ExcelProcessor.processRow(row, headers);
          data.push(rowData);
        }
      });
      
      result.sheets.push({
        name: worksheet.name,
        headers,
        data
      });
    });
    
    return result;
  }
  
  /**
   * Process a row and extract cell values
   * 
   * @param row The Excel row
   * @param headers The headers for mapping
   * @returns The row data as an object
   */
  private static processRow(row: Row, headers: string[]): Record<string, any> {
    const rowData: Record<string, any> = {};
    
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = ExcelProcessor.getCellValue(cell);
      }
    });
    
    return rowData;
  }
  
  /**
   * Extract a usable value from an Excel cell
   * 
   * @param cell The Excel cell
   * @returns The cell value in the appropriate type
   */
  private static getCellValue(cell: Cell): any {
    // Handle different cell types
    switch (cell.type) {
      case 2: // Number
        return cell.value;
      case 3: // String
        return cell.value;
      case 4: // Boolean
        return cell.value;
      case 5: // Formula
        return cell.value; // This will be the calculated result
      case 6: // Hyperlink
        return cell.value; // Just get the display text
      case 7: // Date
        return cell.value; // This should be a JavaScript Date
      default:
        return cell.value;
    }
  }
  
  /**
   * Create a formatted Excel workbook for transaction export
   * 
   * @param transactions The transactions to export
   * @returns The formatted ExcelJS workbook
   */
  static createTransactionWorkbook(transactions: any[]): Workbook {
    const workbook = new Workbook();
    workbook.creator = 'Personal Finance Manager';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add properties that are safe
    workbook.properties.date1904 = false;
    // Use type assertion for custom properties
    (workbook.properties as any).title = 'Transaction Export';
    (workbook.properties as any).subject = 'Personal Finance Manager Export';
    
    // Create transactions worksheet
    const worksheet = workbook.addWorksheet('Transactions');
    
    // Define columns with styling
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Account', key: 'account', width: 20 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.height = 20;
    
    // Add light gray fill to header
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Center align headers
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
    
    // Add transaction rows
    transactions.forEach(t => {
      const row = worksheet.addRow({
        date: t.date,
        account: t.account_name || `Account ${t.account_id}`,
        description: t.description || '',
        category: t.category_name || '',
        amount: t.amount,
        type: t.transaction_type,
        status: t.status
      });
      
      // Style amount cells based on transaction type
      const amountCell = row.getCell('amount');
      amountCell.numFmt = '$#,##0.00;[Red]-$#,##0.00';
      
      if (t.transaction_type === 'expense') {
        amountCell.font = { color: { argb: 'FFFF0000' } }; // Red for expenses
      } else if (t.transaction_type === 'income') {
        amountCell.font = { color: { argb: 'FF008000' } }; // Green for income
      }
      
      // Right-align amount column
      amountCell.alignment = { horizontal: 'right' };
    });
    
    // Add summary at the bottom
    worksheet.addRow([]); // Empty row for spacing
    
    const summaryRow = worksheet.addRow(['Summary']);
    summaryRow.font = { bold: true };
    worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 4);
    
    // Calculate totals by type
    const totalIncome = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const netAmount = totalIncome + totalExpense;
    
    // Add total rows
    worksheet.addRow(['Total Income', '', '', '', totalIncome]);
    worksheet.addRow(['Total Expenses', '', '', '', totalExpense]);
    
    const netRow = worksheet.addRow(['Net Amount', '', '', '', netAmount]);
    const netAmountCell = netRow.getCell(5);
    netAmountCell.font = { bold: true };
    netAmountCell.numFmt = '$#,##0.00;[Red]-$#,##0.00';
    
    if (netAmount < 0) {
      netAmountCell.font = { bold: true, color: { argb: 'FFFF0000' } };
    } else {
      netAmountCell.font = { bold: true, color: { argb: 'FF008000' } };
    }
    
    // Add auto-filter to header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 7 }
    };
    
    // Freeze the header row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }
    ];
    
    return workbook;
  }
  
  /**
   * Create a summary sheet with charts and aggregates
   * 
   * @param workbook The ExcelJS workbook to add the summary to
   * @param transactions The transactions data
   */
  static addSummarySheet(workbook: Workbook, transactions: any[]): void {
    // Create summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add title
    const titleRow = summarySheet.addRow(['Transaction Summary']);
    titleRow.font = { size: 16, bold: true };
    summarySheet.mergeCells(titleRow.number, 1, titleRow.number, 5);
    
    // Add generated date
    summarySheet.addRow(['Generated on:', new Date().toLocaleDateString()]);
    
    summarySheet.addRow([]); // Spacing
    
    // Calculate summary statistics
    const totalTransactions = transactions.length;
    const totalIncome = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
    const netAmount = totalIncome - totalExpense;
    
    // Add summary statistics
    summarySheet.addRow(['Total Transactions:', totalTransactions]);
    summarySheet.addRow(['Total Income:', totalIncome]);
    summarySheet.addRow(['Total Expenses:', totalExpense]);
    summarySheet.addRow(['Net Amount:', netAmount]);
    
    // Style amount cells
    for (let i = 4; i <= 7; i++) {
      const cell = summarySheet.getCell(`B${i}`);
      cell.numFmt = '$#,##0.00';
    }
    
    // Add transactions by category data
    summarySheet.addRow([]); // Spacing
    
    const categoryHeader = summarySheet.addRow(['Transactions by Category']);
    categoryHeader.font = { size: 14, bold: true };
    summarySheet.mergeCells(categoryHeader.number, 1, categoryHeader.number, 5);
    
    // Add category headers
    const categoryRow = summarySheet.addRow(['Category', 'Income', 'Expenses', 'Net', 'Count']);
    categoryRow.font = { bold: true };
    
    // Group transactions by category
    const categoryData: Record<string, {
      income: number;
      expense: number;
      net: number;
      count: number;
    }> = {};
    
    transactions.forEach(t => {
      const category = t.category_name || 'Uncategorized';
      
      if (!categoryData[category]) {
        categoryData[category] = {
          income: 0,
          expense: 0,
          net: 0,
          count: 0
        };
      }
      
      if (t.transaction_type === 'income') {
        categoryData[category].income += t.amount;
      } else if (t.transaction_type === 'expense') {
        categoryData[category].expense += Math.abs(t.amount);
      }
      
      categoryData[category].count++;
    });
    
    // Calculate net for each category
    Object.keys(categoryData).forEach(category => {
      categoryData[category].net = 
        categoryData[category].income - categoryData[category].expense;
    });
    
    // Add category rows
    Object.entries(categoryData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, data]) => {
        summarySheet.addRow([
          category,
          data.income,
          data.expense,
          data.net,
          data.count
        ]);
      });
    
    // Format the category table
    const categoryDataStartRow = categoryRow.number + 1;
    const categoryDataEndRow = categoryDataStartRow + Object.keys(categoryData).length - 1;
    
    // Format currency cells
    for (let row = categoryDataStartRow; row <= categoryDataEndRow; row++) {
      for (let col = 2; col <= 4; col++) {
        const cell = summarySheet.getCell(row, col);
        cell.numFmt = '$#,##0.00';
      }
    }
    
    // Set column widths
    summarySheet.columns = [
      { width: 20 }, // Category
      { width: 12 }, // Income
      { width: 12 }, // Expenses
      { width: 12 }, // Net
      { width: 8 }   // Count
    ];
  }
}
