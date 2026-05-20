import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon, Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Shifts = () => {
  // --- List State ---
  const [tabValue, setTabValue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Create/Edit Modal State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null); // For editing or assigning

  // --- Form Data ---
  const [formData, setFormData] = useState({
    date: '',
    start_time: '07:00',
    end_time: '15:00',
    role: 'Carer',
    client_id: '',
    notes: ''
  });

  // --- Reference Data (Dropdowns) ---
  const [clients, setClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchShifts();
    fetchClients(); // Pre-load clients for the dropdown
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);

    try {
      // FIX-01: Changed 'shift' to 'shifts' (Plural) for consistency
      // FIX-03: Changed care_homes!inner to !left so shifts without homes still show
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id,
          date,
          start_time,
          end_time,
          role,
          assigned_id,
          care_homes!left (name),
          staff!left (full_name)
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

  const fetchClients = async () => {
    const { data } = await supabase.from('care_homes').select('id, name');
    if (data) setClients(data);
  };

  const fetchAvailableStaff = async (role) => {
    // Simple fetch of staff matching the role. 
    // In production, you would also check 'staff_availability' table here.
    const { data } = await supabase
      .from('staff')
      .select('id, full_name, dbs_expiry')
      .eq('role', role)
      .eq('active', true);
    
    if (data) setAvailableStaff(data);
  };

  // ─────────────────────────────────────────────────────────────
  // FILTER LOGIC
  // ─────────────────────────────────────────────────────────────

  const filteredShifts = shifts.filter((shift) => {
    // Tab Filter
    if (tabValue === 'open' && shift.assigned_id) return false;
    if (tabValue === 'covered' && !shift.assigned_id) return false;

    // Search Filter
    const term = searchTerm.toLowerCase();
    const careHomeName = shift.care_homes?.name || '';
    const staffName = shift.staff?.full_name || '';

    return (
      careHomeName.toLowerCase().includes(term) ||
      shift.role.toLowerCase().includes(term) ||
      staffName.toLowerCase().includes(term)
    );
  });

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        // FIX-01: Using 'shifts' table
        await supabase.from('shifts').delete().eq('id', id);
        setShifts(shifts.filter(s => s.id !== id));
      } catch (err) {
        console.error("Error deleting shift:", err);
      }
    }
  };

  // --- Create/Edit Handlers ---
  const handleOpenCreateModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0], // Default to today
      start_time: '07:00',
      end_time: '15:00',
      role: 'Carer',
      client_id: '',
      notes: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!formData.client_id || !formData.date) {
      alert("Please fill in required fields.");
      return;
    }

    try {
      const { error } = await supabase.from('shifts').insert([{
        client_id: formData.client_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        role: formData.role,
        notes: formData.notes
      }]);

      if (error) throw error;
      
      setIsCreateModalOpen(false);
      fetchShifts(); // Refresh list
    } catch (err) {
      console.error("Error saving shift:", err);
      alert("Failed to save shift.");
    }
  };

  // --- Assignment Handlers ---
  const handleOpenAssignModal = (shift) => {
    setSelectedShift(shift);
    setAvailableStaff([]); // Reset previous list
    fetchAvailableStaff(shift.role); // Load staff for this specific role
    setIsAssignModalOpen(true);
  };

  const handleAssignStaff = async (staffId) => {
    if (!selectedShift) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_id: staffId })
        .eq('id', selectedShift.id);

      if (error) throw error;

      setIsAssignModalOpen(false);
      fetchShifts();
    } catch (err) {
      console.error("Error assigning staff:", err);
      alert("Failed to assign staff.");
    }
  };

  const handleUnassign = async (id) => {
    if (!window.confirm("Remove staff assignment?")) return;
    try {
      await supabase.from('shifts').update({ assigned_id: null }).eq('id', id);
      fetchShifts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shift Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          sx={{ bgcolor: '#1a5fba' }}
          onClick={handleOpenCreateModal} // BUG-10 FIXED: Added onClick
        >
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
                      {shift.care_homes?.name || <span style={{color:'red'}}>Unlinked</span>}
                    </TableCell>
                    <TableCell>
                      <Chip label={shift.role} variant="outlined" size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      {shift.assigned_id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
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
                      {!shift.assigned_id ? (
                        <Button 
                          size="small" 
                          variant="contained" 
                          sx={{ mr: 1 }}
                          onClick={() => handleOpenAssignModal(shift)} // BUG-10 FIXED: Added Handler
                        >
                          Assign
                        </Button>
                      ) : (
                        <Button 
                          size="small" 
                          color="warning" 
                          sx={{ mr: 1 }}
                          onClick={() => handleUnassign(shift.id)}
                        >
                          Unassign
                        </Button>
                      )}
                      <IconButton size="small" onClick={() => alert("Edit functionality coming in Phase 2")}>
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

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CREATE SHIFT MODAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Shift</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Care Home *</InputLabel>
            <Select
              value={formData.client_id}
              label="Care Home *"
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            >
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="date"
            label="Date *"
            InputLabelProps={{ shrink: true }}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              InputLabelProps={{ shrink: true }}
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <TextField
              fullWidth
              type="time"
              label="End Time"
              InputLabelProps={{ shrink: true }}
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <MenuItem value="Carer">Carer</MenuItem>
              <MenuItem value="Senior Carer">Senior Carer</MenuItem>
              <MenuItem value="Nurse">Nurse</MenuItem>
              <MenuItem value="Senior Nurse">Senior Nurse</MenuItem>
              <MenuItem value="Support Worker">Support Worker</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveShift} sx={{ bgcolor: '#1a5fba' }}>Save Shift</Button>
        </DialogActions>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ASSIGN STAFF MODAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Staff 
          <Typography variant="caption" display="block" color="textSecondary">
            {selectedShift?.role} required for {selectedShift?.care_homes?.name} on {selectedShift?.date}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {availableStaff.length === 0 ? (
             <Alert severity="info">No staff found matching this role.</Alert>
          ) : (
            availableStaff.map((staff) => (
              <Box 
                key={staff.id} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  py: 1, 
                  borderBottom: '1px solid #eee' 
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight="bold">{staff.full_name}</Typography>
                  {/* In a real app, check DBS expiry here and show a warning if expired */}
                </Box>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleAssignStaff(staff.id)}
                >
                  Assign
                </Button>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAssignModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Shifts;