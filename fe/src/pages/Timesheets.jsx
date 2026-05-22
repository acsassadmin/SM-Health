import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert, Card, CardContent,
  Grid, useMediaQuery, useTheme, Stack, Divider
} from '@mui/material';
import {
  Search as SearchIcon, CheckCircle, Cancel, AccessTime, 
  Business, Person, FileDownload
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Timesheets = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- State Management ---
  const [tabValue, setTabValue] = useState('pending'); // Default to pending reviews
  const [searchTerm, setSearchTerm] = useState('');
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Stats State ---
  const [stats, setStats] = useState({ pending: 0, approved: 0, totalHours: 0 });

  useEffect(() => {
    fetchTimesheets();
  }, [tabValue]); // Reload data when switching tabs

  // --- Fetch Timesheets ---
  const fetchTimesheets = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('timesheets')
        .select('*')
        .order('date', { ascending: false });

      // Filter based on active UI tab
      if (tabValue !== 'all') {
        query = query.eq('status', tabValue);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setTimesheets(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error("Error fetching timesheets:", err);
      setError("Failed to load timesheet records.");
    } finally {
      setLoading(false);
    }
  };

  // --- Calculate Dynamic Metrics ---
  const calculateStats = async (currentData) => {
    try {
      // Fetch total counts globally from the DB to keep stats accurate
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
      console.error("Error generating stats:", err);
    }
  };

  // --- Update Timesheet Status (Approve / Reject) ---
  const handleUpdateStatus = async (id, newStatus) => {
    const confirmationMsg = `Are you sure you want to mark this timesheet as ${newStatus}?`;
    if (!window.confirm(confirmationMsg)) return;

    try {
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Refresh list to update UI view
      fetchTimesheets();
    } catch (err) {
      console.error(`Error updating timesheet to ${newStatus}:`, err);
      alert(`Failed to update timesheet status to ${newStatus}.`);
    }
  };

  // --- Filter Logic ---
  const filteredTimesheets = timesheets.filter((ts) => {
    const term = searchTerm.toLowerCase();
    const staffName = ts.staff_name?.toLowerCase() || '';
    const clientName = ts.client_name?.toLowerCase() || '';
    
    return staffName.includes(term) || clientName.includes(term);
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // --- Mobile Card view layout ---
  const TimesheetCard = ({ ts }) => (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
              {ts.staff_name?.charAt(0) || '?'}
            </Avatar>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {ts.staff_name}
            </Typography>
          </Box>
          <Chip
            label={ts.status.toUpperCase()}
            color={ts.status === 'approved' ? 'success' : ts.status === 'rejected' ? 'error' : 'warning'}
            size="small"
          />
        </Box>

        <Typography variant="body1" sx={{ fontWeight: 600, color: '#0c1f3f', mt: 1 }}>
          {ts.client_name}
        </Typography>

        <Grid container spacing={1} sx={{ mt: 1, color: '#637381' }}>
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime fontSize="xs" />
            <Typography variant="caption">{ts.date}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight="bold">
              Hours: {ts.hours_worked} hrs
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
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => handleUpdateStatus(ts.id, 'rejected')}
            >
              Reject
            </Button>
            <Button
              size="small"
              color="success"
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={() => handleUpdateStatus(ts.id, 'approved')}
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
      
      {/* Title Header Block */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 700, color: '#0c1f3f' }}>
          Timesheet Approvals
        </Typography>
      </Box>

      {/* KPI Stats Analytics Metrics Rows */}
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

      {/* Data Operations Workspace Container */}
      <Paper sx={{ width: '100%', mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        
        {/* Navigation Tabs filter criteria layout control mapping */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, bgcolor: '#fff' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant={isMobile ? "scrollable" : "standard"}>
            <Tab label={`Pending Requests (${stats.pending})`} value="pending" />
            <Tab label="Approved Records" value="approved" />
            <Tab label="Rejected Records" value="rejected" />
            <Tab label="All Archives" value="all" />
          </Tabs>
        </Box>

        {/* Searching Filtering controls contextual wrapper */}
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

        {/* Content presentation grid switch responsive structure engine mapping rendering */}
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
                  <TableCell>Status</TableCell>
                  {tabValue === 'pending' && <TableCell align="right">Actions Evaluation</TableCell>}
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
                      <TableCell>
                        <Chip
                          label={ts.status}
                          size="small"
                          color={ts.status === 'approved' ? 'success' : ts.status === 'rejected' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      {tabValue === 'pending' && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              color="error"
                              title="Reject Records Entry"
                              onClick={() => handleUpdateStatus(ts.id, 'rejected')}
                            >
                              <Cancel />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="success"
                              title="Approve Status Record"
                              onClick={() => handleUpdateStatus(ts.id, 'approved')}
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
                    <TableCell colSpan={tabValue === 'pending' ? 7 : 6} align="center" sx={{ py: 6 }}>
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
    </Box>
  );
};

export default Timesheets;