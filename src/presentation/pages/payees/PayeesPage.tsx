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
  Tooltip
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
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load payees and categories
  const loadPayees = async () => {
    try {
      setLoading(true);
      console.log('=== LOADING PAYEES DEBUG ===');
      console.log('1. About to fetch payees from database...');
      
      // Test basic connectivity
      console.log('2. Testing API connectivity...');
      const testResult = await window.api.categories.getAll();
      console.log('3. Categories loaded successfully:', testResult?.length || 0, 'categories');
      
      const data = await window.api.payees?.getAll();
      console.log('4. Received payees:', data);
      console.log('5. Payees count:', data?.length || 0);
      setPayees(data || []);
      
      // Load categories for the form
      setCategories(testResult);
    } catch (error) {
      console.error('Error loading payees:', error);
      console.error('Full error details:', error instanceof Error ? error.message : 'Unknown error');
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

  // Delete payee
  const handleDeleteConfirm = async () => {
    if (payeeToDelete) {
      try {
        console.log('Deleting payee:', payeeToDelete);
        const result = await window.api.payees?.delete(payeeToDelete);
        if (result?.success) {
          setSnackbar({
            open: true,
            message: 'Payee deleted successfully',
            severity: 'success'
          });
          loadPayees();
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to delete payee',
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

  // Save payee (create or update)
  const handleSavePayee = async (payee: Payee) => {
    try {
      if (payee.payee_id) {
        // Update existing payee
        console.log('Updating payee:', payee);
        const result = await window.api.payees?.update(payee.payee_id, payee);
        console.log('Update result:', result);
        if (result?.success) {
          setSnackbar({
            open: true,
            message: 'Payee updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error(result?.error || 'Update failed');
        }
      } else {
        // Create new payee
        console.log('=== PAYEE CREATION DEBUG ===');
        console.log('1. Original payee data:', JSON.stringify(payee, null, 2));
        console.log('2. Payee data types:', {
          name: typeof payee.name,
          default_category_id: typeof payee.default_category_id,
          details: typeof payee.details
        });
        console.log('3. Payee data validation:', {
          hasName: !!payee.name,
          nameLength: payee.name?.length,
          hasValidCategoryId: payee.default_category_id === null || (typeof payee.default_category_id === 'number' && payee.default_category_id > 0)
        });
        
        try {
          console.log('4. About to make API call...');
          
          if (!window.api) {
            throw new Error('window.api is not available');
          }
          
          if (!window.api.payees) {
            throw new Error('window.api.payees is not available');
          }
          
          console.log('5. API and payees endpoint available, making call...');
          const result = await window.api.payees.create(payee);
          console.log('6. API call completed, result:', JSON.stringify(result, null, 2));
          
          if (result?.success) {
            console.log('7. Success - payee created with ID:', result.id);
            setSnackbar({
              open: true,
              message: 'Payee created successfully',
              severity: 'success'
            });
          } else {
            console.log('8. Failure - result indicates failure:', result);
            throw new Error(result?.error || 'Creation failed');
          }
        } catch (apiError) {
          console.log('9. API call threw error:', apiError);
          console.log('10. Error type:', typeof apiError);
          console.log('11. Error message:', apiError instanceof Error ? apiError.message : 'No message');
          console.log('12. Error stack:', apiError instanceof Error ? apiError.stack : 'No stack');
          throw apiError;
        }
      }
      
      // Refresh payees list
      loadPayees();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving payee:', error);
      setSnackbar({
        open: true,
        message: `Failed to save payee: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddPayee}
        >
          Add Payee
        </Button>
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
                  <TableCell colSpan={5} align="center">
                    <Typography sx={{ py: 2 }}>
                      No payees found in database. Click 'Add Payee' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payees.map((payee) => (
                  <TableRow key={payee.payee_id}>
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