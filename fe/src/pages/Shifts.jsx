import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, Chip, Avatar, IconButton,
  TextField, InputAdornment, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Grid, useMediaQuery, useTheme, Stack
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon, AccessTime, Business, Schedule, Person
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Shifts = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    role: '', 
    client_id: '',
    notes: '',
    pattern_code: ''
  });

  // --- Reference Data ---
  const [clients, setClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [roleCategories, setRoleCategories] = useState([]); 

  useEffect(() => {
    fetchShifts();
    fetchClients();
    fetchShiftPatterns();
    fetchRoleCategories(); 
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
          staff!left (id, first_name, last_name) 
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      setError("Failed to load shifts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('care_homes').select('id, name');
    if (data) setClients(data);
  };

  const fetchShiftPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_patterns')
        .select('code, name, start_time, end_time')
        .order('code', { ascending: true });

      if (error) throw error;
      if (data) setShiftPatterns(data);
    } catch (err) {
    }
  };

  const fetchRoleCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_role_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0 && !formData.role) {
        setFormData(prev => ({ ...prev, role: data[0].name }));
      }
      
      setRoleCategories(data || []);
    } catch (err) {
    }
  };

  const fetchAvailableStaff = async (role) => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .eq('role', role);

    if (error) {
    } else {
      setAvailableStaff(data || []);
    }
  };

  // --- TIMESHEETS ENGINE HELPER ---
  const syncTimesheetRecord = async (shiftId, date, startTime, endTime, clientId, staffId) => {
    try {
      // 1. Calculate calculated shifts parameters safely
      const startH = parseInt(startTime.split(':')[0]) || 0;
      const endH = parseInt(endTime.split(':')[0]) || 0;
      let hours = endH - startH;
      if (hours <= 0) hours += 24;

      // Get accurate customer name reference
      const { data: clientObj } = await supabase.from('care_homes').select('name').eq('id', clientId).single();
      const clientName = clientObj?.name || 'Unknown';

      if (!staffId) {
        // If no one is assigned, ensure no dangling pending timesheets exist for this shift
        await supabase.from('timesheets').delete().eq('shift_id', shiftId).eq('status', 'pending');
        return;
      }

      // Get precise staff profile identities
      const { data: staffObj } = await supabase.from('staff').select('first_name, last_name').eq('id', staffId).single();
      if (!staffObj) return;
      const staffFullName = `${staffObj.first_name} ${staffObj.last_name}`;

      // Upsert entry seamlessly based on unique `shift_id` identifier
      const { error } = await supabase
        .from('timesheets')
        .upsert({
          shift_id: shiftId,
          staff_id: staffId,
          staff_name: staffFullName,
          date: date,
          start_time: startTime,
          end_time: endTime,
          client_name: clientName,
          hours_worked: hours,
          status: 'pending'
        }, { onConflict: 'shift_id' });

      if (error) throw error;
    } catch (err) {
    }
  };

  // --- ACTIONS ---
  const handleSaveShift = async () => {
    if (!formData.client_id) {
      alert("Please select a Client.");
      return;
    }
    if (!formData.pattern_code) {
      alert("Please select a Shift Time pattern.");
      return;
    }

    try {
      let activeShiftId = editingShiftId;

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

        // Fetch assignment value context to run updates if changing global times
        const currentShift = shifts.find(s => s.id === editingShiftId);
        if (currentShift && currentShift.assigned_id) {
          await syncTimesheetRecord(
            editingShiftId,
            formData.date,
            formData.start_time,
            formData.end_time,
            formData.client_id,
            currentShift.assigned_id
          );
        }
      } else {
        const { data, error } = await supabase
          .from('shifts')
          .insert([{
            client_id: formData.client_id,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            role: formData.role,
            notes: formData.notes
          }])
          .select();
        if (error) throw error;
        if (data && data.length > 0) activeShiftId = data[0].id;
      }

      setIsCreateModalOpen(false);
      fetchShifts();
    } catch (err) {
      alert("Failed to save shift.");
    }
  };

  const handleAssignStaff = async (staffId) => {
    if (!selectedShift) return;
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_id: staffId })
        .eq('id', selectedShift.id);
      if (error) throw error;

      // Sync and inject data automatically inside Timesheet DB
      await syncTimesheetRecord(
        selectedShift.id,
        selectedShift.date,
        selectedShift.start_time,
        selectedShift.end_time,
        selectedShift.client_id,
        staffId
      );

      setIsAssignModalOpen(false);
      fetchShifts();
    } catch (err) {
      alert("Failed to assign staff.");
    }
  };

  const handleUnassign = async (id) => {
    if (!window.confirm("Remove staff assignment?")) return;
    try {
      const { error } = await supabase.from('shifts').update({ assigned_id: null }).eq('id', id);
      if (error) throw error;

      // Drop/Clear the connection to the pending entries inside Timesheet record automatically
      await supabase.from('timesheets').delete().eq('shift_id', id).eq('status', 'pending');
      
      fetchShifts();
    } catch (err) {
      alert("Failed to unassign.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        // Drop the connected pending timesheet before removing the core shift instance
        await supabase.from('timesheets').delete().eq('shift_id', id).eq('status', 'pending');

        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (error) throw error;
        
        fetchShifts();
      } catch (err) {
        alert("Failed to delete shift.");
      }
    }
  };

  const handleTimePatternChange = (e) => {
    const selectedCode = e.target.value;
    const pattern = shiftPatterns.find(p => p.code === selectedCode);

    if (pattern) {
      setFormData(prev => ({
        ...prev,
        pattern_code: selectedCode,
        start_time: pattern.start_time,
        end_time: pattern.end_time,
      }));
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingShiftId(null);
    const defaultRole = roleCategories.length > 0 ? roleCategories[0].name : '';
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      role: defaultRole,
      client_id: '',
      notes: '',
      pattern_code: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (shift) => {
    setIsEditing(true);
    setEditingShiftId(shift.id);

    const existingPattern = shiftPatterns.find(p =>
      p.start_time?.substring(0, 5) === shift.start_time?.substring(0, 5) &&
      p.end_time?.substring(0, 5) === shift.end_time?.substring(0, 5)
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

  const handleOpenAssignModal = (shift) => {
    setSelectedShift(shift);
    setAvailableStaff([]);
    fetchAvailableStaff(shift.role);
    setIsAssignModalOpen(true);
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

  const ShiftCard = ({ shift }) => (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Chip
            label={shift.role}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip
            label={shift.assigned_id ? 'Covered' : 'Open'}
            color={shift.assigned_id ? 'success' : 'warning'}
            size="small"
          />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0c1f3f', mb: 0.5 }}>
          {shift.care_homes?.name || <span style={{ color: 'red' }}>Unlinked</span>}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#637381' }}>
          <AccessTime fontSize="small" />
          <Typography variant="body2">
            {shift.date} • {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}
          </Typography>
        </Box>
        {shift.assigned_id ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
              {shift.staff?.first_name?.charAt(0) || '?'}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : 'Unknown Staff'}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#9e9e9e', fontStyle: 'italic', mb: 2 }}>
            Unassigned
          </Typography>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {!shift.assigned_id ? (
            <Button size="small" variant="contained" onClick={() => handleOpenAssignModal(shift)}>
              Assign
            </Button>
          ) : (
            <Button size="small" color="warning" variant="outlined" onClick={() => handleUnassign(shift.id)}>
              Unassign
            </Button>
          )}
          <IconButton size="small" onClick={() => handleOpenEditModal(shift)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(shift.id)}><DeleteIcon fontSize="small" /></IconButton>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) return <CircularProgress sx={{ m: 5 }} />;

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          Shift Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            bgcolor: '#1a5fba',
            width: { xs: '100%', sm: 'auto' },
            py: 1.5
          }}
          onClick={handleOpenCreateModal}
        >
          Create Shift
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', mb: 3 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant={isMobile ? "scrollable" : "standard"} scrollButtons={isMobile ? "auto" : false}>
            <Tab label="All Shifts" value="all" />
            <Tab label="Open" value="open" />
            <Tab label="Covered" value="covered" />
          </Tabs>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
          <TextField
            size="small"
            placeholder="Search by Client, Role, or Staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            fullWidth={isMobile}
            sx={{ width: { xs: '100%', md: 300 } }}
          />
        </Box>

        {/* Table / Cards */}
        {!isMobile ? (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Client</TableCell>
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
                      <TableCell>{shift.care_homes?.name || <span style={{ color: 'red' }}>Unlinked</span>}</TableCell>
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
                        <Chip label={shift.assigned_id ? 'Covered' : 'Open'} color={shift.assigned_id ? 'success' : 'warning'} size="small" variant="filled" />
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
        ) : (
          <Box sx={{ p: 2 }}>
            {filteredShifts.length > 0 ? (
              filteredShifts.map(shift => <ShiftCard key={shift.id} shift={shift} />)
            ) : (
              <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
                No shifts found.
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* --- CREATE / EDIT MODAL --- */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, boxShadow: '0 24px 54px rgba(0,0,0,0.15)', overflow: 'hidden' }
        }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)',
          color: 'white', py: 4, px: 4, display: 'flex', alignItems: 'center', gap: 2
        }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.15)', p: 1.5, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
          }}>
            <Schedule sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <DialogTitle sx={{ p: 0, m: 0, fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {isEditing ? 'Edit Shift Details' : 'Create New Shift'}
            </DialogTitle>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontWeight: 300 }}>
              {isEditing ? 'Update the shift parameters below.' : 'Fill in the structured details to schedule this shift.'}
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
          <Grid container spacing={3.5}>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel id="client-select-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
                  Client *
                </InputLabel>
                <Select
                  labelId="client-select-label"
                  value={formData.client_id}
                  displayEmpty
                  notched
                  label="Client *"
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  renderValue={(selected) => {
                    if (!selected) return <Typography color="textSecondary">Select a Client...</Typography>;
                    const client = clients.find(c => c.id === selected);
                    return client ? client.name : '';
                  }}
                >
                  <MenuItem value="" disabled><em>Select a Client...</em></MenuItem>
                  {clients.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Business fontSize="small" color="action" />
                        <Typography variant="body1">{c.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel id="pattern-select-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
                  Shift Time Pattern *
                </InputLabel>
                <Select
                  labelId="pattern-select-label"
                  value={formData.pattern_code}
                  displayEmpty
                  notched
                  label="Shift Time Pattern *"
                  onChange={handleTimePatternChange}
                  renderValue={(selected) => {
                    if (!selected) return <Typography color="textSecondary">Select a Time Pattern...</Typography>;
                    const pattern = shiftPatterns.find(p => p.code === selected);
                    return pattern ? (
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {pattern.code} — {pattern.name} ({pattern.start_time?.substring(0, 5)} - {pattern.end_time?.substring(0, 5)})
                      </Typography>
                    ) : selected;
                  }}
                >
                  <MenuItem value="" disabled><em>Select a Time Pattern...</em></MenuItem>
                  {shiftPatterns.map((p) => (
                    <MenuItem key={p.code} value={p.code}>
                      <Box sx={{ width: '100%', py: 0.5 }}>
                        <Typography variant="body2" fontWeight="600" color="primary.main">
                          {p.code} — {p.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                          Time slot: {p.start_time?.substring(0, 5)} to {p.end_time?.substring(0, 5)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date *"
                InputLabelProps={{ shrink: true }}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel id="role-select-label">Role *</InputLabel>
                <Select
                  labelId="role-select-label"
                  value={formData.role}
                  label="Role *"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {roleCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes & Special Instructions"
                placeholder="Add any specific requirements..."
                InputLabelProps={{ shrink: true }}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, px: 4, bgcolor: '#fff', borderTop: '1px solid #f0f0f0', gap: 1 }}>
          <Button onClick={() => setIsCreateModalOpen(false)} sx={{ color: '#6c757d', fontWeight: 600, textTransform: 'none', px: 3 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveShift} sx={{ bgcolor: '#1a5fba', px: 4, py: 1.25, borderRadius: 2, fontWeight: 'bold', textTransform: 'none' }}>
            {isEditing ? 'Save Changes' : 'Schedule Shift'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- ASSIGN STAFF MODAL --- */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Assign Staff to Shift
          <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
            Role: <strong>{selectedShift?.role}</strong> | Client: <strong>{selectedShift?.care_homes?.name}</strong> | Date: <strong>{selectedShift?.date}</strong>
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {availableStaff.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="info">No active staff found matching the role: <strong>{selectedShift?.role}</strong>.</Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Staff Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableStaff.map((staff) => (
                    <TableRow key={staff.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
                            {staff.first_name[0]}{staff.last_name[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight="bold">
                            {staff.first_name} {staff.last_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{selectedShift?.role}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" onClick={() => handleAssignStaff(staff.id)} startIcon={<Person />}>
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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