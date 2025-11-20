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
  IconButton
} from '@mui/material';
import { Category, CategoryType } from '../../../data-storage/models/Category';
import { CategorySubtype, categorySubtypeLabels, categorySubtypeGroups } from '../../../data-storage/models/CategorySubtype';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';

interface CategoryFormDialogProps {
  open: boolean;
  category: Category | null;
  parentCategories: Category[];
  onClose: () => void;
  onSave: (category: Category) => void;
}

// Default new category values
const defaultCategory: Category = {
  name: '',
  type: CategoryType.EXPENSE,
  parent_category_id: null,
  icon: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// A selection of common category icons
const categoryIcons = [
  null, // No icon option
  'home',
  'restaurant',
  'shopping_cart',
  'directions_car',
  'local_hospital',
  'school',
  'flight',
  'fitness_center',
  'account_balance',
  'attach_money',
  'credit_card',
  'local_grocery_store',
  'pets',
  'power'
];

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  category,
  parentCategories,
  onClose,
  onSave
}) => {
  const [formValues, setFormValues] = useState<Category>(defaultCategory);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedSubtype, setSelectedSubtype] = useState<CategorySubtype | ''>('');

  // Update form when editing an existing category
  useEffect(() => {
    if (category) {
      setFormValues(category);
      setSelectedSubtype(''); // Reset subtype when editing
    } else {
      setFormValues(defaultCategory);
      setSelectedSubtype('');
    }
    setErrors({});
  }, [category, open]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  // Handle select changes (for dropdown menus)
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    
    // Handle special case for category type
    if (name === 'type') {
      // Reset subtype when type changes
      setSelectedSubtype('');
      // Reset parent category when type changes
      setFormValues({ 
        ...formValues, 
        [name]: value as CategoryType,
        parent_category_id: null
      });
    } else if (name === 'parent_category_id') {
      // Handle null value for parent_category_id
      setFormValues({
        ...formValues,
        [name]: value === 'null' ? null : Number(value)
      });
    } else {
      setFormValues({ ...formValues, [name]: value });
    }
  };

  // Handle subtype selection
  const handleSubtypeChange = (e: SelectChangeEvent) => {
    const subtype = e.target.value as CategorySubtype | '';
    setSelectedSubtype(subtype);
    
    if (subtype) {
      // Auto-fill the name field with the subtype label
      setFormValues({
        ...formValues,
        name: categorySubtypeLabels[subtype as CategorySubtype]
      });
    }
  };

  // Handle icon selection
  const handleIconSelect = (icon: string | null) => {
    setFormValues({ ...formValues, icon });
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formValues.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formValues);
    }
  };

  // Filter parent categories based on selected type
  const filteredParentCategories = parentCategories.filter(
    pc => pc.type === formValues.type && (!category?.category_id || pc.category_id !== category.category_id)
  );

  // Get available subtypes based on selected category type
  const availableSubtypes = formValues.type === CategoryType.INCOME
    ? categorySubtypeGroups.income
    : formValues.type === CategoryType.EXPENSE
      ? categorySubtypeGroups.expense
      : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {category ? 'Edit Category' : 'Create New Category'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Category Type</InputLabel>
              <Select
                name="type"
                value={formValues.type}
                onChange={handleSelectChange}
                label="Category Type"
              >
                <MenuItem value={CategoryType.INCOME}>Income</MenuItem>
                <MenuItem value={CategoryType.EXPENSE}>Expense</MenuItem>
                <MenuItem value={CategoryType.TRANSFER}>Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Predefined Categories</InputLabel>
              <Select
                value={selectedSubtype}
                onChange={handleSubtypeChange}
                label="Predefined Categories"
              >
                <MenuItem value=""><em>Custom Category</em></MenuItem>
                {availableSubtypes.map(subtype => (
                  <MenuItem key={subtype} value={subtype}>
                    {categorySubtypeLabels[subtype]}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select a predefined category or create a custom one
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Category Name"
              fullWidth
              required
              value={formValues.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Parent Category</InputLabel>
              <Select
                name="parent_category_id"
                value={formValues.parent_category_id === null ? 'null' : formValues.parent_category_id?.toString() || 'null'}
                onChange={handleSelectChange}
                label="Parent Category"
              >
                <MenuItem value="null"><em>No Parent (Top-Level Category)</em></MenuItem>
                {filteredParentCategories.map(pc => (
                  <MenuItem key={pc.category_id} value={pc.category_id?.toString()}>
                    {pc.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Optional: Make this a subcategory of an existing category
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Icon</InputLabel>
              <Select
                name="icon"
                value={formValues.icon || ''}
                onChange={handleSelectChange}
                label="Icon"
                renderValue={(selected) => selected ? `Icon: ${selected}` : 'No Icon'}
              >
                <MenuItem value=""><em>No Icon</em></MenuItem>
                {categoryIcons.filter(icon => icon !== null).map(icon => (
                  <MenuItem key={icon} value={icon}>
                    {icon}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Optional: Choose an icon for visual recognition
              </FormHelperText>
            </FormControl>
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryFormDialog;
