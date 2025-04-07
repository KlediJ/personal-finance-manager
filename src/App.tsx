import React from 'react';
import EnvironmentIndicator from './presentation/components/EnvironmentIndicator';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Layouts
import MainLayout from './presentation/layouts/MainLayout';

// Pages
import AccountsPage from './presentation/pages/accounts/AccountsPage';
import TransactionsPage from './presentation/pages/transactions/TransactionsPage';
import CategoriesPage from './presentation/pages/categories/CategoriesPage';

// Pages
import DashboardPage from './presentation/pages/dashboard/DashboardPage';
import AccountSummaryPage from './presentation/pages/account-summary';
import SettingsPage from './presentation/pages/settings';
import BudgetPage from './presentation/pages/budget';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/account-summary" element={<AccountSummaryPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </Router>
      <EnvironmentIndicator />
    </ThemeProvider>
  );
};

export default App;
