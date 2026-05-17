"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCategoryHandlers = setupCategoryHandlers;
const electron_1 = require("electron");
const DatabaseManager_1 = require("../../src/data-storage/database/DatabaseManager");
function setupCategoryHandlers() {
    const categoryRepository = DatabaseManager_1.DatabaseManager.getInstance().getCategoryRepository();
    // Get all categories
    electron_1.ipcMain.handle('categories:getAll', async () => {
        try {
            return categoryRepository.getAll();
        }
        catch (error) {
            console.error('Error getting all categories:', error);
            throw error;
        }
    });
    // Get category by ID
    electron_1.ipcMain.handle('categories:getById', async (_, id) => {
        try {
            return categoryRepository.getById(id);
        }
        catch (error) {
            console.error(`Error getting category ${id}:`, error);
            throw error;
        }
    });
    // Get categories by type
    electron_1.ipcMain.handle('categories:getByType', async (_, type) => {
        try {
            return categoryRepository.getCategoriesByType(type);
        }
        catch (error) {
            console.error(`Error getting categories of type ${type}:`, error);
            throw error;
        }
    });
    // Get parent categories
    electron_1.ipcMain.handle('categories:getParents', async () => {
        try {
            return categoryRepository.getParentCategories();
        }
        catch (error) {
            console.error('Error getting parent categories:', error);
            throw error;
        }
    });
    // Get subcategories
    electron_1.ipcMain.handle('categories:getSubcategories', async (_, parentId) => {
        try {
            return categoryRepository.getSubcategories(parentId);
        }
        catch (error) {
            console.error(`Error getting subcategories for parent ${parentId}:`, error);
            throw error;
        }
    });
    // Get category hierarchy
    electron_1.ipcMain.handle('categories:getHierarchy', async () => {
        try {
            return categoryRepository.getCategoryHierarchy();
        }
        catch (error) {
            console.error('Error getting category hierarchy:', error);
            throw error;
        }
    });
    // Create category
    electron_1.ipcMain.handle('categories:create', async (_, category) => {
        try {
            const id = categoryRepository.create(category);
            return { id, success: true };
        }
        catch (error) {
            console.error('Error creating category:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Update category
    electron_1.ipcMain.handle('categories:update', async (_, id, category) => {
        try {
            const success = categoryRepository.update(id, category);
            return { success };
        }
        catch (error) {
            console.error(`Error updating category ${id}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Delete category
    electron_1.ipcMain.handle('categories:delete', async (_, id) => {
        try {
            const success = categoryRepository.delete(id);
            return { success };
        }
        catch (error) {
            console.error(`Error deleting category ${id}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Bulk delete categories by IDs
    electron_1.ipcMain.handle('categories:bulkDelete', async (_, ids) => {
        let deletedCount = 0;
        const errors = [];
        for (const id of ids) {
            if (!id)
                continue;
            try {
                const success = categoryRepository.delete(id);
                if (success) {
                    deletedCount++;
                }
            }
            catch (error) {
                console.error(`Error bulk deleting category ${id}:`, error);
                errors.push(error instanceof Error ? error.message : `Failed to delete category ${id}`);
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
}
