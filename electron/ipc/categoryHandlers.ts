import { ipcMain } from 'electron';
import { DatabaseManager } from '../../src/data-storage/database/DatabaseManager';
import { Category, CategoryType } from '../../src/data-storage/models/Category';

export function setupCategoryHandlers(): void {
  const categoryRepository = DatabaseManager.getInstance().getCategoryRepository();

  // Get all categories
  ipcMain.handle('categories:getAll', async () => {
    try {
      return categoryRepository.getAll();
    } catch (error) {
      console.error('Error getting all categories:', error);
      throw error;
    }
  });

  // Get category by ID
  ipcMain.handle('categories:getById', async (_, id: number) => {
    try {
      return categoryRepository.getById(id);
    } catch (error) {
      console.error(`Error getting category ${id}:`, error);
      throw error;
    }
  });

  // Get categories by type
  ipcMain.handle('categories:getByType', async (_, type: CategoryType) => {
    try {
      return categoryRepository.getCategoriesByType(type);
    } catch (error) {
      console.error(`Error getting categories of type ${type}:`, error);
      throw error;
    }
  });

  // Get parent categories
  ipcMain.handle('categories:getParents', async () => {
    try {
      return categoryRepository.getParentCategories();
    } catch (error) {
      console.error('Error getting parent categories:', error);
      throw error;
    }
  });

  // Get subcategories
  ipcMain.handle('categories:getSubcategories', async (_, parentId: number) => {
    try {
      return categoryRepository.getSubcategories(parentId);
    } catch (error) {
      console.error(`Error getting subcategories for parent ${parentId}:`, error);
      throw error;
    }
  });

  // Get category hierarchy
  ipcMain.handle('categories:getHierarchy', async () => {
    try {
      return categoryRepository.getCategoryHierarchy();
    } catch (error) {
      console.error('Error getting category hierarchy:', error);
      throw error;
    }
  });

  // Create category
  ipcMain.handle('categories:create', async (_, category: Category) => {
    try {
      const id = categoryRepository.create(category);
      return { id, success: true };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Update category
  ipcMain.handle('categories:update', async (_, id: number, category: Category) => {
    try {
      const success = categoryRepository.update(id, category);
      return { success };
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete category
  ipcMain.handle('categories:delete', async (_, id: number) => {
    try {
      const success = categoryRepository.delete(id);
      return { success };
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Bulk delete categories by IDs
  ipcMain.handle('categories:bulkDelete', async (_, ids: number[]) => {
    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      if (!id) continue;

      try {
        const success = categoryRepository.delete(id);
        if (success) {
          deletedCount++;
        }
      } catch (error) {
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
