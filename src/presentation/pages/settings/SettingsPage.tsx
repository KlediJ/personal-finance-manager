import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container,
  FormControlLabel,
  RadioGroup,
  Radio,
  Button,
  Stack
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CategoriesPage from '../categories/CategoriesPage';
import PayeesPage from '../payees/PayeesPage';

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
  const [envInfo, setEnvInfo] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'csv' | 'excel'>(() => {
    try {
      if (typeof window === 'undefined') return 'csv';
      const stored = window.localStorage.getItem('pfm.defaultExportFormat');
      return stored === 'excel' ? 'excel' : 'csv';
    } catch {
      return 'csv';
    }
  });

  useEffect(() => {
    const loadEnvironment = async () => {
      try {
        const electronAny = (window as any).electron;
        if (electronAny && typeof electronAny.getEnvironment === 'function') {
          const info = await electronAny.getEnvironment();
          setEnvInfo(info);
        }
      } catch (error) {
        console.error('Error loading environment info:', error);
      }
    };
    loadEnvironment();
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pfm.defaultExportFormat', defaultExportFormat);
      }
    } catch {
      // Ignore storage errors
    }
  }, [defaultExportFormat]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey(current => (current === key ? null : current));
      }, 1600);
    } catch {
      setCopiedKey(null);
    }
  };

  const websiteUrl = 'https://desktop-libri.com';
  const releasesUrl = 'https://github.com/KlediJ/personal-finance-manager/releases';
  const sourceUrl = 'https://github.com/KlediJ/personal-finance-manager';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Application
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Version: {envInfo?.version ?? 'Unknown'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Environment: {envInfo?.environment ?? 'Unknown'}
        </Typography>
        {envInfo?.dbPath && (
          <Typography variant="body2" color="text.secondary">
            Data location: {envInfo.dbPath}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          About Libri
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Libri is a private, local desktop finance tracker. Your data stays on this
          computer unless you choose to export it.
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Website
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {websiteUrl}
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => handleCopy('website', websiteUrl)}
              >
                {copiedKey === 'website' ? 'Copied' : 'Copy'}
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Releases
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {releasesUrl}
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => handleCopy('releases', releasesUrl)}
              >
                {copiedKey === 'releases' ? 'Copied' : 'Copy'}
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Source
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {sourceUrl}
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => handleCopy('source', sourceUrl)}
              >
                {copiedKey === 'source' ? 'Copied' : 'Copy'}
              </Button>
            </Stack>
          </Box>

          {envInfo?.dbPath && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Local data folder
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  {envInfo.dbPath}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleCopy('dbPath', envInfo.dbPath)}
                >
                  {copiedKey === 'dbPath' ? 'Copied' : 'Copy'}
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Windows may show a SmartScreen warning for new builds until reputation is
          established. Download Libri only from the official website or the GitHub
          releases page above.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Preferences
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Default export format
        </Typography>
        <RadioGroup
          row
          value={defaultExportFormat}
          onChange={(e) =>
            setDefaultExportFormat(e.target.value === 'excel' ? 'excel' : 'csv')
          }
        >
          <FormControlLabel value="csv" control={<Radio />} label="CSV" />
          <FormControlLabel value="excel" control={<Radio />} label="Excel (.xlsx)" />
        </RadioGroup>
        <Typography variant="caption" color="text.secondary">
          This is used as the default format in the ledger export dialog.
        </Typography>
      </Paper>
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
          <Tab icon={<PersonIcon />} label="Payees" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <GeneralSettings />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <CategoriesPage inSettingsPage={true} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <PayeesPage inSettingsPage={true} />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
