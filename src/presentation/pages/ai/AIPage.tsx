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
          AI Categorization
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Automatically suggest and apply categories to your transactions.
        </Typography>
      </Box>

      {/* AI Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">AI Categorization System:</Typography>
            {aiStatus === 'loading' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Chip label="Initializing..." color="warning" variant="outlined" />
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
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Rule-Based Categorization (Phase 1)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label="Active"
                          color="success"
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Pattern matching with 65+ merchant patterns
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Target Accuracy
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip
                          label="75-80%"
                          color="info"
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Pattern matching accuracy
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>


            </Box>
          )}
        </CardContent>
      </Card>

      <TransactionCategorizer aiStatus={aiStatus} />
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

// AI Management Panel Component - Phase 1
const AIManagementPanel: React.FC<{
  aiStatus: string;
  modelStatus: any;
  memoryUsage: any;
}> = ({ aiStatus }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoadingStats(true);
    try {
      if (window.api && window.api.ai && window.api.ai.getStatistics) {
        const result = await window.api.ai.getStatistics();
        if (result.success) {
          setStats(result.stats);
        }
      }
    } catch (error) {
      console.error('Error loading AI statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        AI System Management
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MonitorHeartIcon color="primary" />
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Categorization Engine:
                  </Typography>
                  <Chip label="Rule-Based (Phase 1)" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    System Status:
                  </Typography>
                  <Chip label={aiStatus} color={aiStatus === 'ready' ? 'success' : 'default'} size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Heavy Models:
                  </Typography>
                  <Chip label="Not Required" color="info" size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Processing:
                  </Typography>
                  <Chip label="100% Local" color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                Categorization Statistics
              </Typography>
              {isLoadingStats ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : stats ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Transactions:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.total}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Categorized:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {stats.categorized}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Uncategorized:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="warning.main">
                      {stats.uncategorized}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.completionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Statistics unavailable
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Phase 1: Active Features
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <Typography variant="body2">
              Rule-based categorization with 65+ merchant patterns
            </Typography>
            <Typography variant="body2">
              Smart payee extraction and matching
            </Typography>
            <Typography variant="body2">
              Confidence scoring for predictions
            </Typography>
            <Typography variant="body2">
              Batch transaction processing
            </Typography>
            <Typography variant="body2">
              Target accuracy: 75-80%
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Future Enhancements (Phase 2+)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Machine learning models for improved accuracy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Natural language query processing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced financial analysis and forecasting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adaptive learning from user corrections
            </Typography>
            <Typography variant="body2" color="text.secondary">
              API-based enhancement options
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIPage;


