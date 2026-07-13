import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AccountsIcon from '@mui/icons-material/BusinessOutlined';
import ImportsIcon from '@mui/icons-material/CloudUploadOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ImportCrmDialog } from '../components/ImportCrmDialog';

const DRAWER_WIDTH = 232;

const navItems = [
  { to: '/dashboard', key: 'dashboard', icon: <DashboardIcon /> },
  { to: '/accounts', key: 'accounts', icon: <AccountsIcon /> },
  { to: '/imports', key: 'imports', icon: <ImportsIcon /> },
  { to: '/settings', key: 'settings', icon: <SettingsIcon /> },
] as const;

export function AppLayout() {
  const { t } = useTranslation('common');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const navigation = (
    <List component="nav">
      {navItems.map((item) => (
        <ListItemButton
          key={item.key}
          component={NavLink}
          to={item.to}
          onClick={() => setMobileOpen(false)}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={t(`navigation.${item.key}`)} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            aria-label={t('navigation.openMenu')}
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="span" fontWeight={700} sx={{ flexGrow: 1 }}>
            {t('appName')}
          </Typography>
          <LanguageSwitcher />
          <Button
            variant="contained"
            startIcon={<ImportsIcon />}
            onClick={() => setImportOpen(true)}
          >
            {t('actions.importCrm')}
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Temporary drawer for small screens, toggled from the app bar. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {navigation}
        </Drawer>

        {/* Permanent drawer from the md breakpoint up. */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {navigation}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Outlet />
        </Container>
      </Box>

      <ImportCrmDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </Box>
  );
}
