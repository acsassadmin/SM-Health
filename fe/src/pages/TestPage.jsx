import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';

// --- MUI IMPORTS ---
import {
  Box, Drawer, AppBar, Toolbar, Typography, Button, Grid,
  Card, CardContent, Avatar, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Select,
  MenuItem, InputLabel, FormControl, Divider, List, ListItem,
  ListItemText, ListItemIcon, Badge, IconButton, CircularProgress, Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon, People as PeopleIcon,
  Business as BusinessIcon, EventNote as EventNoteIcon,
  CalendarMonth as CalendarMonthIcon, Close as CloseIcon,
  CheckCircle as CheckCircleIcon, Warning as WarningIcon,
  Add as AddIcon, Search as SearchIcon, Person as PersonIcon
} from '@mui/icons-material';

// --- THEME & COLORS ---
const BRAND = {
  primary: '#1a5fba',
  dark: '#0c1f3f',
  bg: '#f7f9fc',
  text: '#1a2535',
  border: '#e1e8f4',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  sidebarWidth: 240
};

// --- HELPERS ---
const formatDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getRoleColor = (role) => {
  const map = {
    'Carer': '#dbeafe',
    'Senior Carer': '#dcfce7',
    'Nurse': '#fef9c3',
    'Senior Nurse': '#ffedd5',
    'Support Worker': '#f3e8ff',
    'Team Leader': '#ccfbf1',
  };
  return map[role] || '#f1f5f9';
};

const getRoleTextColor = (role) => {
  const map = {
    'Carer': '#1e40af',
    'Senior Carer': '#166534',
    'Nurse': '#854d0e',
    'Senior Nurse': '#9a3412',
    'Support Worker': '#581c87',
    'Team Leader': '#065f46',
  };
  return map[role] || '#475569';
};

