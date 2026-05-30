import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert, Card, CardContent,
  Grid, useMediaQuery, useTheme, Stack, Dialog, DialogContent, DialogActions
} from '@mui/material';
import {
  Search as SearchIcon, CheckCircle, Cancel, AccessTime, Error as ErrorIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles'; // Import styled
import { supabase } from '../supabaseClient';

// --- Custom Gradient Button for the Modal (Same as Clients.jsx) ---
const GradientButton = styled(Button)(({ theme, colorType = 'success' }) => ({
  background: colorType === 'success' 
    ? 'linear-gradient(45deg, #6366f1 30%, #a855f7 90%)' 
    : colorType === 'error'
    ? 'linear-gradient(45deg, #ef4444 30%, #b91c1c 90%)'
    : 'linear-gradient(45deg, #f59e0b 30%, #d97706 90%)',
  border: 0,
  borderRadius: 12,
  color: 'white',
  height: 48,
  padding: '0 30px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  fontSize: '16px',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': {
    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    opacity: 0.95,
  },
}));

const Timesheets = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- State Management ---
  const [tabValue, setTabValue] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, totalHours: 0 });

  // --- NEW: Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    actionType: null, // 'approved' or 'rejected'
    targetId: null
  });

  useEffect(() => {
    fetchTimesheets();
  }, [tabValue]);

  // --- Fetch Timesheets ---
  const fetchTimesheets = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          shift_id (
            staff (
              contracted_hours  
            )
          )
        `)
        .order('date', { ascending: false });

      if (tabValue !== 'all') {
        query = query.eq('status', tabValue);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const formattedData = (data || []).map(item => ({
        ...item,
        staff: item.shift_id?.staff || null
      }));

      setTimesheets(formattedData);
      calculateStats();
    } catch (err) {
      setError("Failed to load timesheet records.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const { data: allRecords } = await supabase.from('timesheets').select('status, hours_worked');
      if (allRecords) {
        const pendingCount = allRecords.filter(r => r.status === 'pending').length;
        const approvedCount = allRecords.filter(r => r.status === 'approved').length;
        const totalHours = allRecords
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (Number(r.hours_worked) || 0), 0);

        setStats({ pending: pendingCount, approved: approvedCount, totalHours });
      }
    } catch (err) {
    }
  };

  // --- UPDATED: Handle Confirmation (Open Modal) ---
  const handleUpdateStatusClick = (id, newStatus) => {
    setConfirmModal({
      open: true,
      title: `Confirm ${newStatus}?`,
      message: `Are you sure you want to mark this timesheet as ${newStatus}?`,
      actionType: newStatus,
      targetId: id
    });
  };

  // --- UPDATED: Execute the actual update after confirmation ---
  const executeStatusUpdate = async () => {
    const { actionType, targetId } = confirmModal;
    
    // Close modal immediately
    setConfirmModal({ ...confirmModal, open: false });

    try {
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({ status: actionType })
        .eq('id', targetId);

      if (updateError) throw updateError;
      
      // Refresh list
      fetchTimesheets();
      
      // Optional: You could trigger a Success Modal here too if you want
      // But refreshing the list is usually enough feedback for approvals
      
    } catch (err) {
      alert(`Failed to update timesheet status to ${actionType}.`);
    }
  };

  const filteredTimesheets = timesheets.filter((ts) => {
    const term = searchTerm.toLowerCase();
    return (ts.staff_name?.toLowerCase() || '').includes(term) || 
           (ts.client_name?.toLowerCase() || '').includes(term);
  });

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // --- Mobile Card Component ---
  const TimesheetCard = ({ ts }) => (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
              {ts.staff_name?.charAt(0) || '?'}
            </Avatar>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{ts.staff_name}</Typography>
          </Box>
          <Chip label={ts.status.toUpperCase()} color={ts.status === 'approved' ? 'success' : ts.status === 'rejected' ? 'error' : 'warning'} size="small" />
        </Box>

        <Typography variant="body1" sx={{ fontWeight: 600, color: '#0c1f3f', mt: 1 }}>{ts.client_name}</Typography>

        <Grid container spacing={1} sx={{ mt: 1, color: '#637381' }}>
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime fontSize="xs" />
            <Typography variant="caption">{ts.date}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight="bold">Hours: {ts.hours_worked} hrs</Typography>
          </Grid>
          <Grid item xs={6}>
             <Typography variant="caption" sx={{ color: '#555' }}>
              Contract: {ts.staff?.contracted_hours || 'N/A'} hrs
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
              Shift Time: {ts.start_time?.substring(0, 5)} - {ts.end_time?.substring(0, 5)}
            </Typography>
          </Grid>
        </Grid>

        {ts.status === 'pending' && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            {/* UPDATED: Pass click handler to open custom modal */}
            <Button 
              size="small" 
              color="error" 
              variant="outlined" 
              startIcon={<Cancel />} 
              onClick={() => handleUpdateStatusClick(ts.id, 'rejected')}
            >
              Reject
            </Button>
            <Button 
              size="small" 
              color="success" 
              variant="contained" 
              startIcon={<CheckCircle />} 
              onClick={() => handleUpdateStatusClick(ts.id, 'approved')}
            >
              Approve
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 700, color: '#0c1f3f' }}>
          Timesheet Approvals
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '5px solid #ff9800', boxShadow: 1 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="textSecondary" fontWeight={600}>Pending Review</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '5px solid #2e7d32', boxShadow: 1 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="textSecondary" fontWeight={600}>Approved Logs</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 'bold', color: '#2e7d32' }}>{stats.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '5px solid #1a5fba', boxShadow: 1 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="textSecondary" fontWeight={600}>Total Billable Hours</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 'bold', color: '#1a5fba' }}>{stats.totalHours} hrs</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, bgcolor: '#fff' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant={isMobile ? "scrollable" : "standard"}>
            <Tab label={`Pending Requests (${stats.pending})`} value="pending" />
            <Tab label="Approved Records" value="approved" />
            <Tab label="Rejected Records" value="rejected" />
            <Tab label="All Archives" value="all" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, bgcolor: '#fafafa', display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by Staff Name or Client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', md: 350 }, bgcolor: '#fff' }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : !isMobile ? (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Client/Care Home</TableCell>
                  <TableCell>Date Worked</TableCell>
                  <TableCell>Shift Window</TableCell>
                  <TableCell align="center">Hours Worked</TableCell>
                  <TableCell align="center">Contract Hrs</TableCell>
                  <TableCell>Status</TableCell>
                  {tabValue === 'pending' && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTimesheets.length > 0 ? (
                  filteredTimesheets.map((ts) => (
                    <TableRow key={ts.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#1a5fba', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {ts.staff_name?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ts.staff_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{ts.client_name}</TableCell>
                      <TableCell>{ts.date}</TableCell>
                      <TableCell sx={{ color: '#637381', fontSize: '0.85rem' }}>
                        {ts.start_time?.substring(0, 5)} - {ts.end_time?.substring(0, 5)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: '#0c1f3f' }}>
                        {ts.hours_worked} hrs
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#637381' }}>
                        {ts.staff?.contracted_hours || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={ts.status} size="small" color={ts.status === 'approved' ? 'success' : ts.status === 'rejected' ? 'error' : 'warning'} />
                      </TableCell>
                      {tabValue === 'pending' && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {/* UPDATED: Pass click handler to open custom modal */}
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleUpdateStatusClick(ts.id, 'rejected')}
                            >
                              <Cancel />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => handleUpdateStatusClick(ts.id, 'approved')}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tabValue === 'pending' ? 8 : 7} align="center" sx={{ py: 6 }}>
                      <Typography color="textSecondary">No relevant timesheet logs found matching selection filters.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 2 }}>
            {filteredTimesheets.length > 0 ? (
              filteredTimesheets.map(ts => <TimesheetCard key={ts.id} ts={ts} />)
            ) : (
              <Typography align="center" color="textSecondary" sx={{ py: 4 }}>No data metrics displayed.</Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      <Dialog 
        open={confirmModal.open} 
        onClose={() => setConfirmModal({ ...confirmModal, open: false })} 
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 400 } }}
      >
        <Box sx={{ 
            textAlign: 'center', 
            // Dynamic gradient based on action type
            background: confirmModal.actionType === 'approved' 
              ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
              : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#fff', 
            py: 4, 
            px: 2,
            position: 'relative'
          }}>
          <Avatar sx={{ 
              width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', 
              margin: '0 auto 16px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
            {confirmModal.actionType === 'approved' ? <CheckCircle sx={{ fontSize: 40, color: '#fff' }} /> : 
             <ErrorIcon sx={{ fontSize: 40, color: '#fff' }} />}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{confirmModal.title}</Typography>
        </Box>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            {confirmModal.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 0, gap: 2 }}>
          <Button 
            onClick={() => setConfirmModal({ ...confirmModal, open: false })}
            sx={{ borderRadius: 12, px: 3, height: 48, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <GradientButton 
            onClick={executeStatusUpdate} 
            colorType={confirmModal.actionType === 'approved' ? 'success' : 'error'}
            autoFocus
          >
            Confirm
          </GradientButton>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Timesheets;