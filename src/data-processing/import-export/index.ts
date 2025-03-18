export * from './CsvProcessor';
export * from './ExcelProcessor';

/**
 * Utility functions for import/export operations
 */
export const ImportExportUtils = {
  /**
   * Detect file type based on extension
   * 
   * @param filePath The file path
   * @returns The detected file type or null if not supported
   */
  detectFileType(filePath: string): 'csv' | 'excel' | null {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return 'csv';
    } else if (['xlsx', 'xls', 'xlsm'].includes(extension || '')) {
      return 'excel';
    }
    
    return null;
  },
  
  /**
   * Extract filename from a path
   * 
   * @param filePath The full file path
   * @returns The extracted filename
   */
  getFileName(filePath: string): string {
    return filePath.split(/[\/\\]/).pop() || 'file';
  },
  
  /**
   * Ensure a file has the correct extension
   * 
   * @param filePath The file path
   * @param fileType The expected file type
   * @returns The file path with the correct extension
   */
  ensureFileExtension(filePath: string, fileType: 'csv' | 'excel'): string {
    // Remove any existing extension
    let cleanPath = filePath.replace(/\.[^.]+$/, '');
    
    // Add the correct extension
    if (fileType === 'csv') {
      return `${cleanPath}.csv`;
    } else if (fileType === 'excel') {
      return `${cleanPath}.xlsx`;
    }
    
    return filePath;
  },
  
  /**
   * Generate a default export filename
   * 
   * @param prefix Optional prefix for the filename
   * @param fileType The export file type
   * @returns A formatted filename
   */
  generateExportFilename(prefix: string = 'transactions', fileType: 'csv' | 'excel'): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    
    if (fileType === 'csv') {
      return `${prefix}_${dateStr}.csv`;
    } else if (fileType === 'excel') {
      return `${prefix}_${dateStr}.xlsx`;
    }
    
    return `${prefix}_${dateStr}`;
  }
};
