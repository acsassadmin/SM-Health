import React, { useEffect, useState } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Paper, 
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Chip, Button, Divider, Stack, CircularProgress, 
  useMediaQuery, useTheme, Alert 
} from '@mui/material';


import { 
  People, Business, EventNote, Warning, 
  AssignmentTurnedIn, Add, TrendingUp, AccessTime 
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. COUNTS
      
      // Count Total Staff
      const { count: staffCount } = await supabase
        .from('staff') 
        .select('*', { count: 'exact', head: true });

      // Count Care Homes (TABLE: care-homes)
      const { count: homesCount } = await supabase
        .from('care-homes') 
        .select('*', { count: 'exact', head: true });
      
      
      const { count: openShiftsCount } = await supabase
        .from('shifts') 
        .select('*', { count: 'exact', head: true })
        .is('assigned_staff_id', null);

      // Count Pending Timesheets
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

      // 3. RECENT ACTIVITY
      // Joining shifts with care-homes
      const { data: activityData } = await supabase
        .from('shifts')
        .select(`
          id,
          date,
          created_at,
          care-homes ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activityData) {
        const formattedActivity = activityData.map(shift => {
          const dateStr = new Date(shift.created_at).toLocaleDateString();
          return {
            text: `Created shift at ${shift['care-homes']?.name || 'Unknown Care Home'}`,
            time: dateStr
          };
        });
        setRecentActivity(formattedActivity);
      }

    } catch (error) {
      console.error("Dashboard Error:", error);
      setDbError(error.message);
    } finally {
      setLoading(false);
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
    <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#f7f9fc', minHeight: '100%' }}>
      
      {/* --- HEADER --- */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 4, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 'bold', color: '#0c1f3f' }}>
            Director Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Live System Overview
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          sx={{ 
            bgcolor: '#1a5fba',
            width: { xs: '100%', sm: 'auto' },
            py: 1.5
          }}
        >
          Quick Action
        </Button>
      </Box>

      {/* --- ERROR ALERT --- */}
      {dbError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading data: {dbError}
        </Alert>
      )}

      {/* --- STATS GRID --- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
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
        
        {/* LEFT COLUMN */}
        <Grid item xs={12} md={8}>
          
          {/* DBS Alerts */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
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
                    <Button size="small" variant="text">Contact</Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                No DBS checks expiring in the next 30 days.
              </Typography>
            )}
          </Paper>

          {/* Recent Activity */}
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#0c1f3f' }}>
              🕒 Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {recentActivity.length > 0 ? (
                recentActivity.map((act, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText 
                      primary={act.text} 
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                           <AccessTime sx={{ fontSize: 12, mr: 0.5, color: 'text.secondary' }} />
                           <Typography variant="caption" color="textSecondary">
                            {act.time}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                  No recent activity found.
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'linear-gradient(135deg, #1a5fba 0%, #0c1f3f 100%)', color: 'white' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Quick Actions</Typography>
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Button fullWidth variant="contained" startIcon={<Add />} sx={{ bgcolor: 'white', color: '#1a5fba', py: 1.5, fontWeight: 'bold' }}>
                Create Shift
              </Button>
              <Button fullWidth variant="outlined" startIcon={<People />} sx={{ color: 'white', borderColor: 'white', py: 1.5 }}>
                Add Staff
              </Button>
              <Button fullWidth variant="outlined" startIcon={<TrendingUp />} sx={{ color: 'white', borderColor: 'white', py: 1.5 }}>
                View Reports
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ mt: 3, p: 3, borderRadius: 2, textAlign: 'center' }}>
             <Box sx={{ color: '#1a5fba' }}>
                <AccessTime sx={{ fontSize: 40 }} />
             </Box>
             <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold' }}>Need Help?</Typography>
             <Typography variant="body2" color="textSecondary">
                Contact support for assistance with rota management.
             </Typography>
             <Button variant="text" size="small" sx={{ mt: 1 }}>Contact Admin</Button>
          </Paper>
        </Grid>
      </Grid>
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
          <Typography variant="caption" color="textSecondary" sx={{ 
            textTransform: 'uppercase', 
            fontWeight: 'bold', 
            letterSpacing: 0.5,
            fontSize: '0.75rem'
          }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1, color: '#0c1f3f' }}>{value}</Typography>
        </Box>
        <Box sx={{ 
          p: 1.5, 
          bgcolor: `${color}15`, // 15 is opacity
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