import React, { useEffect, useState } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, Paper, 
  List, ListItem, ListItemText, Chip, Button, 
  Divider, Stack, CircularProgress 
} from '@mui/material';
import { 
  People, Business, EventNote, Warning, AccessTime, 
  AssignmentTurnedIn, Add, TrendingUp 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalCareHomes: 0,
    openShifts: 0,
    expiringDBS: 0,
    pendingTimesheets: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // 1. Count Total Staff
      // CHANGE 'staff' TO 'profiles' IF THAT IS YOUR TABLE NAME
      const { count: staffCount } = await supabase
        .from('staff') 
        .select('*', { count: 'exact', head: true });

      // 2. Count Care Homes
      const { count: homesCount } = await supabase
        .from('care_homes') 
        .select('*', { count: 'exact', head: true });

      // 3. Count Open Shifts (Shifts without assigned staff)
      const { count: openShiftsCount } = await supabase
        .from('shifts') 
        .select('*', { count: 'exact', head: true })
        .is('assigned_id', null);

     
      const expiringDBSCount = 0; 

      // 5. Count Pending Timesheets
      const { count: pendingCount } = await supabase
        .from('timesheets') 
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalStaff: staffCount || 0,
        totalCareHomes: homesCount || 0,
        openShifts: openShiftsCount || 0,
        expiringDBS: expiringDBSCount,
        pendingTimesheets: pendingCount || 0,
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'serif', fontWeight: 'bold', color: '#0c1f3f' }}>
            Director Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Live System Overview
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#1a5fba' }}>
          Quick Action
        </Button>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Active Staff" 
            value={stats.totalStaff} 
            icon={<People sx={{ color: '#1a5fba' }} />} 
            color="#1a5fba" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Care Homes" 
            value={stats.totalCareHomes} 
            icon={<Business sx={{ color: '#2e7d32' }} />} 
            color="#2e7d32" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Open Shifts" 
            value={stats.openShifts} 
            icon={<EventNote sx={{ color: '#ed6c02' }} />} 
            color="#ed6c02" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="DBS Expiring" 
            value={stats.expiringDBS} 
            icon={<Warning sx={{ color: '#d32f2f' }} />} 
            color="#d32f2f" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Pending Timesheets" 
            value={stats.pendingTimesheets} 
            icon={<AssignmentTurnedIn sx={{ color: '#0288d1' }} />} 
            color="#0288d1" 
          />
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Alerts Column */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Alerts & Actions</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <AlertItem 
              title="DBS Expiry Alert" 
              subtitle={`${stats.expiringDBS} staff members have DBS checks expiring.`} 
              type="error" 
              action="Review Now"
            />
            <AlertItem 
              title="Unassigned Shifts" 
              subtitle={`${stats.openShifts} shifts this week require staff assignment.`} 
              type="warning" 
              action="Assign Staff"
            />
            <AlertItem 
              title="Pending Timesheets" 
              subtitle={`${stats.pendingTimesheets} timesheets awaiting approval.`} 
              type="info" 
              action="Approve"
            />
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Recent Activity</Typography>
            <List>
              <ActivityItem text="Assigned Sarah Connor to Sunnybrook Care" time="2 mins ago" />
              <ActivityItem text="Created new shift at Riverside Lodge" time="1 hour ago" />
              <ActivityItem text="Approved timesheets for Week 42" time="3 hours ago" />
            </List>
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6" gutterBottom>Quick Links</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button fullWidth variant="contained" startIcon={<Add />}>Create Shift</Button>
              <Button fullWidth variant="outlined" startIcon={<People />}>Add Staff</Button>
              <Button fullWidth variant="outlined" startIcon={<TrendingUp />}>View Reports</Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// --- HELPER COMPONENTS ---

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ borderTop: `4px solid ${color}`, height: '100%', boxShadow: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1, color: '#0c1f3f' }}>{value}</Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: `${color}20`, borderRadius: 1 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const AlertItem = ({ title, subtitle, type, action }) => {
  const colors = {
    error: { bg: '#ffebee', border: '#ef9a9a', text: '#c62828' },
    warning: { bg: '#fff3e0', border: '#ffcc80', text: '#ef6c00' },
    info: { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0' },
  };
  const theme = colors[type] || colors.info;

  return (
    <Box 
      sx={{ 
        p: 2, 
        mb: 2, 
        borderRadius: 1, 
        borderLeft: `4px solid ${theme.border}`, 
        bgcolor: theme.bg,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.text }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Box>
      <Button size="small" variant="outlined" sx={{ ml: 2, borderColor: theme.border, color: theme.text }}>
        {action}
      </Button>
    </Box>
  );
};

const ActivityItem = ({ text, time }) => (
  <ListItem sx={{ px: 0 }}>
    <ListItemText 
      primary={text} 
      secondary={time} 
      secondaryTypographyProps={{ fontSize: '0.85rem' }}
    />
  </ListItem>
);

export default Dashboard;