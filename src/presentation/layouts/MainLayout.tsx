import React, { useState, useMemo } from 'react';
import {
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
// Import the logo properly
import logoImage from '../../assets/images/logo.png';
import WelcomeDialog from '../components/WelcomeDialog';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  React.useEffect(() => {
    const onboardingDismissed = window.localStorage.getItem('libri.onboarding.dismissed.v1');
    if (onboardingDismissed === 'true') {
      return;
    }

    let cancelled = false;

    const loadAccountCount = async () => {
      try {
        const accounts = await window.api.accounts.getAll();
        if (!cancelled) {
          setAccountCount(accounts.length);
          setWelcomeOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          setWelcomeOpen(true);
        }
      }
    };

    loadAccountCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCloseWelcome = () => {
    window.localStorage.setItem('libri.onboarding.dismissed.v1', 'true');
    setWelcomeOpen(false);
  };

  const handleGoToAccounts = () => {
    handleCloseWelcome();
    navigate('/accounts');
  };

  const handleGoToLedger = () => {
    handleCloseWelcome();
    navigate('/transactions');
  };

  const menuItems = useMemo(() => {
    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
      { text: 'Accounts', icon: <AccountBalanceIcon />, path: '/accounts' },
      { text: 'Ledger', icon: <ReceiptIcon />, path: '/transactions' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
    ];

    return items;
  }, []);

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
        <Box
          component="img"
          sx={{ 
            height: 50, 
            width: 'auto',
            marginBottom: 1,
            maxWidth: '100%'
          }}
          alt="Libri Finance Logo"
          src={logoImage}
        />
        <Typography variant="h6" noWrap component="div">
        Libri
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* Mobile-only menu button */}
      <Box
        sx={{ 
          display: { xs: 'block', sm: 'none' },
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 1100
        }}
      >
        <IconButton
          color="primary"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.8)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '10px'  // Reduced since AppBar is gone
        }}
      >
        {children}
      </Box>
      <WelcomeDialog
        open={welcomeOpen}
        accountCount={accountCount}
        onClose={handleCloseWelcome}
        onGoToAccounts={handleGoToAccounts}
        onGoToLedger={handleGoToLedger}
      />
    </Box>
  );
};

export default MainLayout;
