import React, { useEffect, useState } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Paper, 
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Chip, Button, Divider, Stack, CircularProgress, 
  useMediaQuery, useTheme, Alert, Badge, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material';
import { 
  People, Business, EventNote, Warning, 
  AssignmentTurnedIn, Add, AccessTime, 
  AssignmentInd, Person as PersonIcon 
} from '@mui/icons-material'; 

import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalCareHomes: 0,
    openShifts: 0,
    expiringDBS: 0,
    pendingTimesheets: 0,
  });
  
  const [expiringStaffList, setExpiringStaffList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]); 
  const [unassignedShifts, setUnassignedShifts] = useState([]); 

  // --- New State for Assignment Modal ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. COUNTS
      const { count: staffCount } = await supabase
        .from('staff') 
        .select('*', { count: 'exact', head: true });

      const { count: homesCount } = await supabase
        .from('care_homes') 
        .select('*', { count: 'exact', head: true });
      
      const { count: openShiftsCount } = await supabase
        .from('shifts') 
        .select('*', { count: 'exact', head: true })
        .is('assigned_id', null); 

      const { count: pendingCount } = await supabase
        .from('timesheets') 
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'); 

      setStats({
        totalStaff: staffCount || 0,
        totalCareHomes: homesCount || 0,
        openShifts: openShiftsCount || 0,
        expiringDBS: 0, 
        pendingTimesheets: pendingCount || 0,
      });

      // 2. DBS EXPIRY LOGIC
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: expiringData } = await supabase
        .from('staff')
        .select('id, first_name, last_name, dbs_expiry')
        .lt('dbs_expiry', thirtyDaysFromNow.toISOString())
        .order('dbs_expiry', { ascending: true })
        .limit(5);

      setExpiringStaffList(expiringData || []);
      setStats(prev => ({ ...prev, expiringDBS: (expiringData?.length || 0) }));

      // 3. RECENT ACTIVITY (LAST 5 ASSIGNED SHIFTS)
      const { data: shiftData } = await supabase
        .from('shifts')
        .select(`
          id,
          date,
          created_at,
          assigned_id,
          care_homes ( name ),
          staff ( first_name, last_name )
        `)
        .not('assigned_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5); 

      if (shiftData) {
        const formattedActivity = shiftData.map(shift => {
          const careHomeName = shift.care_homes?.name || 'Unknown Care Home';
          const dateStr = new Date(shift.created_at).toLocaleDateString();
          const staffName = shift.staff 
            ? `${shift.staff.first_name} ${shift.staff.last_name}` 
            : 'Unknown Staff';

          return {
            id: shift.id,
            text: `Assigned ${staffName} to shift at ${careHomeName}`,
            time: dateStr,
            careHome: careHomeName,
            staffName: staffName // Added for easier table rendering
          };
        });
        setRecentActivity(formattedActivity);
      }

      // 4. UNASSIGNED SHIFTS (LAST 7)
      const { data: unassignedData } = await supabase
        .from('shifts')
        .select(`
          id,
          date,
          start_time,
          end_time,
          role,
          care_homes ( name )
        `)
        .is('assigned_id', null) 
        .order('date', { ascending: true }) 
        .limit(7); 

      setUnassignedShifts(unassignedData || []);

    } catch (error) {
      console.error("Dashboard Error:", error);
      setDbError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Assign Modal Logic ---

  const fetchAvailableStaff = async (role) => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, role')
      .eq('role', role);

    if (error) {
      console.error("Error fetching staff:", error);
    } else {
      setAvailableStaff(data || []);
    }
  };

  const handleOpenAssignModal = (shift) => {
    setSelectedShift(shift);
    setAvailableStaff([]);
    fetchAvailableStaff(shift.role);
    setIsAssignModalOpen(true);
  };

  const handleAssignStaff = async (staffId) => {
    if (!selectedShift) return;
    try {
      // 1. Update Shift
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_id: staffId })
        .eq('id', selectedShift.id);
      if (error) throw error;

      // 2. Create Timesheet Entry
      const startH = parseInt(selectedShift.start_time.split(':')[0]);
      const endH = parseInt(selectedShift.end_time.split(':')[0]);
      let hours = endH - startH;
      if (hours < 0) hours += 24;

      await supabase
        .from('timesheets')
        .insert([{
          shift_id: selectedShift.id,
          staff_id: staffId,
          date: selectedShift.date,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
          client_name: selectedShift.care_homes?.name || 'Unknown',
          hours_worked: hours,
          status: 'pending'
        }]);

      // 3. Refresh and Close
      setIsAssignModalOpen(false);
      fetchDashboardData(); // Refresh dashboard lists
    } catch (err) {
      console.error("Error assigning staff:", err);
      alert("Failed to assign staff.");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#1a5fba' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, bgcolor: '#f7f9fc', minHeight: '100%' }}>
      
      {/* --- HEADER --- */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: { xs: 2, sm: 4 }, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'DM sans', fontWeight: 'bold', color: '#0c1f3f' }}>
            Director Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Live System Overview
          </Typography>
        </Box>
      </Box>

      {/* --- ERROR ALERT --- */}
      {dbError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading data: {dbError}
        </Alert>
      )}

      {/* --- STATS GRID (UPDATED FOR 5 IN ONE ROW) --- */}
      <Grid container spacing={2} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Active Staff" value={stats.totalStaff} icon={<People />} color="#1a5fba" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Clients" value={stats.totalCareHomes} icon={<Business />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Open Shifts" value={stats.openShifts} icon={<EventNote />} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="DBS Expiring" value={stats.expiringDBS} icon={<Warning />} color="#d32f2f" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Pending Timesheets" value={stats.pendingTimesheets} icon={<AssignmentTurnedIn />} color="#0288d1" />
        </Grid>
      </Grid>

      {/* --- CONTENT GRID --- */}
      <Grid container spacing={3}>
        
        {/* --- 2-COLUMN SECTION --- */}
        
        {/* DBS Alerts - Left Column */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: 2, borderTop: '4px solid #d32f2f' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0c1f3f' }}>
                ⚠️ DBS Expiry Alerts
              </Typography>
              {stats.expiringDBS > 0 && (
                <Chip label={`${stats.expiringDBS} Action Required`} color="error" size="small" />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {expiringStaffList.length > 0 ? (
              <List dense>
                {expiringStaffList.map((staff) => (
                  <ListItem key={staff.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ mr: 2, bgcolor: '#ffebee', color: '#d32f2f' }}>
                        {staff.first_name[0]}{staff.last_name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${staff.first_name} ${staff.last_name}`} 
                      secondary={
                        <Box component="span" sx={{ color: '#d32f2f' }}>
                          Expires: {new Date(staff.dbs_expiry).toLocaleDateString()}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                No DBS checks expiring in the next 30 days.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Unassigned Shifts - Right Column */}
        <Grid item xs={12} md={6}>
           <Paper sx={{ height: '100%', borderRadius: 2, boxShadow: 2, borderTop: '4px solid #ed6c02' }}>
             <Box sx={{ 
                 p: 2, 
                 bgcolor: '#fff3e0', 
                 display: 'flex',
                 alignItems: 'center',
                 gap: 1
             }}>
                <AssignmentInd sx={{ color: '#e65100' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#e65100' }}>
                    Unassigned Shifts (Last 7)
                </Typography>
             </Box>
             
             <List sx={{ px: 1, py: 0, maxHeight: 400, overflowY: 'auto' }}>
                {unassignedShifts.length > 0 ? (
                    unassignedShifts.map((shift) => (
                        <ListItem key={shift.id} sx={{ 
                            borderBottom: '1px solid #f0f0f0',
                            py: 1.5,
                            px: 2,
                            flexDirection: 'column', 
                            alignItems: 'flex-start'
                        }}>
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                <Box>
                                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#0c1f3f' }}>
                                        {shift.care_homes?.name || 'Unknown Care Home'}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {shift.date} • {shift.start_time?.substring(0,5)} - {shift.end_time?.substring(0,5)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                                    <Chip label={shift.role} size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    <Button 
                                        size="small" 
                                        variant="contained" 
                                        sx={{ mt: { xs: 1, sm: 0 }, fontSize: '0.75rem', py: 0.5, bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' }, flexShrink: 0 }}
                                        onClick={() => handleOpenAssignModal(shift)}
                                    >
                                        Assign Now
                                    </Button>
                                </Box>
                            </Box>
                        </ListItem>
                    ))
                ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                            No unassigned shifts. Great job!
                        </Typography>
                    </Box>
                )}
             </List>
             {unassignedShifts.length > 0 && (
                 <Box sx={{ p: 1.5, borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                     <Button variant="text" size="small" sx={{ color: '#1a5fba', fontWeight: 'bold' }}>
                        View All Unassigned
                     </Button>
                 </Box>
             )}
          </Paper>
        </Grid>

        {/* --- FULL WIDTH SECTION --- */}

        {/* Recent Activity - Full Width (HTML Design Style) */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, borderTop: '4px solid #1a5fba' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0c1f3f' }}>
                    🕒 Recent Activity
                </Typography>
                {recentActivity.length === 0 && (
                    <Typography variant="caption" color="textSecondary">No recent assignments</Typography>
                )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {/* Full Width Table Container */}
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: '#5e7187', textTransform: 'uppercase', fontSize: '0.75rem' }}>Staff Member</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#5e7187', textTransform: 'uppercase', fontSize: '0.75rem' }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#5e7187', textTransform: 'uppercase', fontSize: '0.75rem' }}>Care Home</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#5e7187', textTransform: 'uppercase', fontSize: '0.75rem' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#5e7187', textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentActivity.length > 0 ? (
                                recentActivity.map((act) => (
                                    <TableRow key={act.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#1a5fba', fontSize: '0.8rem' }}>
                                                    {act.staffName ? act.staffName.charAt(0) : '?'}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight="bold" sx={{ color: '#1a2535' }}>
                                                    {act.staffName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>Shift Assigned</TableCell>
                                        <TableCell sx={{ color: '#1a2535' }}>{act.careHome}</TableCell>
                                        <TableCell sx={{ color: '#5e7187', fontSize: '0.875rem' }}>{act.time}</TableCell>
                                        <TableCell>
                                            <Chip label="Confirmed" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 'bold', fontSize: '0.7rem' }} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="textSecondary">
                                            No recent activity found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
          </Paper>
        </Grid>

      </Grid>

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
              <Alert severity="info">
                No active staff found matching the role: <strong>{selectedShift?.role}</strong>.
                <br />
                <Typography variant="caption" sx={{ mt: 1 }}>
                  Please check your Staff Directory to ensure staff have this exact role assigned.
                </Typography>
              </Alert>
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
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAssignStaff(staff.id)}
                          startIcon={<PersonIcon />}
                        >
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

// --- HELPER COMPONENTS ---

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ 
    borderTop: `5px solid ${color}`, 
    height: '100%', 
    boxShadow: 3,
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-5px)' }
  }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="TextSecondary" sx={{ 
            textTransform: 'uppercase', 
            fontWeight: 'bold', 
            letterSpacing: 0.5,
            fontSize: { xs: '0.65rem', md: '0.75rem' } // Slightly smaller text on mobile to fit
          }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1, color: '#0c1f3f', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ 
          p: 1, 
          bgcolor: `${color}15`, 
          borderRadius: 2,
          color: color
        }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default Dashboard;