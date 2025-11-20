import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Payee } from '../../src/data-storage/models/Payee';

export function setupPayeeHandlers(): void {
  console.log('Setting up payee handlers...');
  
  let payeeRepository;
  try {
    const databaseManager = DatabaseManager.getInstance();
    console.log('Database manager obtained successfully');
    
    payeeRepository = databaseManager.getPayeeRepository();
    console.log('Payee repository obtained successfully');
  } catch (error) {
    console.error('Failed to get payee repository:', error);
    throw error;
  }

  // Get all payees
  ipcMain.handle('payees:getAll', async () => {
    try {
      return payeeRepository.getAll();
    } catch (error) {
      console.error('Error getting all payees:', error);
      throw error;
    }
  });

  // Get payee by ID
  ipcMain.handle('payees:getById', async (_, id: number) => {
    try {
      return payeeRepository.getById(id);
    } catch (error) {
      console.error(`Error getting payee ${id}:`, error);
      throw error;
    }
  });

  // Create payee
  ipcMain.handle('payees:create', async (_, payee: Payee) => {
    try {
      console.log('Creating payee with data:', JSON.stringify(payee, null, 2));
      
      // Test database connection
      const testQuery = payeeRepository.getAll();
      console.log('Current payees in database:', testQuery.length);
      
      const id = payeeRepository.create(payee);
      console.log('Payee created successfully with ID:', id);
      
      return { id, success: true };
    } catch (error) {
      console.error('Error creating payee:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create payee if it doesn't exist
  ipcMain.handle('payees:createIfNotExists', async (_, payee: Payee) => {
    try {
      console.log('Creating payee if not exists with data:', JSON.stringify(payee, null, 2));
      
      const result = payeeRepository.createIfNotExists(payee);
      console.log('Payee creation result:', result);
      
      return { ...result, success: true };
    } catch (error) {
      console.error('Error creating payee if not exists:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Find payee by name
  ipcMain.handle('payees:findByName', async (_, name: string) => {
    try {
      const payee = payeeRepository.findByName(name);
      return { payee, success: true };
    } catch (error) {
      console.error('Error finding payee by name:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Update payee
  ipcMain.handle('payees:update', async (_, id: number, payee: Payee) => {
    try {
      const success = payeeRepository.update(id, payee);
      return { success };
    } catch (error) {
      console.error(`Error updating payee ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete payee
  ipcMain.handle('payees:delete', async (_, id: number) => {
    try {
      const success = payeeRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting payee ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Bulk delete payees by IDs
  ipcMain.handle('payees:bulkDelete', async (_, ids: number[]) => {
    try {
      let deletedCount = 0;
      for (const id of ids) {
        if (!id) continue;
        const success = payeeRepository.delete(id);
        if (success) {
          deletedCount++;
        }
      }
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error bulk deleting payees:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get enhanced payees (with transaction stats)
  ipcMain.handle('payees:getEnhanced', async () => {
    try {
      // This would need to be implemented in the repository
      // For now, just return the basic payees
      return payeeRepository.getAll();
    } catch (error) {
      console.error('Error getting enhanced payees:', error);
      throw error;
    }
  });
}
