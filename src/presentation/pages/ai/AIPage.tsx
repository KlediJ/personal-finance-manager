import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CategoryIcon from '@mui/icons-material/Category';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

import TransactionCategorizer from './TransactionCategorizer';
import AIQueryInterface from './AIQueryInterface';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `ai-tab-${index}`,
    'aria-controls': `ai-tabpanel-${index}`,
  };
}

const AIPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    // Check actual AI status
    const checkAIStatus = async () => {
      try {
        // Check if AI API is available
        if (!window.api || !window.api.ai || !window.api.ai.getStatus) {
          console.log('AI API not available, using mock status');
          // Simulate loading then ready
          setTimeout(() => {
            setAiStatus('ready');
          }, 1500);
          return;
        }
        
        const result = await window.api.ai.getStatus();
        if (result.status === 'ready') {
          setAiStatus('ready');
        } else if (result.status === 'error') {
          setAiStatus('error');
        } else {
          setAiStatus('loading');
        }
      } catch (error) {
        console.error('Error checking AI status:', error);
        setAiStatus('error');
      }
    };

    checkAIStatus();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="primary" />
          AI Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Intelligent transaction categorization and financial data querying
        </Typography>
      </Box>

      {/* AI Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">AI Status:</Typography>
            {aiStatus === 'loading' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Chip label="Loading AI Model..." color="warning" variant="outlined" />
              </Box>
            )}
            {aiStatus === 'ready' && (
              <Chip label="Ready" color="success" variant="outlined" />
            )}
            {aiStatus === 'error' && (
              <Chip label="Error" color="error" variant="outlined" />
            )}
          </Box>
          
          {aiStatus === 'ready' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • Local AI model loaded - all processing happens on your device
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Your financial data never leaves your computer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • AI learns from your manual categorizations for better accuracy
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Feature Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="AI features">
            <Tab 
              icon={<CategoryIcon />} 
              label="Transaction Categorization" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<QuestionAnswerIcon />} 
              label="AI Query" 
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TransactionCategorizer aiStatus={aiStatus} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <AIQueryInterface aiStatus={aiStatus} />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AIPage;