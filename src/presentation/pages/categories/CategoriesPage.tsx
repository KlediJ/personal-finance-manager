import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  Snackbar,
  Alert,
  Tooltip,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import { Category, CategoryType } from '../../../data-storage/models/Category';
import CategoryFormDialog from './CategoryFormDialog';

interface CategoriesPageProps {
  inSettingsPage?: boolean;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ inSettingsPage = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const formatDependencyError = (message: string, entityLabel: string) => {
    if (message.toLowerCase().includes('foreign key')) {
      return `This ${entityLabel} is still referenced elsewhere and cannot be deleted yet.`;
    }

    return message;
  };

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await window.api.categories.getAll();
      setCategories(data);
      setSelectedCategories((prev) =>
        prev.filter((id) => data.some((category) => category.category_id === id))
      );
      
      // Load parent categories for the form
      const parents = await window.api.categories.getParents();
      setParentCategories(parents);
    } catch (error) {
      console.error('Error loading categories:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load categories from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Open form for creating a new category
  const handleAddCategory = () => {
    setCurrentCategory(null);
    setFormOpen(true);
  };

  // Open form for editing an existing category
  const handleEditCategory = (category: Category) => {
    setCurrentCategory(category);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (categoryId: number) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const handleToggleSelect = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(
        categories.map((category) => category.category_id!).filter((id) => !!id)
      );
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedCategories.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  // Delete category
  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        const result = await window.api.categories.delete(categoryToDelete);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Category deleted successfully',
            severity: 'success'
          });
          loadCategories();
        } else {
          setSnackbar({
            open: true,
            message: formatDependencyError(result.error || 'Failed to delete category', 'category'),
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        setSnackbar({
          open: true,
          message: 'An error occurred while deleting the category',
          severity: 'error'
        });
      }
    }
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedCategories.length === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }

    try {
      const result = await window.api.categories.bulkDelete(selectedCategories);
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Deleted ${result.deletedCount} categories`,
          severity: 'success'
        });
        setSelectedCategories([]);
        loadCategories();
      } else {
        setSnackbar({
          open: true,
          message:
            result.deletedCount > 0
              ? `Deleted ${result.deletedCount} categories, but some could not be removed. ${formatDependencyError(result.error || '', 'category')}`
              : formatDependencyError(result.error || 'Failed to delete selected categories', 'category'),
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error bulk deleting categories:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while deleting selected categories',
        severity: 'error'
      });
    }

    setBulkDeleteConfirmOpen(false);
  };

  // Save category (create or update)
  const handleSaveCategory = async (category: Category) => {
    try {
      if (category.category_id) {
        // Update existing category
        const result = await window.api.categories.update(category.category_id, category);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Category updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || 'Update failed');
        }
      } else {
        // Create new category
        const result = await window.api.categories.create(category);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Category created successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || 'Creation failed');
        }
      }
      
      // Refresh categories list
      loadCategories();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setSnackbar({
        open: true,
        message: `Failed to save category: ${formatDependencyError(error instanceof Error ? error.message : 'Unknown error', 'category')}`,
        severity: 'error'
      });
    }
  };

  // Get parent category name
  const getParentCategoryName = (parentId: number | null | undefined): string => {
    if (!parentId) return 'None';
    const parent = categories.find(c => c.category_id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  // Format category type for display
  const formatCategoryType = (type: CategoryType): string => {
    if (type === CategoryType.INCOME) return 'Income';
    if (type === CategoryType.TRANSFER) return 'Transfer';
    return 'Expense';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {!inSettingsPage && <Typography variant="h5">Categories</Typography>}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            disabled={selectedCategories.length === 0}
            onClick={handleBulkDeleteClick}
          >
            Delete Selected
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddCategory}
          >
            Add Category
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedCategories.length > 0 && selectedCategories.length < categories.length}
                    checked={categories.length > 0 && selectedCategories.length === categories.length}
                    onChange={handleToggleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Parent Category</TableCell>
                <TableCell>Icon</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 2 }}>
                      No categories found in database. Click 'Add Category' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.category_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedCategories.includes(category.category_id!)}
                        onChange={() => handleToggleSelect(category.category_id!)}
                      />
                    </TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={formatCategoryType(category.type)} 
                        color={category.type === CategoryType.INCOME ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getParentCategoryName(category.parent_category_id)}</TableCell>
                    <TableCell>
                      {category.icon ? (
                        <Tooltip title={category.icon}>
                          <CategoryIcon />
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditCategory(category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(category.category_id!)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Category Form Dialog */}
      <CategoryFormDialog
        open={formOpen}
        category={currentCategory}
        parentCategories={parentCategories}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveCategory}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Category
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this category? This action cannot be undone.
            Note that deleting a parent category will affect all its subcategories.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Multiple Categories
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete {selectedCategories.length} selected categories? This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setBulkDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleBulkDeleteConfirm}
            >
              Delete {selectedCategories.length} Categories
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CategoriesPage;
