import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormHelperText,
  SelectChangeEvent,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Payee, PayeeBusinessType, PayeeDetails } from '../../../data-storage/models/Payee';
import { Category } from '../../../data-storage/models/Category';

interface PayeeFormDialogProps {
  open: boolean;
  payee: Payee | null;
  categories: Category[];
  onClose: () => void;
  onSave: (payee: Payee) => void;
}

// Default new payee values
const defaultPayee: Payee = {
  name: '',
  default_category_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultPayeeDetails: PayeeDetails = {
  payee_id: 0,
  business_type: PayeeBusinessType.OTHER,
  website: '',
  phone: '',
  address: '',
  auto_categorization_rules: '',
  payment_methods: '',
  typical_amount_range: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const PayeeFormDialog: React.FC<PayeeFormDialogProps> = ({
  open,
  payee,
  categories,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Payee>(defaultPayee);
  const [formDetails, setFormDetails] = useState<PayeeDetails>(defaultPayeeDetails);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (payee) {
        setFormData(payee);
        setFormDetails(payee.details || defaultPayeeDetails);
      } else {
        setFormData(defaultPayee);
        setFormDetails(defaultPayeeDetails);
      }
      setErrors({});
    }
  }, [open, payee]);

  // Handle form field changes
  const handleChange = (field: keyof Payee) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const value = event.target.value;
    let processedValue: any = value === '' ? null : value;
    
    // Convert to number for category_id
    if (field === 'default_category_id' && processedValue !== null) {
      processedValue = parseInt(processedValue, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle details field changes
  const handleDetailsChange = (field: keyof PayeeDetails) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const value = event.target.value;
    setFormDetails(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Payee name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;

    // Prepare payee data with details
    const payeeData: Payee = {
      ...formData,
      details: formDetails.business_type || formDetails.website || formDetails.phone || formDetails.address
        ? formDetails
        : undefined,
      updated_at: new Date().toISOString()
    };

    onSave(payeeData);
  };

  // Format business type options
  const businessTypeOptions = Object.values(PayeeBusinessType).map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
  }));

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {payee ? 'Edit Payee' : 'Add New Payee'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Payee Name"
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Default Category</InputLabel>
              <Select
                value={formData.default_category_id?.toString() || ''}
                onChange={handleChange('default_category_id')}
                label="Default Category"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.category_id} value={category.category_id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                This category will be suggested when creating transactions with this payee
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* Additional Details */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Additional Details (Optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Business Type</InputLabel>
                      <Select
                        value={formDetails.business_type || ''}
                        onChange={handleDetailsChange('business_type')}
                        label="Business Type"
                      >
                        {businessTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={formDetails.website || ''}
                      onChange={handleDetailsChange('website')}
                      placeholder="https://example.com"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formDetails.phone || ''}
                      onChange={handleDetailsChange('phone')}
                      placeholder="(555) 123-4567"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Typical Amount Range"
                      value={formDetails.typical_amount_range || ''}
                      onChange={handleDetailsChange('typical_amount_range')}
                      placeholder="$50-$200"
                      helperText="Typical transaction amounts for this payee"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formDetails.address || ''}
                      onChange={handleDetailsChange('address')}
                      multiline
                      rows={2}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Payment Methods"
                      value={formDetails.payment_methods || ''}
                      onChange={handleDetailsChange('payment_methods')}
                      placeholder="Credit Card, Bank Transfer, Cash"
                      helperText="Comma-separated list of accepted payment methods"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
        >
          {payee ? 'Update' : 'Create'} Payee
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayeeFormDialog;