import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Shifts = () => {
  // --- List State ---
  const [tabValue, setTabValue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Modal State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // --- Edit Mode State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);

  // --- Form Data ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '', 
    end_time: '',
    role: 'Carer', 
    client_id: '', 
    notes: '',
    pattern_code: '' 
  });

  // --- Reference Data ---
  const [clients, setClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);

  const STATIC_PATTERNS = [
    { code: 'R1', name: 'One-to-One R1 Day', start: '09:00', end: '21:00' },
    { code: 'R2', name: 'One-to-One R1 Night', start: '21:00', end: '09:00' },
    { code: 'R3', name: 'One-to-One R3 Day', start: '09:00', end: '21:00' },
    { code: 'R4', name: 'One-to-One R3 Night', start: '21:00', end: '09:00' },
    { code: 'R5', name: 'One-to-One R6 Day', start: '09:00', end: '19:00' },
    { code: 'R6', name: 'One-to-One R7 Day', start: '08:00', end: '20:00' },
    { code: 'R7', name: 'One-to-One R7 Night', start: '20:00', end: '08:00' },
    { code: 'R8', name: 'One-to-One R8 Day', start: '09:00', end: '21:00' },
    { code: 'R9', name: 'One-to-One R10 Day', start: '08:00', end: '20:00' },
    { code: 'GDP1', name: 'General Day', start: '07:30', end: '20:00' },
    { code: 'GNP1', name: 'General Night', start: '19:30', end: '08:00' },
  ];

  useEffect(() => {
    fetchShifts();
    fetchClients();
    // Removed fetchStaff() as we no longer need it for the modal
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id,
          client_id, 
          date,
          start_time,
          end_time,
          role,
          assigned_id,
          notes,
          care_homes!left (name),
          staff!left (first_name, last_name) 
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setError("Failed to load shifts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('care_homes').select('id, name');
    if (data) setClients(data);
  };

  const fetchAvailableStaff = async (role) => {
    // Fetches staff from the 'staff' table filtered by role
    const { data } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .eq('role', role)
      .eq('active', true); 
    
    if (data) setAvailableStaff(data);
  };

  const filteredShifts = shifts.filter((shift) => {
    if (tabValue === 'open' && shift.assigned_id) return false;
    if (tabValue === 'covered' && !shift.assigned_id) return false;

    const term = searchTerm.toLowerCase();
    const careHomeName = shift.care_homes?.name || '';
    const staffFullName = shift.staff 
      ? `${shift.staff.first_name} ${shift.staff.last_name}`.toLowerCase() 
      : '';

    return (
      careHomeName.toLowerCase().includes(term) ||
      shift.role.toLowerCase().includes(term) ||
      staffFullName.includes(term)
    );
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (error) throw error;
        fetchShifts(); 
      } catch (err) {
        console.error("Error deleting shift:", err);
        alert("Failed to delete shift.");
      }
    }
  };

  const handleTimePatternChange = (e) => {
    const selectedCode = e.target.value;
    const pattern = STATIC_PATTERNS.find(p => p.code === selectedCode);
    
    if (pattern) {
      setFormData(prev => ({
        ...prev,
        pattern_code: selectedCode,
        start_time: pattern.start,
        end_time: pattern.end,
      }));
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingShiftId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      role: 'Carer',
      client_id: '', 
      notes: '',
      pattern_code: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (shift) => {
    setIsEditing(true);
    setEditingShiftId(shift.id);
    
    const existingPattern = STATIC_PATTERNS.find(p => 
      p.start === shift.start_time?.substring(0, 5) && 
      p.end === shift.end_time?.substring(0, 5)
    );

    setFormData({
      id: shift.id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      role: shift.role,
      client_id: shift.client_id, 
      notes: shift.notes || '',
      pattern_code: existingPattern ? existingPattern.code : ''
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!formData.client_id || !formData.date) {
      alert("Please select a Care Home and Date.");
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      alert("Please select a Shift Time pattern.");
      return;
    }

    try {
      if (isEditing && editingShiftId) {
        const { error } = await supabase
          .from('shifts')
          .update({
            client_id: formData.client_id,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            role: formData.role,
            notes: formData.notes
          })
          .eq('id', editingShiftId);

        if (error) throw error;

      } else {
        // Create New Shift (Open, no assignment yet)
        const { error } = await supabase.from('shifts').insert([{
          client_id: formData.client_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          role: formData.role,
          notes: formData.notes
        }]);

        if (error) throw error;
      }
      
      setIsCreateModalOpen(false);
      fetchShifts();
    } catch (err) {
      console.error("Error saving shift:", err);
      alert("Failed to save shift.");
    }
  };

  // Helper to create timesheet entry
  const createTimesheetEntry = async (shiftData, staffData) => {
    const startH = parseInt(shiftData.start_time.split(':')[0]);
    const endH = parseInt(shiftData.end_time.split(':')[0]);
    let hours = endH - startH;
    if (hours < 0) hours += 24; 

    try {
      const { error } = await supabase
        .from('timesheets')
        .insert([{
          shift_id: shiftData.id,
          staff_id: staffData.id,
          staff_name: `${staffData.first_name} ${staffData.last_name}`,
          date: shiftData.date,
          start_time: shiftData.start_time,
          end_time: shiftData.end_time,
          client_name: shiftData.care_homes?.name || 'Unknown',
          hours_worked: hours,
          status: 'pending'
        }]);

      if (error) console.error("Failed to create auto-timesheet:", error);
    } catch (err) {
      console.error("Timesheet creation error:", err);
    }
  };

  const handleOpenAssignModal = (shift) => {
    setSelectedShift(shift);
    setAvailableStaff([]);
    // Fetch staff from 'staff' table matching the shift's role
    fetchAvailableStaff(shift.role);
    setIsAssignModalOpen(true);
  };

  const handleAssignStaff = async (staffId) => {
    if (!selectedShift) return;

    try {
      // 1. Update Shift Table
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_id: staffId })
        .eq('id', selectedShift.id);

      if (error) throw error;

      // 2. Get Staff Details (for name)
      // We fetch fresh details to ensure we have the correct name
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (staffData) {
        // 3. Create Timesheet Entry
        await createTimesheetEntry(selectedShift, staffData);
      }

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
      const { error } = await supabase.from('shifts').update({ assigned_id: null }).eq('id', id);
      if (error) throw error;
      fetchShifts();
    } catch (err) {
      console.error(err);
      alert("Failed to unassign.");
    }
  };

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shift Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          sx={{ bgcolor: '#1a5fba' }}
          onClick={handleOpenCreateModal}
        >
          Create Shift
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="All Shifts" value="all" />
            <Tab label="Open" value="open" />
            <Tab label="Covered" value="covered" />
          </Tabs>
        </Box>
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
                    <TableCell sx={{ fontWeight: 500 }}>{shift.date}</TableCell>
                    <TableCell sx={{ color: '#637381', fontSize: '0.9rem' }}>
                      {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}
                    </TableCell>
                    <TableCell>{shift.care_homes?.name || <span style={{color:'red'}}>Unlinked</span>}</TableCell>
                    <TableCell><Chip label={shift.role} variant="outlined" size="small" color="primary" /></TableCell>
                    <TableCell>
                      {shift.assigned_id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
                            {shift.staff?.first_name?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="body2">
                            {shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : 'Unknown Staff'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={shift.assigned_id ? 'Covered' : 'Open'} color={shift.assigned_id ? 'success' : 'warning'} size="small" variant="filled"/>
                    </TableCell>
                    <TableCell align="right">
                      {!shift.assigned_id ? (
                        <Button size="small" variant="contained" sx={{ mr: 1 }} onClick={() => handleOpenAssignModal(shift)}>Assign</Button>
                      ) : (
                        <Button size="small" color="warning" variant="outlined" sx={{ mr: 1 }} onClick={() => handleUnassign(shift.id)}>Unassign</Button>
                      )}
                      <IconButton size="small" onClick={() => handleOpenEditModal(shift)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(shift.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No shifts found matching your filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* CREATE / EDIT SHIFT MODAL */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
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

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Shift Time *</InputLabel>
            <Select
              value={formData.pattern_code}
              label="Shift Time *"
              onChange={handleTimePatternChange}
            >
              <MenuItem value=""><em>Select a time pattern...</em></MenuItem>
              {STATIC_PATTERNS.map((p) => (
                <MenuItem key={p.code} value={p.code}>
                  {p.name} ({p.start} - {p.end})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role *</InputLabel>
            <Select
              value={formData.role}
              label="Role *"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <MenuItem value="Carer">Carer</MenuItem>
              <MenuItem value="Senior Carer">Senior Carer</MenuItem>
              <MenuItem value="Nurse">Nurse</MenuItem>
              <MenuItem value="Senior Nurse">Senior Nurse</MenuItem>
              <MenuItem value="Support Worker">Support Worker</MenuItem>
            </Select>
          </FormControl>

          <TextField fullWidth multiline rows={2} label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveShift} sx={{ bgcolor: '#1a5fba' }}>
            {isEditing ? 'Update Shift' : 'Save Shift'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ASSIGN STAFF MODAL */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Staff 
          <Typography variant="caption" display="block" color="textSecondary">
            {selectedShift?.role} required for {selectedShift?.care_homes?.name} on {selectedShift?.date}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {availableStaff.length === 0 ? (
             <Alert severity="info">No active staff found matching the role: {selectedShift?.role}</Alert>
          ) : (
            availableStaff.map((staff) => (
              <Box key={staff.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
                <Box>
                  <Typography variant="body1" fontWeight="bold">{staff.first_name} {staff.last_name}</Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => handleAssignStaff(staff.id)}>Assign</Button>
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