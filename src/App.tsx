import React from 'react';
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
const Reports = () => <div><h1>Reports</h1><p>Reports content will go here</p></div>;
const Settings = () => <div><h1>Settings</h1><p>Settings content will go here</p></div>;

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
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
};

export default App;
