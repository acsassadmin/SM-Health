import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, IconButton, Chip, Avatar,
  Drawer, List, ListItem, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tooltip, CircularProgress, Divider, Alert, Paper
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Today, Add as AddIcon, Close as CloseIcon,
  EventNote, Warning as WarningIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────
const BRAND_COLOR = '#1a5fba';
const BRAND_DARK = '#0c1f3f';
const BORDER_COLOR = '#e1e8f4';
const SHADOW = '0 2px 14px rgba(26,95,186,.09)';

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

const Rota = () => {
  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'year'
  
  // --- DATE STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDate, setWeekDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // --- DATA STATE ---
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- INTERACTION STATE ---
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    role: 'Carer',
    pattern_code: '',
    start_time: '',
    end_time: ''
  });

  const [assignModalShift, setAssignModalShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);

  // ─────────────────────────────────────────────────────────────
  // EFFECTS & FETCHING
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch data whenever the "current" date context changes
  useEffect(() => {
    fetchDataForView();
  }, [viewMode, currentDate, weekDate, currentYear]);

  const fetchDataForView = async () => {
    setLoading(true);
    let query = supabase.from('shifts').select(`
      id, date, start_time, end_time, role, assigned_id,
      care_homes!left (name),
      staff!left (first_name, last_name)
    `);

    if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      query = query.gte('date', start).lte('date', end);
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(weekDate);
      const day = startOfWeek.getDay() || 7; 
      if(day !== 1) startOfWeek.setHours(-24 * (day - 1)); 
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      query = query.gte('date', startOfWeek.toISOString().split('T')[0])
                   .lte('date', endOfWeek.toISOString().split('T')[0]);
    } else if (viewMode === 'year') {
      const start = `${currentYear}-01-01`;
      const end = `${currentYear}-12-31`;
      query = query.gte('date', start).lte('date', end);
    }

    const { data, error } = await query.order('date', { ascending: true });
    if (error) console.error(error);
    else setShifts(data || []);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('care_homes').select('id, name');
    if (data) setClients(data);
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  const getRoleColor = (role) => {
    switch (role) {
      case 'Nurse': return '#d32f2f';
      case 'Senior Carer': return '#2e7d32';
      case 'Carer': return BRAND_COLOR;
      case 'Senior Nurse': return '#ed6c02';
      case 'Support Worker': return '#7b1fa2';
      default: return '#637381';
    }
  };

  const handleNavigate = (dir) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(weekDate);
      newDate.setDate(newDate.getDate() + (dir * 7));
      setWeekDate(newDate);
    } else if (viewMode === 'year') {
      setCurrentYear(currentYear + dir);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setWeekDate(now);
    setCurrentYear(now.getFullYear());
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setDrawerOpen(true);
  };

  const handleOpenCreateModal = (dateStr) => {
    setFormData({
      client_id: '',
      date: dateStr || new Date().toISOString().split('T')[0],
      role: 'Carer',
      pattern_code: '',
      start_time: '',
      end_time: ''
    });
    setIsCreateModalOpen(true);
  };

  const handlePatternChange = (e) => {
    const code = e.target.value;
    const pattern = STATIC_PATTERNS.find(p => p.code === code);
    if (pattern) {
      setFormData(prev => ({ ...prev, pattern_code: code, start_time: pattern.start, end_time: pattern.end }));
    }
  };

  const handleSaveShift = async () => {
    if (!formData.client_id || !formData.date) return alert("Select Care Home and Date");
    if (!formData.start_time) return alert("Select a time pattern");
    const { error } = await supabase.from('shifts').insert([{
      client_id: formData.client_id, date: formData.date,
      start_time: formData.start_time, end_time: formData.end_time, role: formData.role
    }]);
    if (error) alert("Failed: " + error.message);
    else {
      setIsCreateModalOpen(false);
      fetchDataForView();
    }
  };

  const handleOpenAssignModal = async (shift) => {
    setAssignModalShift(shift);
    setIsAssignModalOpen(true);
    const { data } = await supabase.from('staff')
      .select('id, first_name, last_name').eq('role', shift.role).eq('active', true);
    if (data) setAvailableStaff(data);
  };

  const handleAssignStaff = async (staffId) => {
    if (!assignModalShift) return;
    const { error } = await supabase.from('shifts').update({ assigned_id: staffId }).eq('id', assignModalShift.id);
    if (error) alert("Failed");
    else {
      setIsAssignModalOpen(false);
      fetchDataForView();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUB-COMPONENTS (VIEWS)
  // ─────────────────────────────────────────────────────────────

    const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    
    // Blanks (Empty cards)
    for (let i = 0; i < startDay; i++) {
      days.push(
        <Grid key={`blank-${i}`} item xs={12/7} sx={{ p: 1 }}>
          <Box sx={{ height: 120, bgcolor: 'transparent' }} />
        </Grid>
      );
    }
    
    // Real Days (Cards)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayShifts = shifts.filter(s => s.date === dateStr);
      const unassigned = dayShifts.filter(s => !s.assigned_id).length;
      const covered = dayShifts.length - unassigned;
      const pct = dayShifts.length ? (covered / dayShifts.length) * 100 : 0;
      const color = pct === 100 ? '#16a34a' : (pct >= 50 ? '#d97706' : '#dc2626');
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <Grid key={d} item xs={12/7} sx={{ p: 1 }}>
          <Paper 
            elevation={2} // Raised shadow effect
            onClick={() => handleDayClick(dateStr)}
            sx={{ 
              height: 120, 
              padding: 2,
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: '0.2s',
              bgcolor: isToday ? '#e3f2fd' : '#fff',
              border: isToday ? '1px solid #90caf9' : '1px solid #e0e0e0',
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)' 
              }
            }}
          >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14, color: isToday ? '#1565c0' : '#37474f' }}>
                {d}
              </Typography>
              {unassigned > 0 && <WarningIcon sx={{ fontSize: 14, color: '#ef5350' }} />}
            </Box>

            {/* Shifts List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflow: 'hidden', px: 1 }}>
              {dayShifts.slice(0, 3).map(s => {
                const rColor = getRoleColor(s.role);
                return (
                  <Box
                    key={s.id}
                    onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(s); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      py: 0.5,
                      px: 1,
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: rColor, // Full color bg
                      color: '#fff',
                      cursor: 'pointer',
                      transition: '0.2s',
                      boxShadow: `0 1px 3px ${rColor}40`,
                      '&:hover': { filter: 'brightness(0.9)', transform: 'scale(1.02)' }
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500, opacity: 0.9 }}>
                      {s.start_time?.substring(0,5)} {s.staff ? '· ' + s.staff.first_name : ''}
                    </Typography>
                  </Box>
                )
              })}
              {dayShifts.length > 3 && (
                <Typography 
                  variant="caption"
                  onClick={(e) => { e.stopPropagation(); handleDayClick(dateStr); }}
                  sx={{ 
                    color: BRAND_COLOR, 
                    fontWeight: 700, 
                    textAlign: 'center', 
                    mt: 'auto', 
                    py: 1, 
                    fontSize: 11,
                    cursor: 'pointer',
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    '&:hover': { bgcolor: '#e0e0e0' }
                  }}
                >
                  +{dayShifts.length - 3} more
                </Typography>
              )}
            </Box>

            {/* Coverage Bar */}
            {dayShifts.length > 0 && (
              <Box sx={{ mt: 'auto', height: 4, borderRadius: 2, background: '#f0f0f0', overflow: 'hidden', width: '100%' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 2 }} />
              </Box>
            )}
          </Paper>
        </Grid>
      );
    }
    return days;
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(weekDate);
    const day = startOfWeek.getDay() || 7; 
    if(day !== 1) startOfWeek.setHours(-24 * (day - 1)); 
    
    const days = [];
    for(let i=0; i<7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    const startHour = 6;
    const endHour = 23;
    const hourHeight = 50;

    return (
      <Box sx={{display:'flex', height:'100%', overflowY:'auto'}}>
        {/* Time Labels */}
        <Box sx={{width: 60, flexShrink:0, borderRight:'1px solid #ddd', bgcolor:'#fafafa'}}>
          {Array.from({length: endHour - startHour}, (_, i) => (
            <Box key={i} sx={{height: hourHeight, px:1, pt:0.5, fontSize:'0.75rem', color:'#666', borderBottom:'1px dashed #eee'}}>
              {String(startHour + i).padStart(2,'0')}:00
            </Box>
          ))}
        </Box>

        {/* Days Grid */}
        <Box sx={{flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)'}}>
          {days.map((dateObj, idx) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayShifts = shifts.filter(s => s.date === dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <Box key={idx} sx={{borderRight:'1px solid #eee', position:'relative', minHeight: (endHour-startHour)*hourHeight, bgcolor: isToday ? '#fcfcfc' : '#fff'}} onClick={() => handleDayClick(dateStr)}>
                <Typography align="center" sx={{py:1, bgcolor:'#f9f9f9', fontWeight:'bold', fontSize:'0.8rem', borderBottom:'1px solid #eee'}}>
                  {dateObj.toLocaleDateString('en-US', {weekday:'short'})}<br/>{dateObj.getDate()}
                </Typography>
                
                {dayShifts.map(s => {
                  const [sh, sm] = s.start_time.split(':').map(Number);
                  const [eh, em] = s.end_time.split(':').map(Number);
                  let startMins = sh*60 + sm;
                  let endMins = eh*60 + em;
                  if(endMins < startMins) endMins += 24*60; 
                  const top = (startMins - startHour*60) / 60 * hourHeight;
                  const height = Math.max((endMins - startMins) / 60 * hourHeight, 20);
                  const color = getRoleColor(s.role);

                  return (
                    <Box key={s.id} sx={{
                      position:'absolute', left:2, right:2, top, height, height,
                      bgcolor: color, color: '#fff', borderRadius: 2, p:0.5, fontSize:'0.7rem',
                      overflow:'hidden', cursor:'pointer', zIndex: 1, opacity: 0.9,
                      borderLeft: `4px solid ${color}`,
                      '&:hover': {zIndex: 10, transform: 'scale(1.02)', boxShadow: 3}
                    }} onClick={e => { e.stopPropagation(); handleOpenAssignModal(s); }}>
                      <div style={{fontWeight:'bold'}}>{s.start_time}</div>
                      <div>{s.staff?.first_name || 'Unassigned'}</div>
                    </Box>
                  );
                })}

                {isToday && (
                  <Box sx={{
                    position:'absolute', left:0, right:0, height: 2, bgcolor:'red', zIndex: 5,
                    top: `${(new Date().getHours() - startHour) * hourHeight + (new Date().getMinutes()/60)*hourHeight}px`
                  }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderYearView = () => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
      const firstDay = new Date(currentYear, m, 1).getDay();
      const blanks = firstDay === 0 ? 6 : firstDay - 1;
      
      const days = [];
      for(let b=0; b<blanks; b++) days.push(<Box key={`b${b}`} sx={{aspectRatio:1}} />);
      
      for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const count = shifts.filter(s => s.date === dateStr).length;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        days.push(
          <Box 
            key={d} 
            onClick={() => { setCurrentDate(new Date(currentYear, m, d)); setViewMode('month'); handleDayClick(dateStr); }}
            sx={{ 
              aspectRatio:1, display:'flex', alignItems:'center', justifyContent:'center', 
              fontSize:'0.75rem', cursor:'pointer', borderRadius:2, 
              bgcolor: isToday ? BRAND_COLOR : (count ? '#e3f2fd' : 'transparent'),
              color: isToday ? '#fff' : (count ? BRAND_DARK : '#666'),
              position:'relative', fontWeight: count ? 'bold' : 'normal'
            }}
          >
            {d}
            {count > 0 && (
              <Box sx={{position:'absolute', bottom:2, display:'flex', gap:0.5}}>
                <Box sx={{width:3, height:3, borderRadius:'50%', bgcolor: BRAND_COLOR}} />
              </Box>
            )}
          </Box>
        );
      }
      
      months.push(
        <Paper key={m} sx={{p:1, border:'1px solid #eee', cursor:'pointer'}} onClick={() => { setCurrentDate(new Date(currentYear, m, 1)); setViewMode('month'); }}>
          <Typography variant="subtitle2" align="center" sx={{fontFamily:'serif', mb:1}}>{new Date(currentYear, m).toLocaleString('default', {month:'long'})}</Typography>
          <Box sx={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:0.5}}>
            {days}
          </Box>
        </Paper>
      );
    }
    return <Grid container spacing={2}>{months}</Grid>;
  };



  return (
    <Box sx={{ p: 3, bgcolor: '#f7f9fc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- TOOLBAR --- */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2, boxShadow: SHADOW }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontFamily: 'serif', minWidth: 200, color: BRAND_DARK }}>
            {viewMode === 'month' ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
             viewMode === 'week' ? `Week of ${weekDate.toLocaleDateString()}` :
             String(currentYear)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => handleNavigate(-1)}><ChevronLeft /></IconButton>
            <Button variant="text" onClick={handleToday} sx={{textTransform:'none', fontWeight:600}}>Today</Button>
            <IconButton onClick={() => handleNavigate(1)}><ChevronRight /></IconButton>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {['Month', 'Week', 'Year'].map((v) => (
            <Button 
              key={v}
              size="small"
              variant={viewMode === v.toLowerCase() ? "contained" : "outlined"}
              onClick={() => setViewMode(v.toLowerCase())}
              sx={{ borderRadius: 20, px: 2, bgcolor: viewMode === v.toLowerCase() ? BRAND_COLOR : 'transparent', color: viewMode === v.toLowerCase() ? '#fff' : BRAND_DARK, borderColor: BRAND_DARK }}
            >
              {v}
            </Button>
          ))}
          <Divider orientation="vertical" flexItem sx={{mx:1}} />
          <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: BRAND_COLOR, borderRadius: 2, fontWeight: 600 }} onClick={() => handleOpenCreateModal(null)}>
            Add Shift
          </Button>
        </Box>
      </Paper>

     
      {loading ? <Box sx={{display:'flex', justifyContent:'center', flex:1, alignItems:'center'}}><CircularProgress /></Box> : (
        <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, boxShadow: SHADOW }}>
          
          {viewMode === 'month' && (
            <>
             
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', mb: '3px', px: 1 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <Typography key={d} align="center" sx={{fontSize:'10.5px', fontWeight:700, color:'#637381', textTransform:'uppercase', letterSpacing:'.4px'}}>
                    {d}
                  </Typography>
                ))}
              </Box>
              
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                <Grid container spacing={0.5}>
                  {renderMonthView()}
                </Grid>
              </Box>
            </>
          )}

          {viewMode === 'week' && renderWeekView()}

          {viewMode === 'year' && (
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
              <Grid container spacing={2}>
                {renderYearView()}
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* --- SIDE PANEL DRAWER --- */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 350, borderTop: `4px solid ${BRAND_COLOR}` } }}
      >
        {selectedDate && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f7f9fc' }}>
            <Box sx={{ p: 2, bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 14px rgba(0,0,0,.05)' }}>
              <Typography variant="h6" sx={{ fontFamily: 'serif', color: BRAND_DARK }}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-around', bgcolor: '#fff', mt: 2, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5">{shifts.filter(s => s.date === selectedDate).length}</Typography>
                <Typography variant="caption" color="textSecondary">Shifts</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#2e7d32' }}>{shifts.filter(s => s.date === selectedDate && s.assigned_id).length}</Typography>
                <Typography variant="caption" color="textSecondary">Covered</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#d32f2f' }}>{shifts.filter(s => s.date === selectedDate && !s.assigned_id).length}</Typography>
                <Typography variant="caption" color="textSecondary">Open</Typography>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#637381', textTransform:'uppercase', fontSize:'0.75rem' }}>Shifts</Typography>
              <List sx={{p:0}}>
                {shifts.filter(s => s.date === selectedDate).map((shift) => (
                  <ListItem key={shift.id} sx={{ bgcolor: '#fff', mb: 1, border: '1px solid #e1e8f4', borderRadius: 1.5, flexDirection: 'column', alignItems: 'flex-start', p: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: getRoleColor(shift.role) }}>
                        {shift.start_time?.substring(0,5)} - {shift.end_time?.substring(0,5)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#637381', textTransform:'uppercase', fontSize:'0.7rem' }}>{shift.role}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#1a2535' }}>
                      {shift.care_homes?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      {shift.assigned_id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: BRAND_COLOR }}>
                            {shift.staff?.first_name?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="caption" fontWeight="600">{shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : 'Unknown'}</Typography>
                        </Box>
                      ) : (
                        <Button 
                          size="small" 
                          variant="contained" 
                          sx={{ fontSize: '0.75rem', py: 0.5, px: 2, bgcolor: BRAND_COLOR, borderRadius: 1 }}
                          onClick={() => handleOpenAssignModal(shift)}
                        >
                          Assign
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                ))}
                {shifts.filter(s => s.date === selectedDate).length === 0 && (
                  <Box sx={{textAlign:'center', mt:4, color:'#94a3b8'}}>
                    <EventNote sx={{fontSize: 40, mb:1}}/>
                    <Typography>No shifts scheduled.</Typography>
                  </Box>
                )}
              </List>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid #e1e8f4', bgcolor: '#fff' }}>
              <Button fullWidth variant="outlined" startIcon={<AddIcon />} sx={{borderColor: BRAND_COLOR, color: BRAND_COLOR, borderRadius: 2, fontWeight: 600}} onClick={() => handleOpenCreateModal(selectedDate)}>
                Add Shift on {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* --- CREATE SHIFT MODAL --- */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{fontFamily:'serif', color: BRAND_DARK}}>Create New Shift</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Care Home *</InputLabel>
            <Select value={formData.client_id} label="Care Home *" onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
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
            <Select value={formData.pattern_code} label="Shift Time *" onChange={handlePatternChange}>
              <MenuItem value=""><em>Select pattern...</em></MenuItem>
              {STATIC_PATTERNS.map((p) => (
                <MenuItem key={p.code} value={p.code}>{p.name} ({p.start} - {p.end})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role *</InputLabel>
            <Select value={formData.role} label="Role *" onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
              <MenuItem value="Carer">Carer</MenuItem>
              <MenuItem value="Senior Carer">Senior Carer</MenuItem>
              <MenuItem value="Nurse">Nurse</MenuItem>
              <MenuItem value="Senior Nurse">Senior Nurse</MenuItem>
              <MenuItem value="Support Worker">Support Worker</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{p:2}}>
          <Button onClick={() => setIsCreateModalOpen(false)} sx={{borderRadius:2}}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveShift} sx={{bgcolor: BRAND_COLOR, borderRadius:2, fontWeight:600}}>Save Shift</Button>
        </DialogActions>
      </Dialog>

      {/* --- ASSIGN MODAL --- */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{fontFamily:'serif'}}>Assign Staff</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {assignModalShift?.role} required for {assignModalShift?.care_homes?.name} on {formData.date}
          </Typography>
          {availableStaff.length === 0 ? (
             <Alert severity="info" sx={{mt:2}}>No active staff found for this role.</Alert>
          ) : (
            availableStaff.map((staff) => (
              <Box key={staff.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #eee' }}>
                <Typography variant="body1" fontWeight="500">{staff.first_name} {staff.last_name}</Typography>
                <Button size="small" variant="outlined" onClick={() => handleAssignStaff(staff.id)} sx={{borderRadius:2}}>Assign</Button>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{p:2}}>
          <Button onClick={() => setIsAssignModalOpen(false)} sx={{borderRadius:2}}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Rota;