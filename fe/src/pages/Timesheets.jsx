import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Avatar, Stack, Tabs, Tab, 
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Toolbar
} from '@mui/material';
import { 
  CheckCircle as ApproveIcon, 
  Cancel as RejectIcon, 
  Send as SubmitIcon,
  Search as SearchIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState([]);
  const [filterTab, setFilterTab] = useState(0); // 0=All, 1=Submitted, 2=Approved
  const [searchTerm, setSearchTerm] = useState(''); // New State for Search
  const [loading, setLoading] = useState(true);
  
  // State for Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTsId, setSelectedTsId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTimesheets(data || []);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      alert("Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setFilterTab(newValue);
  };

  // --- EXPORT TO CSV ---
  const handleExportCSV = () => {
    // 1. Filter the currently visible data
    const dataToExport = getFilteredData();

    if (dataToExport.length === 0) {
      alert("No data to export");
      return;
    }

    // 2. Define Headers
    const headers = ["Staff Name", "Date", "Start Time", "End Time", "Client", "Hours", "Status", "Notes"];
    
    // 3. Convert Rows to CSV string
    const csvRows = [
      headers.join(','), // Header row
      ...dataToExport.map(row => [
        `"${row.staff_name}"`, // Wrap in quotes to handle commas in names
        row.date,
        row.start_time,
        row.end_time,
        `"${row.client_name || ''}"`,
        row.hours_worked,
        row.status,
        `"${row.notes || ''}"`
      ].join(','))
    ];

    // 4. Create Blob and Download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `timesheets_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- FILTERING LOGIC (Search + Tabs) ---
  const getFilteredData = () => {
    return timesheets.filter(ts => {
      // 1. Tab Filter
      let matchesTab = true;
      if (filterTab === 1) matchesTab = ts.status === 'submitted';
      if (filterTab === 2) matchesTab = ts.status === 'approved';
      
      // 2. Search Filter (Case Insensitive)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (ts.staff_name && ts.staff_name.toLowerCase().includes(searchLower)) ||
        (ts.client_name && ts.client_name.toLowerCase().includes(searchLower));

      return matchesTab && matchesSearch;
    });
  };

  const filteredTimesheets = getFilteredData();

  // --- ACTIONS ---
  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      setTimesheets(timesheets.map(ts => ts.id === id ? { ...ts, status: 'approved' } : ts));
    } catch (error) {
      console.error("Error approving:", error);
      alert("Failed to approve timesheet");
    }
  };

  const openRejectModal = (id) => {
    setSelectedTsId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected', 
          notes: rejectionReason || 'No reason provided' 
        })
        .eq('id', selectedTsId);

      if (error) throw error;
      setTimesheets(timesheets.map(ts => ts.id === selectedTsId ? { ...ts, status: 'rejected' } : ts));
      setRejectModalOpen(false);
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Failed to reject timesheet");
    }
  };

  const handleSubmit = async (id) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ status: 'submitted' })
        .eq('id', id);

      if (error) throw error;
      setTimesheets(timesheets.map(ts => ts.id === id ? { ...ts, status: 'submitted' } : ts));
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit timesheet");
    }
  };

  // --- HELPERS ---
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'submitted': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'DM Serif Display, serif', color: '#0c1f3f', fontWeight: 400 }}>
          Timesheets
        </Typography>
        <Typography variant="body2" sx={{ color: '#5e7187' }}>
          Review and manage staff working hours
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', borderRadius: 2, p: 1, mb: 3, width: 'fit-content' }}>
        <Tabs value={filterTab} onChange={handleTabChange} sx={{ minHeight: 40 }}>
          <Tab label="All" sx={{ textTransform: 'none', minHeight: 40 }} />
          <Tab label="Pending Approval" sx={{ textTransform: 'none', minHeight: 40 }} />
          <Tab label="Approved" sx={{ textTransform: 'none', minHeight: 40 }} />
        </Tabs>
      </Box>

      {/* Toolbar: Search & Export */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #e1e8f4', mb: 2, overflow: 'hidden' }}>
        <Toolbar sx={{ gap: 2, bgcolor: '#fff' }}>
          {/* Search Bar */}
          <TextField
            placeholder="Search staff or client..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}

          {/* Export Button */}
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#475569' }}
          >
            Export CSV
          </Button>
        </Toolbar>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #e1e8f4', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f7f9fc' }}>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Care Home</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center">Loading...</TableCell></TableRow>
              ) : filteredTimesheets.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>No timesheets found.</TableCell></TableRow>
              ) : (
                filteredTimesheets.map((ts) => (
                  <TableRow key={ts.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1a5fba', fontSize: 12, fontWeight: 'bold' }}>
                          {getInitials(ts.staff_name)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a2535' }}>
                          {ts.staff_name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: '#334155' }}>
                      {new Date(ts.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: 13 }}>
                      {ts.start_time} – {ts.end_time}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: 13 }}>
                      {ts.client_name || '—'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1a5fba' }}>
                      {ts.hours_worked}h
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ts.status.charAt(0).toUpperCase() + ts.status.slice(1)} 
                        color={getStatusColor(ts.status)} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {ts.status === 'pending' && (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<SubmitIcon />}
                            onClick={() => handleSubmit(ts.id)}
                            sx={{ textTransform: 'none', fontSize: 11 }}
                          >
                            Submit
                          </Button>
                        )}
                        {ts.status === 'submitted' && (
                          <>
                            <Button 
                              size="small" 
                              color="success" 
                              variant="contained"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleApprove(ts.id)}
                              sx={{ textTransform: 'none', fontSize: 11 }}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="small" 
                              color="error"
                              variant="outlined"
                              startIcon={<RejectIcon />}
                              onClick={() => openRejectModal(ts.id)}
                              sx={{ textTransform: 'none', fontSize: 11 }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {(ts.status === 'approved' || ts.status === 'rejected') && (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {ts.status === 'rejected' && ts.notes ? `Reason: ${ts.notes}` : 'Completed'}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)}>
        <DialogTitle>Reject Timesheet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for rejection"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button onClick={handleRejectConfirm} variant="contained" color="error">
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}