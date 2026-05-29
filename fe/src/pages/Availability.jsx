import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Avatar, Card, CardContent, 
  LinearProgress, Stack, Modal, TextField, Select, MenuItem, 
  DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import { 
  Close as CloseIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
// IMPORT YOUR SUPABASE CLIENT HERE
import { supabase } from '../supabaseClient'; 

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    staff_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: 'Annual Leave'
  });

  useEffect(() => {
    fetchData();
  }, []);

    const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*');
      
      if (staffError) throw staffError;
      setStaffList(staffData || []);

      // 2. Fetch Availability (Simplified - NO JOIN)
      // We remove the nested 'staff' select to bypass the foreign key error for now
      const { data: availData, error: availError } = await supabase
        .from('staff_availability')
        .select('*')
        .order('date', { ascending: true });

      if (availError) throw availError;

      // Manually find names for the table
      const formattedAvail = (availData || []).map(record => {
        const staffMember = staffData.find(s => s.id === record.staff_id);
        return {
          id: record.id,
          staff_id: record.staff_id,
          staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff',
          date: record.date,
          reason: record.reason
        };
      });

      setAvailability(formattedAvail);

    } catch (error) {
      console.error("Full Error:", error);
      alert("Failed to load data. Check Console (F12).");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // --- HANDLERS ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.staff_id || !formData.date) {
      alert('Please select a staff member and a date.');
      return;
    }

    try {
      // 1. Find the selected staff object using the ID from the form
      const selectedStaff = staffList.find(s => s.id === Number(formData.staff_id));

      if (!selectedStaff) {
        alert('Staff member not found.');
        return;
      }

      // 2. INSERT INTO SUPABASE
      const { data, error } = await supabase
        .from('staff_availability')
        .insert([{
          staff_id: Number(formData.staff_id),
          date: formData.date,
          reason: formData.reason
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Update UI (Optimistic Update using the returned data)
      const newRecord = {
        id: data.id,
        staff_id: data.staff_id,
        staff_name: `${selectedStaff.first_name} ${selectedStaff.last_name}`,
        date: data.date,
        reason: data.reason
      };

      setAvailability([...availability, newRecord]);
      setIsModalOpen(false);
      
      // Reset Form
      setFormData({ staff_id: '', date: new Date().toISOString().split('T')[0], reason: 'Annual Leave' });

    } catch (error) {
      console.error("Error saving availability:", error);
      alert("Failed to save availability.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this availability record?')) {
      try {
        const { error } = await supabase
          .from('staff_availability')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update UI
        setAvailability(availability.filter(a => a.id !== id));

      } catch (error) {
        console.error("Error deleting record:", error);
        alert("Failed to delete record.");
      }
    }
  };

  // --- STATS LOGIC ---
  const unavailCountByStaff = availability.reduce((acc, curr) => {
    acc[curr.staff_name] = (acc[curr.staff_name] || 0) + 1;
    return acc;
  }, {});

  const counts = Object.values(unavailCountByStaff);
  const maxUnavail = counts.length ? Math.max(...counts) : 1;

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      {/* PAGE HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'DM sans', color: '#0c1f3f', fontWeight: 400 }}>
            Staff Availability
          </Typography>
          <Typography variant="body2" sx={{ color: '#5e7187' }}>
            Track leave, sickness, and unavailability days
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<CalendarIcon />}
          onClick={() => setIsModalOpen(true)}
          sx={{ 
            bgcolor: '#1a5fba', 
            textTransform: 'none',
            boxShadow: '0 2px 14px rgba(26,95,186,0.3)',
            '&:hover': { bgcolor: '#0f4d9a' }
          }}
        >
          Mark Unavailable
        </Button>
      </Box>

      {/* 2-COLUMN LAYOUT */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        
        {/* LEFT: AVAILABILITY LIST */}
        <Paper sx={{ borderRadius: 3, border: '1px solid #e1e8f4', overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e1e8f4' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a2535' }}>
              Unavailable Days
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f7f9fc' }}>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} align="center">Loading...</TableCell></TableRow>
                ) : availability.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>No unavailability records found.</TableCell></TableRow>
                ) : (
                  availability.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar 
                            sx={{ width: 32, height: 32, bgcolor: '#1a5fba', fontSize: 12, fontWeight: 'bold' }}
                          >
                            {getInitials(record.staff_name)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a2535' }}>
                            {record.staff_name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#334155' }}>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={record.reason} 
                          size="small" 
                          sx={{ 
                            bgcolor: '#fff7ed', 
                            color: '#92400e', 
                            border: '1px solid #fed7aa',
                            fontWeight: 600,
                            fontSize: 12
                          }} 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(record.id)}
                          sx={{ textTransform: 'none', fontSize: 12 }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* RIGHT: OVERVIEW STATS */}
        <Box>
          <Card sx={{ borderRadius: 3, border: '1px solid #e1e8f4', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1a2535' }}>
                Overview
              </Typography>
              <Box sx={{ mb: 2, color: '#5e7187', fontSize: 13 }}>
                Staff with the most days marked unavailable:
              </Box>

              <Stack spacing={3}>
                {Object.entries(unavailCountByStaff).map(([name, count]) => (
                  <Box key={name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#e8820c', fontWeight: 700 }}>
                        {count} day{count > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(count / maxUnavail) * 100} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 4, 
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { bgcolor: '#e8820c', borderRadius: 4 }
                      }} 
                    />
                  </Box>
                ))}
              </Stack>
              
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e1e8f4' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  {staffList.length - Object.keys(unavailCountByStaff).length} staff with no unavailability marked.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* MODAL: MARK UNAVAILABLE */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 4,
          boxShadow: 24,
          p: 0,
          overflow: 'hidden'
        }}>
          <Box sx={{ bgcolor: '#1a5fba', px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography id="modal-title" variant="h6" sx={{ color: '#fff', fontFamily: 'DM Sans', fontSize: 20 }}>
              Mark Unavailability
            </Typography>
            <IconButton onClick={() => setIsModalOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2}>
              {/* STAFF SELECT DROPDOWN */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                  Staff Member
                </Typography>
                <Select
                  fullWidth
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleFormChange}
                  displayEmpty
                  sx={{ bgcolor: '#f7f9fc' }}
                >
                  <MenuItem value="" disabled>Select a staff member</MenuItem>
                  {staffList.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} — {s.role}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                  Date
                </Typography>
                <TextField
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  fullWidth
                  sx={{ bgcolor: '#f7f9fc' }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                  Reason
                </Typography>
                <Select
                  name="reason"
                  value={formData.reason}
                  onChange={handleFormChange}
                  fullWidth
                  sx={{ bgcolor: '#f7f9fc' }}
                >
                  <MenuItem value="Annual Leave">Annual Leave</MenuItem>
                  <MenuItem value="Medical Appointment">Medical Appointment</MenuItem>
                  <MenuItem value="Family Commitment">Family Commitment</MenuItem>
                  <MenuItem value="Sick Leave">Sick Leave</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsModalOpen(false)} sx={{ textTransform: 'none', color: '#5e7187' }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              sx={{ bgcolor: '#1a5fba', textTransform: 'none', '&:hover': { bgcolor: '#0f4d9a' } }}
            >
              Save
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </Box>
  );
}