import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, IconButton, Chip, Avatar,
  Drawer, List, ListItem, ListItemText, ListItemAvatar, Button,
  Divider, CircularProgress, Tooltip, useTheme
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Today, AccessTime, Person,
  Warning as WarningIcon, Add as AddIcon, EventNote
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

// --- Mock Data (Replace with real Supabase fetch later) ---
const MOCK_SHIFTS = [
  { id: 1, date: '2023-10-25', start: '07:00', end: '15:00', client: 'Sunnybrook Care', role: 'Carer', assignedTo: 'Sarah Connor' },
  { id: 2, date: '2023-10-25', start: '08:00', end: '16:00', client: 'Riverside Lodge', role: 'Nurse', assignedTo: null },
  { id: 3, date: '2023-10-26', start: '09:00', end: '17:00', client: 'Maple House', role: 'Support', assignedTo: 'John Doe' },
  { id: 4, date: '2023-10-26', start: '19:00', end: '07:00', client: 'Sunnybrook Care', role: 'Carer', assignedTo: 'Alice Wonderland' },
  { id: 5, date: '2023-10-27', start: '07:00', end: '19:00', client: 'The Willows', role: 'Senior Carer', assignedTo: 'Bob Builder' },
];

const Rota = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch shifts (Mock function for now)
  useEffect(() => {
    // In real app: fetch from Supabase where date is in current month
    setShifts(MOCK_SHIFTS);
  }, [currentDate]);

  // --- Calendar Logic ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Adjust so Monday is first (0) and Sunday is last (6)
    const adjustment = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    return { days, adjustment };
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setDrawerOpen(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Nurse': return '#d32f2f'; // Red
      case 'Senior Carer': return '#2e7d32'; // Green
      case 'Carer': return '#1a5fba'; // Brand Blue
      case 'Support': return '#7b1fa2'; // Purple
      default: return '#637381';
    }
  };

  // --- Render Helpers ---
  const { days, adjustment } = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const blanks = Array.from({ length: adjustment });

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Toolbar / Header --- */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontFamily: 'serif', minWidth: 200 }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handlePrevMonth}><ChevronLeft /></IconButton>
            <Button variant="outlined" onClick={handleToday} startIcon={<Today />}>Today</Button>
            <IconButton onClick={handleNextMonth}><ChevronRight /></IconButton>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip label="Month" color="primary" variant="outlined" />
          <Chip label="Week" sx={{ opacity: 0.5 }} />
          <Chip label="Year" sx={{ opacity: 0.5 }} />
          <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#1a5fba' }}>
            Add Shift
          </Button>
        </Box>
      </Paper>

      {/* --- Calendar Grid --- */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Weekday Headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: '#f1f3f4', p: 1 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <Typography key={day} align="center" variant="caption" fontWeight="bold" color="#637381">
              {day}
            </Typography>
          ))}
        </Box>

        {/* Days Grid */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          <Grid container spacing={0.5}>
            {/* Padding Days */}
            {blanks.map((_, i) => (
              <Grid item xs={12/7} key={`blank-${i}`}>
                <Box sx={{ height: 140, bgcolor: '#fafafa', border: '1px solid #eee' }} />
              </Grid>
            ))}

            {/* Actual Days */}
            {daysArray.map((day) => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayShifts = shifts.filter(s => s.date === dateStr);
              const coveredCount = dayShifts.filter(s => s.assignedTo).length;
              const unassignedCount = dayShifts.length - coveredCount;
              const coveragePct = dayShifts.length ? (coveredCount / dayShifts.length) * 100 : 0;
              
              // Color for coverage bar
              let coverageColor = '#d32f2f'; // Red
              if (coveragePct === 100) coverageColor = '#2e7d32'; // Green
              else if (coveragePct >= 50) coverageColor = '#ed6c02'; // Orange

              return (
                <Grid item xs={12/7} key={day}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      height: 140, 
                      p: 1, 
                      border: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: '0.2s',
                      position: 'relative',
                      '&:hover': { bgcolor: '#e3f2fd', borderColor: '#1a5fba' },
                      bgcolor: '#fff'
                    }}
                    onClick={() => handleDayClick(dateStr)}
                  >
                    {/* Header: Date + Alert Dot */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{day}</Typography>
                      {unassignedCount > 0 && (
                        <WarningIcon sx={{ fontSize: 12, color: '#d32f2f' }} />
                      )}
                    </Box>

                    {/* Shift Chips */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1 }}>
                      {dayShifts.slice(0, 3).map((shift) => (
                        <Chip
                          key={shift.id}
                          size="small"
                          label={`${shift.start} ${shift.assignedTo ? '· ' + shift.assignedTo.split(' ')[0] : ''}`}
                          sx={{ 
                            height: 24, fontSize: '0.7rem', 
                            bgcolor: `${getRoleColor(shift.role)}20`, 
                            color: getRoleColor(shift.role),
                            border: `1px solid ${getRoleColor(shift.role)}50`,
                            '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                          }}
                        />
                      ))}
                      {dayShifts.length > 3 && (
                        <Typography variant="caption" sx={{ color: '#1a5fba', cursor: 'pointer' }}>
                          +{dayShifts.length - 3} more
                        </Typography>
                      )}
                    </Box>

                    {/* Footer: Coverage Bar */}
                    <Box sx={{ mt: 'auto', height: 4, bgcolor: '#eee', borderRadius: 1, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          width: `${coveragePct}%`, 
                          bgcolor: coverageColor,
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>

      {/* --- Side Panel (Drawer) --- */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 350, borderTop: `4px solid #1a5fba` } }}
      >
        {selectedDate && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 2, bgcolor: '#f4f6f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontFamily: 'serif' }}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">✕</IconButton>
            </Box>

            {/* Stats Summary */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-around', bgcolor: '#fff', borderBottom: '1px solid #eee' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5">{shifts.filter(s => s.date === selectedDate).length}</Typography>
                <Typography variant="caption" color="textSecondary">Shifts</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#2e7d32' }}>
                  {shifts.filter(s => s.date === selectedDate && s.assignedTo).length}
                </Typography>
                <Typography variant="caption" color="textSecondary">Covered</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                  {shifts.filter(s => s.date === selectedDate && !s.assignedTo).length}
                </Typography>
                <Typography variant="caption" color="textSecondary">Open</Typography>
              </Box>
            </Box>

            {/* Shifts List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Shifts</Typography>
              <List>
                {shifts.filter(s => s.date === selectedDate).length > 0 ? (
                  shifts.filter(s => s.date === selectedDate).map((shift) => (
                    <ListItem key={shift.id} sx={{ bgcolor: '#fff', mb: 1, border: '1px solid #eee', borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: getRoleColor(shift.role) }}>
                            {shift.start} - {shift.end}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#637381' }}>{shift.role}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {shift.client}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {shift.assignedTo ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: '#e0e0e0' }}>
                                {shift.assignedTo.charAt(0)}
                              </Avatar>
                              <Typography variant="caption">{shift.assignedTo}</Typography>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" sx={{ color: '#d32f2f', fontStyle: 'italic' }}>Unassigned</Typography>
                              <Button size="small" variant="contained" sx={{ fontSize: '0.7rem', py: 0.5 }}>
                                Assign
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
                    No shifts scheduled.
                  </Typography>
                )}
              </List>
            </Box>

            {/* Footer Action */}
            <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
              <Button fullWidth variant="outlined" startIcon={<AddIcon />}>
                Add Shift on {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

    </Box>
  );
};

export default Rota;