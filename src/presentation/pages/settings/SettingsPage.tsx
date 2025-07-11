import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import CategoriesPage from '../categories/CategoriesPage';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component to render the content for each tab
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// General settings content
const GeneralSettings = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>
      <Typography variant="body1">
        Settings content will go here. Options for application preferences, theme, etc.
      </Typography>
    </Box>
  );
};

// The main settings page component
const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" sx={{ mb: 3 }}>Settings</Typography>
      
      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="settings tabs"
        >
          <Tab icon={<SettingsIcon />} label="General" />
          <Tab icon={<CategoryIcon />} label="Categories" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <GeneralSettings />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <CategoriesPage inSettingsPage={true} />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
