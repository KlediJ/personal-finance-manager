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
import PayeesPage from './presentation/pages/payees/PayeesPage';
import DashboardPage from './presentation/pages/dashboard/DashboardPage';
import SettingsPage from './presentation/pages/settings';
import BudgetPage from './presentation/pages/budget';
import AIPage from './presentation/pages/ai';
import BillsPage from './presentation/pages/bills';
import SubscriptionsPage from './presentation/pages/subscriptions';
import LoansPage from './presentation/pages/loans';
import CreditCardsPage from './presentation/pages/credit-cards';

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
            <Route path="/payees" element={<PayeesPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/credit-cards" element={<CreditCardsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/ai" element={<AIPage />} />
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
