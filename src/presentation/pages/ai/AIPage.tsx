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
  Divider,
  Button,
  LinearProgress,
  Grid
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CategoryIcon from '@mui/icons-material/Category';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

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
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [isPreloading, setIsPreloading] = useState(false);

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
          setModelStatus(result.models);
          setMemoryUsage(result.memory);
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

  const handlePreloadModels = async () => {
    setIsPreloading(true);
    try {
      if (window.api && window.api.ai && window.api.ai.preloadModels) {
        await window.api.ai.preloadModels();
        // Refresh status
        const result = await window.api.ai.getStatus();
        setModelStatus(result.models);
        setMemoryUsage(result.memory);
      }
    } catch (error) {
      console.error('Error preloading models:', error);
    } finally {
      setIsPreloading(false);
    }
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">AI Dual-Model Status:</Typography>
            {aiStatus === 'loading' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Chip label="Loading AI Models..." color="warning" variant="outlined" />
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
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Mistral 7B
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={modelStatus?.mistral ? 'Loaded' : 'Not Loaded'} 
                          color={modelStatus?.mistral ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Transaction categorization & payee extraction
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        CodeLlama 7B
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={modelStatus?.codellama ? 'Loaded' : 'Not Loaded'} 
                          color={modelStatus?.codellama ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Complex financial analysis & queries
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Memory Usage
                      </Typography>
                      {memoryUsage && (
                        <Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={memoryUsage.percentage} 
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {memoryUsage.percentage.toFixed(1)}% ({(memoryUsage.current / (1024*1024*1024)).toFixed(1)}GB / {(memoryUsage.max / (1024*1024*1024)).toFixed(1)}GB)
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handlePreloadModels}
                  disabled={isPreloading}
                  startIcon={isPreloading ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                >
                  {isPreloading ? 'Loading Models...' : 'Preload Models'}
                </Button>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  • Dual-model AI architecture with Mistral 7B + CodeLlama 7B
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • All processing happens locally - your data never leaves your device
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Advanced payee extraction and financial intelligence
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Smart automation with loan optimization and bill forecasting
                </Typography>
              </Box>
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
            <Tab 
              icon={<TrendingUpIcon />} 
              label="Financial Analysis" 
              {...a11yProps(2)} 
            />
            <Tab 
              icon={<MonitorHeartIcon />} 
              label="AI Management" 
              {...a11yProps(3)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TransactionCategorizer aiStatus={aiStatus} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <AIQueryInterface aiStatus={aiStatus} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <FinancialAnalysisPanel aiStatus={aiStatus} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <AIManagementPanel aiStatus={aiStatus} modelStatus={modelStatus} memoryUsage={memoryUsage} />
        </TabPanel>
      </Card>
    </Box>
  );
};

// Financial Analysis Panel Component
const FinancialAnalysisPanel: React.FC<{ aiStatus: string }> = ({ aiStatus }) => {
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');

  const analysisOptions = [
    { key: 'financial-health', label: 'Financial Health Analysis', icon: <MonitorHeartIcon /> },
    { key: 'loan-optimization', label: 'Loan Optimization', icon: <TrendingUpIcon /> },
    { key: 'bill-forecast', label: 'Bill Forecasting', icon: <CategoryIcon /> }
  ];

  const runAnalysis = async (analysisType: string) => {
    setIsAnalyzing(true);
    setSelectedAnalysis(analysisType);
    
    try {
      let result;
      if (window.api && window.api.ai) {
        switch (analysisType) {
          case 'financial-health':
            result = await window.api.ai.analyzeFinancialHealth();
            break;
          case 'loan-optimization':
            result = await window.api.ai.optimizeLoans();
            break;
          case 'bill-forecast':
            result = await window.api.ai.forecastBills();
            break;
          default:
            result = { success: false, error: 'Unknown analysis type' };
        }
      } else {
        // Mock results for testing
        result = {
          success: true,
          analysis: {
            type: analysisType,
            results: `Mock analysis results for ${analysisType}`,
            score: 85,
            recommendations: ['Recommendation 1', 'Recommendation 2']
          }
        };
      }
      
      setAnalysisResults(result);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResults({ success: false, error: 'Analysis failed' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Advanced Financial Analysis
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {analysisOptions.map((option) => (
          <Grid item xs={12} md={4} key={option.key}>
            <Card 
              variant="outlined" 
              sx={{ 
                cursor: 'pointer', 
                '&:hover': { backgroundColor: 'action.hover' },
                backgroundColor: selectedAnalysis === option.key ? 'action.selected' : 'inherit'
              }}
              onClick={() => runAnalysis(option.key)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {option.icon}
                  <Typography variant="subtitle2">
                    {option.label}
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  disabled={aiStatus !== 'ready' || isAnalyzing}
                  fullWidth
                >
                  {isAnalyzing && selectedAnalysis === option.key ? 'Analyzing...' : 'Run Analysis'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isAnalyzing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">
            Running {selectedAnalysis} analysis...
          </Typography>
        </Box>
      )}

      {analysisResults && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Results
            </Typography>
            {analysisResults.success ? (
              <Box>
                <Typography variant="body1" paragraph>
                  {JSON.stringify(analysisResults.analysis || analysisResults.optimization || analysisResults.forecast, null, 2)}
                </Typography>
                {analysisResults.modelUsed && (
                  <Typography variant="caption" color="text.secondary">
                    Processed by: {analysisResults.modelUsed} 
                    {analysisResults.processingTime && ` (${analysisResults.processingTime}ms)`}
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="error">
                {analysisResults.error || 'Analysis failed'}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// AI Management Panel Component
const AIManagementPanel: React.FC<{ 
  aiStatus: string; 
  modelStatus: any; 
  memoryUsage: any; 
}> = ({ aiStatus, modelStatus, memoryUsage }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleModelAction = async (action: string, modelName?: string) => {
    setIsLoading(true);
    setStatusMessage('');
    
    try {
      let result;
      if (window.api && window.api.ai) {
        switch (action) {
          case 'preload':
            result = await window.api.ai.preloadModels();
            break;
          case 'load':
            result = await window.api.ai.loadModel(modelName!);
            break;
          case 'unload':
            result = await window.api.ai.unloadModel(modelName!);
            break;
          case 'clear':
            result = await window.api.ai.clearModels();
            break;
          default:
            result = { success: false, error: 'Unknown action' };
        }
      } else {
        result = { success: true, message: `Mock ${action} completed` };
      }
      
      setStatusMessage(result.success ? (result.message || 'Success') : (result.error || 'Error'));
    } catch (error) {
      console.error('Model action error:', error);
      setStatusMessage('Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        AI Model Management
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Model Operations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={() => handleModelAction('preload')}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                >
                  Preload All Models
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => handleModelAction('load', 'mistral-7b')}
                  disabled={isLoading}
                >
                  Load Mistral 7B
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => handleModelAction('load', 'codellama-7b')}
                  disabled={isLoading}
                >
                  Load CodeLlama 7B
                </Button>
                <Button 
                  variant="outlined" 
                  color="warning"
                  onClick={() => handleModelAction('clear')}
                  disabled={isLoading}
                >
                  Clear All Models
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2">
                    AI Status:
                  </Typography>
                  <Chip label={aiStatus} color={aiStatus === 'ready' ? 'success' : 'default'} size="small" />
                </Box>
                <Typography variant="body2">
                  Models Loaded: {modelStatus ? Object.values(modelStatus).filter(Boolean).length : 0}
                </Typography>
                {memoryUsage && (
                  <Typography variant="body2">
                    Memory: {memoryUsage.percentage.toFixed(1)}% used
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {statusMessage && (
        <Alert severity={statusMessage.includes('failed') || statusMessage.includes('error') ? 'error' : 'success'}>
          {statusMessage}
        </Alert>
      )}
    </Box>
  );
};

export default AIPage;