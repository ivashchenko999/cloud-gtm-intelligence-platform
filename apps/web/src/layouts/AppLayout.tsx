import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AccountsIcon from '@mui/icons-material/BusinessOutlined';
import ImportsIcon from '@mui/icons-material/CloudUploadOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const DRAWER_WIDTH = 232;

const navItems = [
  { to: '/dashboard', key: 'dashboard', icon: <DashboardIcon /> },
  { to: '/accounts', key: 'accounts', icon: <AccountsIcon /> },
  { to: '/imports', key: 'imports', icon: <ImportsIcon /> },
  { to: '/settings', key: 'settings', icon: <SettingsIcon /> },
] as const;

export function AppLayout() {
  const { t } = useTranslation('common');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="span" fontWeight={700} sx={{ flexGrow: 1 }}>
            {t('appName')}
          </Typography>
          <LanguageSwitcher />
          <Button variant="contained" startIcon={<ImportsIcon />}>
            {t('actions.importCrm')}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List component="nav">
          {navItems.map((item) => (
            <ListItemButton key={item.key} component={NavLink} to={item.to}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={t(`navigation.${item.key}`)} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
