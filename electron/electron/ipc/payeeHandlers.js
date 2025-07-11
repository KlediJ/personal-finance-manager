"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPayeeHandlers = setupPayeeHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupPayeeHandlers() {
    console.log('Setting up payee handlers...');
    let payeeRepository;
    try {
        const databaseManager = DatabaseManager_1.DatabaseManager.getInstance();
        console.log('Database manager obtained successfully');
        payeeRepository = databaseManager.getPayeeRepository();
        console.log('Payee repository obtained successfully');
    }
    catch (error) {
        console.error('Failed to get payee repository:', error);
        throw error;
    }
    // Get all payees
    electron_1.ipcMain.handle('payees:getAll', async () => {
        try {
            return payeeRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all payees:', error);
            throw error;
        }
    });
    // Get payee by ID
    electron_1.ipcMain.handle('payees:getById', async (_, id) => {
        try {
            return payeeRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting payee ${id}:`, error);
            throw error;
        }
    });
    // Create payee
    electron_1.ipcMain.handle('payees:create', async (_, payee) => {
        try {
            console.log('Creating payee with data:', JSON.stringify(payee, null, 2));
            // Test database connection
            const testQuery = payeeRepository.getAll();
            console.log('Current payees in database:', testQuery.length);
            const id = payeeRepository.create(payee);
            console.log('Payee created successfully with ID:', id);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating payee:', error);
            console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Create payee if it doesn't exist
    electron_1.ipcMain.handle('payees:createIfNotExists', async (_, payee) => {
        try {
            console.log('Creating payee if not exists with data:', JSON.stringify(payee, null, 2));
            const result = payeeRepository.createIfNotExists(payee);
            console.log('Payee creation result:', result);
            return { ...result, success: true };
        }
        catch (error) {
            console.error('Error creating payee if not exists:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Find payee by name
    electron_1.ipcMain.handle('payees:findByName', async (_, name) => {
        try {
            const payee = payeeRepository.findByName(name);
            return { payee, success: true };
        }
        catch (error) {
            console.error('Error finding payee by name:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Update payee
    electron_1.ipcMain.handle('payees:update', async (_, id, payee) => {
        try {
            const success = payeeRepository.update(id, payee);
            return { success };
        }
        catch (error) {
            console.error(`Error updating payee ${id}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Delete payee
    electron_1.ipcMain.handle('payees:delete', async (_, id) => {
        try {
            const success = payeeRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting payee ${id}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Get enhanced payees (with transaction stats)
    electron_1.ipcMain.handle('payees:getEnhanced', async () => {
        try {
            // This would need to be implemented in the repository
            // For now, just return the basic payees
            return payeeRepository.getAll();
        }
        catch (error) {
            console.error('Error getting enhanced payees:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=payeeHandlers.js.map