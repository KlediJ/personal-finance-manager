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
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { Payee, PayeeBusinessType } from '../../../data-storage/models/Payee';
import { Category } from '../../../data-storage/models/Category';
import PayeeFormDialog from './PayeeFormDialog';

interface PayeesPageProps {
  inSettingsPage?: boolean;
}

const PayeesPage: React.FC<PayeesPageProps> = ({ inSettingsPage = false }) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [currentPayee, setCurrentPayee] = useState<Payee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payeeToDelete, setPayeeToDelete] = useState<number | null>(null);
  const [selectedPayees, setSelectedPayees] = useState<number[]>([]);
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

  // Load payees and categories
  const loadPayees = async () => {
    try {
      setLoading(true);
      const [categoryData, payeeData] = await Promise.all([
        window.api.categories.getAll(),
        window.api.payees.getEnhanced()
      ]);
      setCategories(categoryData);
      setPayees(payeeData || []);
      setSelectedPayees((prev) =>
        prev.filter((id) => payeeData.some((payee) => payee.payee_id === id))
      );
    } catch (error) {
      console.error('Error loading payees:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load payees from database',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayees();
  }, []);

  // Open form for creating a new payee
  const handleAddPayee = () => {
    setCurrentPayee(null);
    setFormOpen(true);
  };

  // Open form for editing an existing payee
  const handleEditPayee = (payee: Payee) => {
    setCurrentPayee(payee);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (payeeId: number) => {
    setPayeeToDelete(payeeId);
    setDeleteDialogOpen(true);
  };

  // Toggle selection for bulk actions
  const handleToggleSelect = (payeeId: number) => {
    setSelectedPayees(prev => 
      prev.includes(payeeId) ? prev.filter(id => id !== payeeId) : [...prev, payeeId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedPayees.length === payees.length) {
      setSelectedPayees([]);
    } else {
      setSelectedPayees(payees.map(p => p.payee_id!).filter(id => !!id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedPayees.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  // Delete payee
  const handleDeleteConfirm = async () => {
    if (payeeToDelete) {
      try {
        const result = await window.api.payees.delete(payeeToDelete);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Payee deleted successfully',
            severity: 'success'
          });
          loadPayees();
        } else {
          setSnackbar({
            open: true,
            message: formatDependencyError(result.error || 'Failed to delete payee', 'payee'),
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting payee:', error);
        setSnackbar({
          open: true,
          message: 'An error occurred while deleting the payee',
          severity: 'error'
        });
      }
    }
    setDeleteDialogOpen(false);
    setPayeeToDelete(null);
  };

  // Bulk delete selected payees
  const handleBulkDeleteConfirm = async () => {
    if (selectedPayees.length === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }

    try {
      const result = await window.api.payees.bulkDelete(selectedPayees);
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Deleted ${result.deletedCount} payees`,
          severity: 'success'
        });
        setSelectedPayees([]);
        loadPayees();
      } else {
        setSnackbar({
          open: true,
          message:
            result.deletedCount > 0
              ? `Deleted ${result.deletedCount} payees, but some could not be removed. ${formatDependencyError(result.error || '', 'payee')}`
              : formatDependencyError(result.error || 'Failed to delete selected payees', 'payee'),
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error bulk deleting payees:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while deleting selected payees',
        severity: 'error'
      });
    }

    setBulkDeleteConfirmOpen(false);
  };

  // Save payee (create or update)
  const handleSavePayee = async (payee: Payee) => {
    try {
      if (payee.payee_id) {
        // Update existing payee
        const result = await window.api.payees.update(payee.payee_id, payee);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Payee updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || 'Update failed');
        }
      } else {
        // Create new payee
        const result = await window.api.payees.create(payee);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Payee created successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || 'Creation failed');
        }
      }
      
      // Refresh payees list
      loadPayees();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving payee:', error);
      setSnackbar({
        open: true,
        message: `Failed to save payee: ${formatDependencyError(error instanceof Error ? error.message : 'Unknown error', 'payee')}`,
        severity: 'error'
      });
    }
  };

  // Get default category name
  const getDefaultCategoryName = (categoryId: number | null | undefined): string => {
    if (!categoryId) return 'None';
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Format business type for display
  const formatBusinessType = (type: PayeeBusinessType | undefined): string => {
    if (!type) return 'Other';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  // Get business type icon
  const getBusinessTypeIcon = (type: PayeeBusinessType | undefined) => {
    if (!type || type === PayeeBusinessType.OTHER) return <PersonIcon />;
    return <BusinessIcon />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {!inSettingsPage && <Typography variant="h5">Payees</Typography>}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            disabled={selectedPayees.length === 0}
            onClick={handleBulkDeleteClick}
          >
            Delete Selected
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddPayee}
          >
            Add Payee
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
                    indeterminate={selectedPayees.length > 0 && selectedPayees.length < payees.length}
                    checked={payees.length > 0 && selectedPayees.length === payees.length}
                    onChange={handleToggleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Business Type</TableCell>
                <TableCell>Default Category</TableCell>
                <TableCell>Transaction Count</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 2 }}>
                      No payees found in database. Click 'Add Payee' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payees.map((payee) => (
                  <TableRow key={payee.payee_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedPayees.includes(payee.payee_id!)}
                        onChange={() => handleToggleSelect(payee.payee_id!)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title={formatBusinessType(payee.details?.business_type)}>
                          {getBusinessTypeIcon(payee.details?.business_type)}
                        </Tooltip>
                        {payee.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={formatBusinessType(payee.details?.business_type)} 
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{getDefaultCategoryName(payee.default_category_id)}</TableCell>
                    <TableCell>{payee.transaction_count || 0}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditPayee(payee)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(payee.payee_id!)}
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

      {/* Payee Form Dialog */}
      <PayeeFormDialog
        open={formOpen}
        payee={currentPayee}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSave={handleSavePayee}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Payee
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this payee? This action cannot be undone.
            Note that existing transactions will keep their payee reference.
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Delete Multiple Payees
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete {selectedPayees.length} selected payees? This action cannot be undone.
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
              Delete {selectedPayees.length} Payees
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

export default PayeesPage;
