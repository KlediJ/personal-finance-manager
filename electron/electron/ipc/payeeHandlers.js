"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPayeeHandlers = setupPayeeHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupPayeeHandlers() {
    let payeeRepository;
    try {
        const databaseManager = DatabaseManager_1.DatabaseManager.getInstance();
        payeeRepository = databaseManager.getPayeeRepository();
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
            const id = payeeRepository.create(payee);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating payee:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Create payee if it doesn't exist
    electron_1.ipcMain.handle('payees:createIfNotExists', async (_, payee) => {
        try {
            const result = payeeRepository.createIfNotExists(payee);
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
    // Bulk delete payees by IDs
    electron_1.ipcMain.handle('payees:bulkDelete', async (_, ids) => {
        let deletedCount = 0;
        const errors = [];
        for (const id of ids) {
            if (!id)
                continue;
            try {
                const success = payeeRepository.delete(id);
                if (success) {
                    deletedCount++;
                }
            }
            catch (error) {
                console.error(`Error bulk deleting payee ${id}:`, error);
                errors.push(error instanceof Error ? error.message : `Failed to delete payee ${id}`);
            }
        }
        if (errors.length > 0) {
            return {
                success: false,
                deletedCount,
                error: errors[0]
            };
        }
        return { success: true, deletedCount };
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
