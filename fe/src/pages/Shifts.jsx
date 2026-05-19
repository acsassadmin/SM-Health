import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon, 
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Shifts = () => {
  const [tabValue, setTabValue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Fetch Data from Supabase ---
  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch shifts and join with care_homes and staff tables
      // Adjust 'care_homes' and 'staff' if your foreign key column names are different
      const { data, error } = await supabase
        .from('shift')
        .select(`
          id,
          date,
          start_time,
          end_time,
          role,
          assigned_id,
          care_homes!inner (name), -- Assumes you have a care_homes table linked via care_home_id
          staff!left (full_name)      -- Assumes you have a staff table linked via assigned_id
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setError("Failed to load shifts. Please check your table relationships.");
    } finally {
      setLoading(false);
    }
  };

  // --- Filter Logic ---
  const filteredShifts = shifts.filter((shift) => {
    // 1. Tab Filter
    if (tabValue === 'open' && shift.assigned_id) return false;
    if (tabValue === 'covered' && !shift.assigned_id) return false;

    // 2. Search Filter (Searches Care Home, Role, and Staff Name)
    const term = searchTerm.toLowerCase();
    const careHomeName = shift.care_homes?.name || '';
    const staffName = shift.staff?.full_name || '';
    
    return (
      careHomeName.toLowerCase().includes(term) ||
      shift.role.toLowerCase().includes(term) ||
      staffName.toLowerCase().includes(term)
    );
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // --- Delete Handler ---
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await supabase.from('shift').delete().eq('id', id);
        setShifts(shifts.filter(s => s.id !== id));
      } catch (err) {
        console.error("Error deleting shift:", err);
      }
    }
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shift Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#1a5fba' }}>
          Create Shift
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', mb: 3 }}>
        {/* Filters */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="shift filters">
            <Tab label="All Shifts" value="all" />
            <Tab label="Open" value="open" />
            <Tab label="Covered" value="covered" />
          </Tabs>
        </Box>

        {/* Toolbar (Search) */}
        <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
          <TextField
            size="small"
            placeholder="Search by Care Home, Role, or Staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f3f4' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Care Home</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredShifts.length > 0 ? (
                filteredShifts.map((shift) => (
                  <TableRow key={shift.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {shift.date}
                    </TableCell>
                    <TableCell sx={{ color: '#637381', fontSize: '0.9rem' }}>
                      {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}
                    </TableCell>
                    <TableCell>
                      {shift.care_homes?.name || <span style={{color:'red'}}>No Link</span>}
                    </TableCell>
                    <TableCell>
                      <Chip label={shift.role} variant="outlined" size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      {shift.assigned_id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#e0e0e0', fontSize: '0.8rem' }}>
                            {shift.staff?.full_name?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="body2">{shift.staff?.full_name || 'Unknown Staff'}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={shift.assigned_id ? 'Covered' : 'Open'} 
                        color={shift.assigned_id ? 'success' : 'warning'} 
                        size="small" 
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!shift.assigned_id && (
                        <Button size="small" variant="contained" sx={{ mr: 1 }}>
                          Assign
                        </Button>
                      )}
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(shift.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No shifts found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Shifts;