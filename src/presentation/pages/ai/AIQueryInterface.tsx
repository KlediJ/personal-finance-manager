import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Category as CategoryIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';

interface AIQueryInterfaceProps {
  aiStatus: 'loading' | 'ready' | 'error';
}

interface QueryResult {
  query: string;
  response: string;
  data?: any;
  timestamp: Date;
  type: 'text' | 'chart' | 'table' | 'summary';
}

const AIQueryInterface: React.FC<AIQueryInterfaceProps> = ({ aiStatus }) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQueries = [
    // Financial queries
    {
      text: "How much did I spend on groceries last month?",
      icon: <CategoryIcon />,
      category: "Financial Query"
    },
    {
      text: "What's my total income for this year?",
      icon: <TrendingUpIcon />,
      category: "Financial Query"
    },
    {
      text: "Show me my largest expenses this month",
      icon: <AccountBalanceIcon />,
      category: "Financial Query"
    },
    // Chatbot/General AI tests
    {
      text: "Hello, how are you today?",
      icon: <LightbulbIcon />,
      category: "Chatbot Test"
    },
    {
      text: "What is the capital of France?",
      icon: <LightbulbIcon />,
      category: "General Knowledge"
    },
    {
      text: "Explain quantum physics in simple terms",
      icon: <LightbulbIcon />,
      category: "Complex Reasoning"
    },
    {
      text: "Write a short poem about money",
      icon: <LightbulbIcon />,
      category: "Creative Writing"
    },
    {
      text: "Help me categorize this transaction: 'WALMART SUPERCENTER #1234 GROCERIES $45.67'",
      icon: <CategoryIcon />,
      category: "AI Training Test"
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [queryHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitQuery = async () => {
    if (!query.trim() || aiStatus !== 'ready') return;
    
    setIsProcessing(true);
    const userQuery = query.trim();
    setQuery('');

    try {
      // Check if AI API is available
      if (!window.api || !window.api.ai || !window.api.ai.processQuery) {
        console.log('AI API not available, using mock query processing');
        // Fallback to mock processing
        const mockResponse = await processQuery(userQuery);
        const queryResult: QueryResult = {
          query: userQuery,
          response: mockResponse.text,
          data: mockResponse.data,
          timestamp: new Date(),
          type: mockResponse.type
        };
        
        setQueryHistory(prev => [...prev, queryResult]);
        return;
      }
      
      // Use AI service for query processing
      const result = await window.api.ai.processQuery(userQuery);
      
      if (result.success) {
        const queryResult: QueryResult = {
          query: userQuery,
          response: result.result.content,
          data: result.result.data,
          timestamp: new Date(),
          type: result.result.type
        };
        
        setQueryHistory(prev => [...prev, queryResult]);
      } else {
        // Fallback to mock processing
        const mockResponse = await processQuery(userQuery);
        const queryResult: QueryResult = {
          query: userQuery,
          response: mockResponse.text,
          data: mockResponse.data,
          timestamp: new Date(),
          type: mockResponse.type
        };
        
        setQueryHistory(prev => [...prev, queryResult]);
      }
    } catch (error) {
      console.error('Error processing query:', error);
      const errorResult: QueryResult = {
        query: userQuery,
        response: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date(),
        type: 'text'
      };
      setQueryHistory(prev => [...prev, errorResult]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processQuery = async (userQuery: string): Promise<{text: string, data?: any, type: 'text' | 'chart' | 'table' | 'summary'}> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const query = userQuery.toLowerCase();
    
    // Mock query processing based on patterns
    if (query.includes('spend') && query.includes('month')) {
      return {
        text: "Based on your transactions, you spent $2,456 last month across all categories. Here's the breakdown:",
        data: {
          categories: [
            { name: 'Food & Dining', amount: 856 },
            { name: 'Transportation', amount: 342 },
            { name: 'Shopping', amount: 689 },
            { name: 'Bills & Utilities', amount: 234 },
            { name: 'Entertainment', amount: 335 }
          ]
        },
        type: 'summary'
      };
    }
    
    if (query.includes('income') && query.includes('year')) {
      return {
        text: "Your total income for this year is $45,600. This includes salary, freelance work, and other income sources.",
        data: {
          totalIncome: 45600,
          sources: [
            { name: 'Salary', amount: 42000 },
            { name: 'Freelance', amount: 3200 },
            { name: 'Other', amount: 400 }
          ]
        },
        type: 'summary'
      };
    }
    
    if (query.includes('largest expenses')) {
      return {
        text: "Here are your largest expenses this month:",
        data: {
          expenses: [
            { description: 'Rent Payment', amount: 1200, date: '2024-01-01' },
            { description: 'Car Payment', amount: 350, date: '2024-01-05' },
            { description: 'Grocery Shopping', amount: 145, date: '2024-01-10' },
            { description: 'Utilities', amount: 120, date: '2024-01-15' },
            { description: 'Insurance', amount: 85, date: '2024-01-20' }
          ]
        },
        type: 'table'
      };
    }
    
    if (query.includes('trend')) {
      return {
        text: "Your spending trend over the last 6 months shows a slight increase, primarily due to higher spending on dining and entertainment.",
        data: {
          months: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
          spending: [2100, 2300, 2150, 2400, 2650, 2456]
        },
        type: 'chart'
      };
    }
    
    if (query.includes('overspending')) {
      return {
        text: "Based on your budget, you're overspending in these categories:",
        data: {
          overspending: [
            { category: 'Food & Dining', budgeted: 600, actual: 856, over: 256 },
            { category: 'Entertainment', budgeted: 200, actual: 335, over: 135 },
            { category: 'Shopping', budgeted: 500, actual: 689, over: 189 }
          ]
        },
        type: 'table'
      };
    }
    
    if (query.includes('above') && query.includes('100')) {
      return {
        text: "Here are all transactions above $100 from the last 30 days:",
        data: {
          transactions: [
            { description: 'Rent Payment', amount: 1200, date: '2024-01-01' },
            { description: 'Car Payment', amount: 350, date: '2024-01-05' },
            { description: 'Grocery Shopping', amount: 145, date: '2024-01-10' },
            { description: 'Utilities', amount: 120, date: '2024-01-15' }
          ]
        },
        type: 'table'
      };
    }
    
    // Default response
    return {
      text: "I understand you're asking about your finances. I can help you analyze spending patterns, income trends, budget performance, and find specific transactions. Try asking about your spending in specific categories or time periods.",
      type: 'text'
    };
  };

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery);
  };

  const handleClearHistory = () => {
    setQueryHistory([]);
  };

  const renderQueryResult = (result: QueryResult) => {
    return (
      <Box key={result.timestamp.getTime()} sx={{ mb: 3 }}>
        {/* User Query */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              maxWidth: '70%', 
              backgroundColor: 'primary.main', 
              color: 'primary.contrastText' 
            }}
          >
            <Typography variant="body1">{result.query}</Typography>
          </Paper>
        </Box>
        
        {/* AI Response */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Paper elevation={1} sx={{ p: 2, maxWidth: '70%' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {result.response}
            </Typography>
            
            {/* Render data based on type */}
            {result.data && result.type === 'summary' && (
              <Box sx={{ mt: 2 }}>
                {result.data.categories && (
                  <Grid container spacing={1}>
                    {result.data.categories.map((cat: any, index: number) => (
                      <Grid item xs={6} key={index}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{cat.name}:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ${cat.amount}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
                
                {result.data.sources && (
                  <Box sx={{ mt: 1 }}>
                    {result.data.sources.map((source: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{source.name}:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ${source.amount}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
            
            {result.data && result.type === 'table' && (
              <Box sx={{ mt: 2 }}>
                {result.data.expenses && (
                  <List dense>
                    {result.data.expenses.map((expense: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={expense.description}
                          secondary={expense.date}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          ${expense.amount}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                {result.data.transactions && (
                  <List dense>
                    {result.data.transactions.map((transaction: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={transaction.description}
                          secondary={transaction.date}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          ${transaction.amount}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                {result.data.overspending && (
                  <List dense>
                    {result.data.overspending.map((item: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.category}
                          secondary={`Budget: $${item.budgeted} | Actual: $${item.actual}`}
                        />
                        <Chip 
                          label={`+$${item.over}`} 
                          color="error" 
                          size="small" 
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {result.timestamp.toLocaleTimeString()}
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Query History */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 1 }}>
        {queryHistory.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LightbulbIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Ask me anything about your finances!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              I can help you analyze spending patterns, track income, find transactions, and understand your financial trends.
            </Typography>
          </Box>
        ) : (
          queryHistory.map(renderQueryResult)
        )}
        
        {isProcessing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Processing your query...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Queries */}
      {queryHistory.length === 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Try these example queries:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestedQueries.slice(0, 4).map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion.text}
                variant="outlined"
                clickable
                onClick={() => handleSuggestedQuery(suggestion.text)}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Ask me about your finances..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitQuery();
            }
          }}
          disabled={aiStatus !== 'ready'}
        />
        
        <Button
          variant="contained"
          onClick={handleSubmitQuery}
          disabled={!query.trim() || aiStatus !== 'ready' || isProcessing}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          <SendIcon />
        </Button>
        
        {queryHistory.length > 0 && (
          <IconButton
            onClick={handleClearHistory}
            color="secondary"
          >
            <ClearIcon />
          </IconButton>
        )}
      </Box>
      
      {aiStatus !== 'ready' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          AI Assistant is not ready. Please wait for the model to load.
        </Alert>
      )}
    </Box>
  );
};

export default AIQueryInterface;