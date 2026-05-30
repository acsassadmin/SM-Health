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
  const [groupedAvailability, setGroupedAvailability] = useState([]); 
  const [staffList, setStaffList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    staff_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: 'Annual Leave',
    notes: ''
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
      
      // Normalize Staff IDs to Numbers
      const normalizedStaff = (staffData || []).map(s => ({ ...s, id: Number(s.id) }));
      setStaffList(normalizedStaff);

      // 2. Fetch Availability
      const { data: availData, error: availError } = await supabase
        .from('staff_availability')
        .select('*')
        .order('date', { ascending: true });

      if (availError) throw availError;

      // Enrich and Normalize IDs
      const enrichedData = (availData || []).map(record => {
        // CRITICAL: Convert IDs to Numbers immediately
        const numericId = Number(record.id);
        const numericStaffId = Number(record.staff_id);
        
        const staffMember = normalizedStaff.find(s => s.id === numericStaffId);
        
        return {
          ...record,
          id: numericId,
          staff_id: numericStaffId,
          staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff',
        };
      });

      setAvailability(enrichedData);
      processGroupedData(enrichedData);

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // --- GROUPING LOGIC ---
  const processGroupedData = (data) => {
    if (!data || data.length === 0) {
      setGroupedAvailability([]);
      return;
    }

    const sortedData = [...data].sort((a, b) => {
      if (a.staff_id !== b.staff_id) return a.staff_id - b.staff_id;
      return new Date(a.date) - new Date(b.date);
    });

    const groups = [];
    let currentGroup = null;

    sortedData.forEach(record => {
      // Use numeric IDs in key
      const requestKey = `${record.staff_id}-${record.reason}-${record.notes || ''}`;

      if (!currentGroup) {
        currentGroup = {
          key: requestKey,
          staff_id: record.staff_id,
          staff_name: record.staff_name,
          start_date: record.date,
          end_date: record.date,
          reason: record.reason,
          notes: record.notes,
          // Ensure ID is a number here as well
          rawIds: [Number(record.id)], 
          count: 1
        };
      } else {
        const prevDate = new Date(currentGroup.end_date);
        const currDate = new Date(record.date);
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (currentGroup.staff_id === record.staff_id && 
            currentGroup.reason === record.reason &&
            (currentGroup.notes || '') === (record.notes || '') &&
            diffDays === 1) {
          
          currentGroup.end_date = record.date;
          // Push number ID
          currentGroup.rawIds.push(Number(record.id));
          currentGroup.count++;

        } else {
          groups.push(currentGroup);
          currentGroup = {
            key: requestKey,
            staff_id: record.staff_id,
            staff_name: record.staff_name,
            start_date: record.date,
            end_date: record.date,
            reason: record.reason,
            notes: record.notes,
            rawIds: [Number(record.id)],
            count: 1
          };
        }
      }
    });

    if (currentGroup) groups.push(currentGroup);
    setGroupedAvailability(groups);
  };

  // --- HELPERS ---
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.staff_id || !formData.start_date || !formData.end_date) {
      alert('Please select a staff member and valid date range.');
      return;
    }

    try {
      const dateArray = [];
      let current = new Date(formData.start_date);
      const end = new Date(formData.end_date);

      while (current <= end) {
        dateArray.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      const recordsToInsert = dateArray.map(date => ({
        staff_id: Number(formData.staff_id),
        date: date,
        reason: formData.reason,
        notes: formData.notes
      }));

      const { error } = await supabase
        .from('staff_availability')
        .insert(recordsToInsert);

      if (error) throw error;
      fetchData(); 
      setIsModalOpen(false);
      setFormData({ staff_id: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: 'Annual Leave', notes: '' });
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save.");
    }
  };

  // --- UPDATED DELETE HANDLER WITH DEBUGGING ---
  const handleDelete = async (idsToDelete) => {
    console.log("Delete Triggered. IDs received:", idsToDelete);

    if (!idsToDelete || idsToDelete.length === 0) {
      console.error("No IDs provided to delete.");
      alert("Error: No records found to delete.");
      return;
    }

    if (!window.confirm(`Remove this block of ${idsToDelete.length} day(s)?`)) {
      return;
    }

    try {
      // Convert to Numbers (Double check)
      const numericIds = idsToDelete.map(id => Number(id));
      
      console.log("Sending delete request for IDs:", numericIds);

      const { data, error, count } = await supabase
        .from('staff_availability')
        .delete()
        .in('id', numericIds)
        .select(); // Selecting data helps confirm what was deleted

      console.log("Delete Response:", { data, error, count });

      if (error) {
        console.error("Supabase Delete Error:", error);
        throw error;
      }

      if (count === 0) {
         alert("No rows were deleted. The IDs might not exist or you don't have permission.");
         return;
      }

      alert("Leave removed successfully.");
      
      // Refresh Data
      await fetchData(); 

    } catch (error) {
      console.error("Error in handleDelete:", error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  // --- STATS LOGIC ---
  const unavailCountByStaff = availability.reduce((acc, curr) => {
    const name = curr.staff_name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const counts = Object.values(unavailCountByStaff);
  const maxUnavail = counts.length ? Math.max(...counts) : 1;

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        <Paper sx={{ borderRadius: 3, border: '1px solid #e1e8f4', overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e1e8f4' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a2535' }}>
              Unavailability Records
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f7f9fc' }}>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Date Range</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
                ) : groupedAvailability.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>No unavailability records found.</TableCell></TableRow>
                ) : (
                  groupedAvailability.map((group, index) => (
                    // Use group.key to ensure React tracks the row correctly
                    <TableRow key={group.key || index} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar 
                            sx={{ width: 32, height: 32, bgcolor: '#1a5fba', fontSize: 12, fontWeight: 'bold' }}
                          >
                            {getInitials(group.staff_name)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a2535' }}>
                            {group.staff_name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#334155' }}>
                        <Typography variant="body2">
                           {formatDate(group.start_date)} — {formatDate(group.end_date)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: 12 }}>
                        {group.count} Day{group.count > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={group.reason} 
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
                      <TableCell sx={{ color: '#64748b', fontSize: 12 }}>
                        {group.notes || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(group.rawIds)} 
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

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                    Start Date
                  </Typography>
                  <TextField
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleFormChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: '#f7f9fc' }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                    End Date
                  </Typography>
                  <TextField
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleFormChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: '#f7f9fc' }}
                  />
                </Box>
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

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                  Notes (Optional)
                </Typography>
                <TextField
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Add any details..."
                  multiline
                  rows={2}
                  fullWidth
                  sx={{ bgcolor: '#f7f9fc' }}
                />
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