const stringAvatar = (name) => {
  const colors = ['#1a5fba', '#0891b2', '#7c3aed', '#db2777', '#e8820c', '#059669'];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(name.length-1)||0)) % colors.length;
  return {
    sx: { bgcolor: colors[idx], width: 32, height: 32, fontSize: 14, fontWeight: 'bold' },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1] ? name.split(' ')[1][0] : ''}`,
  };
};

// --- COMPONENTS ---

const StatCard = ({ title, value, sub, color, onClick, icon: Icon }) => (
  <Card 
    sx={{ 
      position: 'relative', overflow: 'visible', cursor: 'pointer', 
      transition: '0.3s', border: '1px solid #e1e8f4', 
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 } 
    }}
    onClick={onClick}
  >
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: color }} />
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ color: 'text.secondary', mb: 1 }}>{Icon && <Icon fontSize="large" />}</Box>
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: BRAND.text }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold', color: '#5e7187', display: 'block', mt: 1 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: '#5e7187', display: 'block', mt: 0.5 }}>
        {sub}
      </Typography>
    </CardContent>
  </Card>
);

// --- MAIN PAGE ---

const Dashboard = () => {
  // -- STATE --
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  
  // -- DATABASE DATA --
  const [dbData, setDbData] = useState({
    staff: [],
    clients: [],
    shifts: [],
  });

  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // -- FETCH DATA --
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [staffRes, clientRes, shiftRes] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('shifts').select('*, clients(name), staff(first_name, last_name)'),
      ]);

      setDbData({
        staff: staffRes.data || [],
        clients: clientRes.data || [],
        shifts: shiftRes.data || [],
      });
    } catch (error) {
      console.error("Error fetching from PostgreSQL:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // -- STATS --
  const stats = useMemo(() => {
    const { staff, clients, shifts } = dbData;
    const today = new Date().toISOString().split('T')[0];
    const openShifts = shifts.filter(s => !s.assigned_staff_id && s.shift_date >= today).length;
    const coveredShifts = shifts.filter(s => s.assigned_staff_id && s.shift_date >= today).length;
    const expiringDbs = staff.filter(s => {
      if (!s.dbs_date) return false;
      const days = Math.ceil((new Date(s.dbs_date) - new Date()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days < 30;
    }).length;

    return {
      totalStaff: staff.length,
      totalClients: clients.length,
      openShifts,
      coveredShifts,
      expiringDbs,
      unassignedShifts: shifts.filter(s => !s.assigned_staff_id && s.shift_date >= today)
    };
  }, [dbData]);

  // -- HANDLERS --
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const openModal = (type) => { setModalType(type); setFormData({}); setModalOpen(true); };

  const handleSaveStaff = async () => {
    const { first_name, last_name, role, email, phone, dbs_date } = formData;
    if (!first_name || !last_name || !role) return alert("Required fields missing");

    const { error } = await supabase.from('staff').insert([{ 
      first_name, last_name, role, email, phone, 
      dbs_date, joined_date: new Date().toISOString().split('T')[0] 
    }]);
    if (error) alert(error.message); else { setModalOpen(false); fetchAllData(); }
  };

  const handleSaveShift = async () => {
    const { client_id, role, shift_date, start_time, end_time } = formData;
    if (!client_id || !shift_date) return alert("Client and Date required");

    const { error } = await supabase.from('shifts').insert([{ 
      client_id, role, shift_date, start_time, end_time, status: 'open' 
    }]);
    if (error) alert(error.message); else { setModalOpen(false); fetchAllData(); }
  };

  // -- RENDERERS --

  const SidebarItem = ({ label, active, icon: Icon, onClick, badge }) => (
    <ListItem 
      button 
      selected={active} 
      onClick={onClick}
      sx={{ 
        borderRadius: 2, mb: 0.5, mx: 1,
        bgcolor: active ? 'primary.main' : 'transparent',
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        '&.Mui-selected': { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } },
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
      }}
    >
      <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{Icon && <Icon fontSize="small" />}</ListItemIcon>
      <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
      {badge > 0 && (
        <Badge badgeContent={badge} color="secondary" sx={{ ml: 1 }}>
          <Box />
        </Badge>
      )}
    </ListItem>
  );

  const renderSidebar = () => (
    <Drawer
      variant="permanent"
      sx={{
        width: BRAND.sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: BRAND.sidebarWidth, boxSizing: 'border-box', bgcolor: BRAND.dark, color: 'white', borderRight: 'none' },
      }}
    >
      <Toolbar sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'serif', flexGrow: 1, fontWeight: 'bold' }}>
          SM Heath
        </Typography>
      </Toolbar>
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <SidebarItem label="Dashboard" active={view === 'dashboard'} icon={DashboardIcon} onClick={() => setView('dashboard')} />
        <SidebarItem label="Staff Directory" active={view === 'staff'} icon={PeopleIcon} onClick={() => setView('staff')} />
        <SidebarItem label="Care Homes" active={view === 'clients'} icon={BusinessIcon} onClick={() => setView('clients')} />
        <SidebarItem label="Shifts" active={view === 'shifts'} icon={EventNoteIcon} onClick={() => setView('shifts')} badge={stats.openShifts} />
        <SidebarItem label="Rota Calendar" active={view === 'rota'} icon={CalendarMonthIcon} onClick={() => setView('rota')} />
      </Box>
      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Avatar {...stringAvatar('Admin User')} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white' }}>Admin User</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Administrator</Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );

  const renderDashboardView = () => (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Staff" value={stats.totalStaff} sub="From Database" 
            color={BRAND.primary} icon={PeopleIcon} onClick={() => setView('staff')} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Care Homes" value={stats.totalClients} sub="Active Locations" 
            color="#0891b2" icon={BusinessIcon} onClick={() => setView('clients')} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Open Shifts" value={stats.openShifts} sub={`${stats.coveredShifts} covered`} 
            color={BRAND.warning} icon={EventNoteIcon} onClick={() => setView('shifts')} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="DBS Expiring" value={stats.expiringDbs} sub="Within 30 days" 
            color={BRAND.danger} icon={WarningIcon} onClick={() => setView('compliance')} 
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid #e1e8f4' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="error" /> DBS Expiry Alerts (Live)
            </Typography>
            {dbData.staff.filter(s => {
              if (!s.dbs_date) return false;
              const days = Math.ceil((new Date(s.dbs_date) - new Date()) / (1000 * 60 * 60 * 24));
              return days < 30 && days >= 0;
            }).length === 0 ? (
              <Alert severity="success">✅ All staff DBS valid.</Alert>
            ) : (
              <List>
                {dbData.staff.filter(s => {
                  if (!s.dbs_date) return false;
                  const days = Math.ceil((new Date(s.dbs_date) - new Date()) / (1000 * 60 * 60 * 24));
                  return days < 30 && days >= 0;
                }).map(s => (
                  <ListItem key={s.id} sx={{ bgcolor: '#fef2f2', mb: 1, borderRadius: 1, border: '1px solid #fecaca' }}>
                    <Avatar {...stringAvatar(`${s.first_name} ${s.last_name}`)} sx={{ mr: 2 }} />
                    <ListItemText primary={`${s.first_name} ${s.last_name}`} secondary={s.role} />
                    <Chip label="Expiring" color="error" size="small" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid #e1e8f4' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Unassigned Shifts</Typography>
              <Button size="small" onClick={() => setView('shifts')}>View All</Button>
            </Box>
            {stats.unassignedShifts.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No unassigned shifts found.</Typography>
            ) : (
              <List>
                {stats.unassignedShifts.slice(0, 5).map(s => (
                  <ListItem key={s.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                    <ListItemText 
                      primary={s.clients?.name} 
                      secondary={`${formatDate(s.shift_date)} • ${s.start_time}-${s.end_time}`} 
                    />
                    <Chip 
                      label={s.role} 
                      size="small" 
                      sx={{ bgcolor: getRoleColor(s.role), color: getRoleTextColor(s.role) }} 
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStaffView = () => {
    const filtered = dbData.staff.filter(s => 
      `${s.first_name} ${s.last_name} ${s.role}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 'medium' }}>Staff Directory</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              size="small" 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ width: 300 }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal('addStaff')}>Add Staff</Button>
          </Box>
        </Box>
        <Paper sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e1e8f4' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>DBS Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length > 0 ? filtered.map(s => (
                  <TableRow key={s.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar {...stringAvatar(`${s.first_name} ${s.last_name}`)} />
                        <Box>
                          <Typography sx={{ fontWeight: 'bold' }}>{s.first_name} {s.last_name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.role} size="small" sx={{ bgcolor: getRoleColor(s.role), color: getRoleTextColor(s.role) }} />
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>{s.phone || '—'}</TableCell>
                    <TableCell>
                      {s.dbs_date && new Date(s.dbs_date) < new Date() 
                        ? <Chip label="Expired" color="error" size="small" />
                        : <Chip label="Valid" color="success" size="small" />
                      }
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No staff found in database.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  };

  const renderShiftsView = () => {
    const sorted = [...dbData.shifts].sort((a,b) => new Date(a.shift_date) - new Date(b.shift_date));
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 'medium' }}>Shifts</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal('addShift')}>Create Shift</Button>
        </Box>
        <Paper sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e1e8f4' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Care Home</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Assigned</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.length > 0 ? sorted.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatDate(s.shift_date)}</TableCell>
                    <TableCell>{s.clients?.name}</TableCell>
                    <TableCell>
                      <Chip label={s.role} size="small" sx={{ bgcolor: getRoleColor(s.role), color: getRoleTextColor(s.role) }} />
                    </TableCell>
                    <TableCell>
                      {s.staff ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar {...stringAvatar(`${s.staff.first_name} ${s.staff.last_name}`)} sx={{ width: 24, height: 24, fontSize: 10 }} />
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{s.staff.first_name} {s.staff.last_name}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={s.assigned_staff_id ? 'Covered' : 'Open'} 
                        color={s.assigned_staff_id ? 'success' : 'warning'} 
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No shifts in database.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: BRAND.bg, minHeight: '100vh' }}>
      {renderSidebar()}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e1e8f4', color: BRAND.text }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'serif', flexGrow: 1, fontWeight: 500 }}>
              {view === 'dashboard' ? 'Overview' : view.charAt(0).toUpperCase() + view.slice(1)}
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => view === 'staff' ? openModal('addStaff') : openModal('addShift')}
              sx={{ textTransform: 'none', borderRadius: 8, fontWeight: 'bold' }}
            >
              {view === 'staff' ? 'Add Staff' : 'Create Shift'}
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {view === 'dashboard' && renderDashboardView()}
              {view === 'staff' && renderStaffView()}
              {view === 'shifts' && renderShiftsView()}
              {view === 'clients' && <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Care Homes Module (Connects to `clients` table)</Box>}
              {view === 'rota' && <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Rota Calendar Module (Connects to `shifts` table)</Box>}
            </>
          )}
        </Box>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'serif' }}>{modalType === 'addStaff' ? 'Add New Staff' : 'Create New Shift'}</DialogTitle>
        <DialogContent>
          {modalType === 'addStaff' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth label="First Name" name="first_name" onChange={handleInputChange} size="small" />
                <TextField fullWidth label="Last Name" name="last_name" onChange={handleInputChange} size="small" />
              </Box>
              <TextField fullWidth label="Email" name="email" onChange={handleInputChange} size="small" />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select name="role" label="Role" onChange={handleInputChange}>
                    <MenuItem value="Carer">Carer</MenuItem>
                    <MenuItem value="Senior Carer">Senior Carer</MenuItem>
                    <MenuItem value="Nurse">Nurse</MenuItem>
                    <MenuItem value="Support Worker">Support Worker</MenuItem>
                  </Select>
                </FormControl>
                <TextField fullWidth label="Phone" name="phone" onChange={handleInputChange} size="small" />
              </Box>
              <TextField fullWidth type="date" label="DBS Expiry" name="dbs_date" onChange={handleInputChange} size="small" InputLabelProps={{ shrink: true }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Care Home</InputLabel>
                <Select name="client_id" label="Care Home" onChange={handleInputChange}>
                  {dbData.clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth type="date" label="Date" name="shift_date" onChange={handleInputChange} size="small" InputLabelProps={{ shrink: true }} />
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select name="role" label="Role" onChange={handleInputChange}>
                    <MenuItem value="Carer">Carer</MenuItem>
                    <MenuItem value="Senior Carer">Senior Carer</MenuItem>
                    <MenuItem value="Nurse">Nurse</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth type="time" label="Start" name="start_time" onChange={handleInputChange} size="small" InputLabelProps={{ shrink: true }} />
                <TextField fullWidth type="time" label="End" name="end_time" onChange={handleInputChange} size="small" InputLabelProps={{ shrink: true }} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={modalType === 'addStaff' ? handleSaveStaff : handleSaveShift}>
            Save to Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;