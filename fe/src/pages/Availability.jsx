import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Avatar, Card, CardContent, 
  LinearProgress, Stack, Modal, TextField, Select, MenuItem, 
  DialogTitle, DialogContent, DialogActions, IconButton, styled
} from '@mui/material';
import { 
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  CheckCircle
} from '@mui/icons-material';
// IMPORT YOUR SUPABASE CLIENT HERE
import { supabase } from '../supabaseClient'; 

// Custom Gradient Button for the Success Modal
const GradientButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #6366f1 30%, #a855f7 90%)',
  border: 0,
  borderRadius: 12,
  color: 'white',
  height: 48,
  padding: '0 30px',
  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
  fontSize: '16px',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': {
    boxShadow: '0 6px 20px rgba(168, 85, 247, 0.5)',
    background: 'linear-gradient(45deg, #4f46e5 30%, #9333ea 90%)',
  },
}));

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState([]); 
  const [groupedAvailability, setGroupedAvailability] = useState([]); 
  const [staffList, setStaffList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // Stores the profile of the logged-in user
  const [isAdmin, setIsAdmin] = useState(false); // Permission flag
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false); 
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
      // 1. Get the logged-in Auth User
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
       
        setLoading(false);
        return; 
      }

      // 2. Fetch Staff List to find the current user's profile and check permissions
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*');
      
      if (staffError) throw staffError;
      
      // Normalize Staff IDs
      const normalizedStaff = (staffData || []).map(s => ({ ...s, id: Number(s.id) }));

      // Find the logged-in user's profile matching by email
      const myProfile = normalizedStaff.find(s => s.email === user.email);
      
      // Determine if Admin (Assumes an 'is_admin' boolean column exists in your 'staff' table)
      // If you don't have this column, you can hardcode specific emails here or default to false.
      const userIsAdmin = myProfile?.is_admin === true; 

      setCurrentUser(myProfile);
      setIsAdmin(userIsAdmin);

      // 3. Fetch Availability based on permissions
      let query = supabase
        .from('staff_availability')
        .select('*')
        .order('date', { ascending: true });

      // RESTRICTION LOGIC: If not admin, only fetch data for the logged-in user
      if (!userIsAdmin && myProfile) {
        query = query.eq('staff_id', myProfile.id);
      }

      const { data: availData, error: availError } = await query;

      if (availError) throw availError;

      // Enrich and Normalize IDs
      const enrichedData = (availData || []).map(record => {
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

      // Set Staff List for UI
      // If not admin, only show the current user in the dropdown
      setStaffList(userIsAdmin ? normalizedStaff : (myProfile ? [myProfile] : []));

    } catch (error) {
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
    // Logic to ensure staff_id is set correctly even if input is disabled
    const staffIdToSave = isAdmin ? formData.staff_id : currentUser.id;

    if (!staffIdToSave || !formData.start_date || !formData.end_date) {
      alert('Please ensure all fields are valid.');
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
        staff_id: Number(staffIdToSave),
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
      setIsSuccessModalOpen(true);
      setFormData({ 
        staff_id: isAdmin ? '' : currentUser.id, // Preserve selection for Admins, reset for Users
        start_date: new Date().toISOString().split('T')[0], 
        end_date: new Date().toISOString().split('T')[0], 
        reason: 'Annual Leave', 
        notes: '' 
      });
    } catch (error) {
      alert("Failed to save.");
    }
  };

  const handleDelete = async (idsToDelete) => {

    if (!idsToDelete || idsToDelete.length === 0) {
      return;
    }

    if (!window.confirm(`Remove this block of ${idsToDelete.length} day(s)?`)) {
      return;
    }

    try {
      const numericIds = idsToDelete.map(id => Number(id));
      
      const { data, error, count } = await supabase
        .from('staff_availability')
        .delete()
        .in('id', numericIds)
        .select(); 

      if (error) throw error;

      if (count === 0) {
         alert("No rows were deleted.");
         return;
      }

      setIsSuccessModalOpen(true); 
      await fetchData(); 

    } catch (error) {
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
            {isAdmin ? "Manage all leave and unavailability" : "Manage your own leave and unavailability"}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<CalendarIcon />}
          onClick={() => {
            // Pre-fill staff_id if not admin
            if (!isAdmin && currentUser) {
                setFormData(prev => ({ ...prev, staff_id: currentUser.id }));
            }
            setIsModalOpen(true);
          }}
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
              {isAdmin ? "All Unavailability Records" : "My Unavailability Records"}
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
                 
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
                ) : groupedAvailability.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>No records found.</TableCell></TableRow>
                ) : (
                  groupedAvailability.map((group, index) => (
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
                {isAdmin ? "Staff with the most days marked unavailable:" : "Your unavailability stats:"}
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
                  {isAdmin 
                    ? `${staffList.length - Object.keys(unavailCountByStaff).length} staff with no unavailability marked.`
                    : "Keep your calendar up to date."
                  }
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* --- ADD UNAVAILABLE MODAL --- */}
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
              {/* Staff Selector - Only shown to Admins */}
              {isAdmin ? (
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
              ) : (
                // Non-Admin view: Just display their own name, locked
                <Box>
                   <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#64748b', mb: 1, display: 'block' }}>
                    Staff Member
                  </Typography>
                  <Box sx={{ 
                     bgcolor: '#f7f9fc', 
                     p: 2, 
                     borderRadius: 1, 
                     color: '#334155',
                     fontWeight: 600
                  }}>
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Loading...'}
                  </Box>
                </Box>
              )}

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

      {/* --- SUCCESS MODAL --- */}
      <Modal 
        open={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)}
        aria-labelledby="success-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 380,
          bgcolor: '#ffffff',
          borderRadius: 5,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          p: 0,
          textAlign: 'center',
          overflow: 'hidden',
          border: '1px solid #e0e7ff'
        }}>
          <Box sx={{
            height: 120,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              bgcolor: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(168, 85, 247, 0.4)',
              mt: 4
            }}>
              <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
            </Box>
          </Box>
          <Box sx={{ px: 4, pb: 4, pt: 6 }}>
            <Typography id="success-modal-title" variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1a2535', fontFamily: 'DM Sans' }}>
              Success!
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4, lineHeight: 1.5 }}>
              Your request has been processed and the records have been updated successfully.
            </Typography>
            <GradientButton 
                fullWidth 
                onClick={() => setIsSuccessModalOpen(false)}
            >
                Done
            </GradientButton>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}