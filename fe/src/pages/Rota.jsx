import React, { useState, useEffect } from 'react';
import {
  Box, Typography, IconButton, Chip, 
  Drawer, List, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Paper, useMediaQuery, useTheme
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add as AddIcon, Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────
// CONFIG & CONSTANTS
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1a5fba',
  dark: '#0c1f3f',
  light: '#dbeafe',
  xLight: '#eff6ff',
  accent: '#e8820c',
  red: '#dc2626',
  green: '#16a34a',
  border: '#e1e8f4',
  text: '#1a2535',
  muted: '#5e7187'
};

// Role Constants (matching your DB)
const ROLE_ID = {
  DIRECTOR: 11,
  ADMIN: 12,
  HR_OFFICER: 13,
  STAFF: 14
};

const getRoleColor = (roleName) => {
  const palette = [
    { bg: '#dbeafe', text: '#1e40af', hex: '#1a5fba' }, 
    { bg: '#dcfce7', text: '#166534', hex: '#16a34a' }, 
    { bg: '#fef9c3', text: '#854d0e', hex: '#d97706' }, 
    { bg: '#ffedd5', text: '#9a3412', hex: '#ea580c' }, 
    { bg: '#f3e8ff', text: '#581c87', hex: '#9333ea' }, 
    { bg: '#ccfbf1', text: '#065f46', hex: '#059669' }, 
    { bg: '#fee2e2', text: '#991b1b', hex: '#dc2626' }, 
  ];
  
  if (roleName === 'Unassigned' || !roleName) return palette[palette.length - 1];

  let hash = 0;
  for (let i = 0; i < roleName.length; i++) {
    hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % (palette.length - 1);
  return palette[index];
};

const formatDateLocal = (date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const Rota = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- AUTH & ROLE STATES ---
  const [userId, setUserId] = useState(null);
  const [userRoleId, setUserRoleId] = useState(null);

  // --- ROTA CALENDAR CONTEXT STATES ---
  const [viewMode, setViewMode] = useState('month'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDate, setWeekDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Modals Data Forms
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    date: formatDateLocal(new Date()),
    role: '',
    pattern_id: '', 
    start_time: '',
    end_time: '',
    notes: ''
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalShift, setAssignModalShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);

  // Filter Selectors States
  const [legendFilters, setLegendFilters] = useState(new Set());
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');

  // ─────────────────────────────────────────────────────────────
  // EFFECTS & LIFECYCLES
  // ─────────────────────────────────────────────────────────────
  
  // 1. Fetch User Identity and Role
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch Role ID from user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id)
          .single();
        
        if (roleData) {
          setUserRoleId(roleData.role_id);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userRoleId !== null) {
      fetchReferenceData();
      fetchDataForView();
    }
  }, [viewMode, currentDate, weekDate, currentYear, selectedRoleFilter, selectedClientFilter, userRoleId]);

  const fetchReferenceData = async () => {
    try {
      const { data: clientsData } = await supabase.from('care_homes').select('id, name');
      if (clientsData) setClients(clientsData);

      const { data: rolesData } = await supabase.from('staff_role_categories').select('*').order('sort_order', { ascending: true });
      if (rolesData) {
        setRoles(rolesData);
        if (rolesData.length > 0) {
          setFormData(prev => ({ ...prev, role: rolesData[0].name }));
        }
      }

      const { data: patternsData } = await supabase.from('shift_patterns').select('*');
      if (patternsData) setShiftPatterns(patternsData);
    } catch (err) {
      console.error("Reference payload fetch failure:", err);
    }
  };

  const fetchDataForView = async () => {
    setLoading(true);
    let query = supabase.from('shifts').select(`
      id, date, start_time, end_time, role, assigned_id, client_id, notes,
      care_homes!left (name),
      staff!left (first_name, last_name)
    `);

    // FILTERING LOGIC FOR ROLES
    if (userRoleId === ROLE_ID.STAFF) {
      // Staff: See ONLY shifts assigned to them
      query = query.eq('assigned_id', userId);
    } 
    // HR, Director, Admin: See all shifts (No filter applied here)

    if (viewMode === 'month') {
      const start = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const end = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      query = query.gte('date', start).lte('date', end);
    } else if (viewMode === 'week') {
      const startOfWeek = getStartOfWeek(weekDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      query = query.gte('date', formatDateLocal(startOfWeek)).lte('date', formatDateLocal(endOfWeek));
    } else if (viewMode === 'year') {
      query = query.gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
    }

    if (selectedRoleFilter) query = query.eq('role', selectedRoleFilter);
    if (selectedClientFilter) query = query.eq('client_id', selectedClientFilter);

    const { data, error } = await query.order('date', { ascending: true });
    if (error) console.error(error);
    else setShifts(data || []);
    setLoading(false);
  };

  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
  };

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION HANDLERS
  // ─────────────────────────────────────────────────────────────
  
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

  const toggleLegend = (roleName) => {
    const newFilters = new Set(legendFilters);
    if (newFilters.has(roleName)) newFilters.delete(roleName);
    else newFilters.add(roleName);
    setLegendFilters(newFilters);
  };

  const handlePatternChange = (e) => {
    const patternId = e.target.value;
    const selectedPattern = shiftPatterns.find(p => p.id === patternId);
    
    if (selectedPattern) {
      setFormData(prev => ({ 
        ...prev, 
        pattern_id: patternId, 
        start_time: selectedPattern.start_time, 
        end_time: selectedPattern.end_time 
      }));
    } else {
      setFormData(prev => ({ ...prev, pattern_id: '', start_time: '', end_time: '' }));
    }
  };

  const filterShiftWithLegend = (s) => {
    if (legendFilters.size === 0) return true;
    if (legendFilters.has('__unassigned') && !s.assigned_id) return true;
    return legendFilters.has(s.role);
  };

  // ─────────────────────────────────────────────────────────────
  // STATISTICAL CALCULATIONS FOR BOTTOM BANNER
  // ─────────────────────────────────────────────────────────────
  const totalShiftsCount = shifts.length;
  const unassignedShiftsCount = shifts.filter(s => !s.assigned_id).length;
  const filledShiftsCount = totalShiftsCount - unassignedShiftsCount;
  const filledPercentage = totalShiftsCount ? Math.round((filledShiftsCount / totalShiftsCount) * 100) : 0;

  // ─────────────────────────────────────────────────────────────
  // VIEW ENGINE GENERATORS
  // ─────────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1; 

    const todayStr = formatDateLocal(new Date());
    const cells = [];

    for (let i = 0; i < startDay; i++) {
      cells.push(<Box key={`blank-${i}`} sx={{ height: 116, bgcolor: 'transparent' }} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

      const dayShifts = shifts.filter(s => s.date === dateStr);
      const filteredShifts = dayShifts.filter(filterShiftWithLegend);

      const unassignedCount = dayShifts.filter(s => !s.assigned_id).length;
      const coveragePct = dayShifts.length ? Math.round(((dayShifts.length - unassignedCount) / dayShifts.length) * 100) : 0;
      
      let covColor = COLORS.border;
      if (dayShifts.length > 0) {
        if (coveragePct === 100) covColor = COLORS.green;
        else if (coveragePct >= 50) covColor = COLORS.accent;
        else covColor = COLORS.red;
      }

      returnCells(cells, d, dateStr, isToday, isWeekend, dayShifts, filteredShifts, unassignedCount, coveragePct, covColor);
    }
    return cells;
  };

  const returnCells = (cells, d, dateStr, isToday, isWeekend, dayShifts, filteredShifts, unassignedCount, coveragePct, covColor) => {
    const visibleShifts = filteredShifts.slice(0, 3);
    const hiddenCount = filteredShifts.length - 3;

    cells.push(
      <Paper 
        key={dateStr}
        elevation={0}
        onClick={() => handleDayClick(dateStr)}
        sx={{
          height: 116, border: '1.5px solid',
          borderColor: selectedDate === dateStr ? COLORS.primary : COLORS.border,
          borderRadius: '12px',
          bgcolor: isToday ? COLORS.xLight : (isWeekend ? '#fdfcfb' : '#fff'),
          p: '6px 5px 4px', cursor: 'pointer', transition: '0.15s',
          position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          '&:hover': { borderColor: COLORS.primary, boxShadow: '0 2px 14px rgba(26,95,186,.09)' }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px', alignItems: 'center' }}>
          <Box sx={{
            width: 21, height: 21, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: isToday ? '#fff' : COLORS.muted,
            bgcolor: isToday ? COLORS.primary : 'transparent'
          }}>
            {d}
          </Box>
          <Typography variant="caption" sx={{ fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>
            {dayShifts.length > 0 && `${dayShifts.length} Shifts`}
          </Typography>
        </Box>

        {unassignedCount > 0 && (
          <Box sx={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.red }} />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1, overflow: 'hidden' }}>
          {visibleShifts.map((s) => {
            const style = getRoleColor(s.assigned_id ? s.role : 'Unassigned');
            return (
              <Box
                key={s.id}
                // DISABLE CLICK TO ASSIGN FOR HR AND STAFF
                onClick={(e) => { 
                  if (userRoleId === ROLE_ID.DIRECTOR || userRoleId === ROLE_ID.ADMIN) {
                    e.stopPropagation(); 
                    handleOpenAssignModal(s); 
                  }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontSize: 10, fontWeight: 700, px: '5px', py: '2px', borderRadius: '3px',
                  bgcolor: style.bg, color: style.text, 
                  cursor: (userRoleId === ROLE_ID.DIRECTOR || userRoleId === ROLE_ID.ADMIN) ? 'pointer' : 'default',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                }}
              >
                {s.start_time?.substring(0,5)} {s.staff ? `${s.staff.first_name}` : '⚠ Open'}
              </Box>
            )
          })}
        </Box>

        {hiddenCount > 0 && (
          <Typography sx={{ fontSize: 10, color: COLORS.primary, fontWeight: 700, mt: '1px', textAlign: 'right' }}>
            +{hiddenCount} more
          </Typography>
        )}

        {dayShifts.length > 0 && (
          <Box sx={{ height: 3, borderRadius: 2, mt: '4px', bgcolor: COLORS.border, overflow: 'hidden', flexShrink: 0 }}>
            <Box sx={{ height: '100%', width: `${coveragePct}%`, bgcolor: covColor }} />
          </Box>
        )}
      </Paper>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(weekDate);
    const timeBlocks = ['Morning\n(07:00 - 14:00)', 'Afternoon\n(14:00 - 21:00)', 'Night\n(21:00 - 07:00)'];
    
    const daysArray = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', gap: '6px', mb: 1, borderBottom: '2px solid #e1e8f4', pb: 1 }}>
          <Box /> 
          {daysArray.map((day, idx) => {
            const isToday = formatDateLocal(day) === formatDateLocal(new Date());
            return (
              <Box key={idx} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: isToday ? COLORS.primary : COLORS.muted }}>
                  {day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
                </Typography>
                <Typography sx={{ 
                  fontSize: '13px', fontWeight: 800, mx: 'auto', width: 24, height: 24, 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: isToday ? COLORS.primary : 'transparent', color: isToday ? '#fff' : COLORS.text 
                }}>
                  {day.getDate()}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ overflowY: 'auto', flexGrow: 1, pr: 0.5 }}>
          {timeBlocks.map((timeLabel, timeIdx) => (
            <Box key={timeIdx} sx={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', gap: '6px', mb: '6px', minHeight: '90px' }}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', border: '1px dashed #cbd5e1' }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: COLORS.muted, whiteSpace: 'pre-line', textAlign: 'center', width: '100%' }}>
                  {timeLabel}
                </Typography>
              </Paper>

              {daysArray.map((day, dayIdx) => {
                const dateStr = formatDateLocal(day);
                const dayShifts = shifts.filter(s => s.date === dateStr).filter(filterShiftWithLegend);
                
                const slotShifts = dayShifts.filter(s => {
                  const hour = parseInt(s.start_time?.split(':')[0] || '0', 10);
                  if (timeIdx === 0) return hour >= 5 && hour < 14;
                  if (timeIdx === 1) return hour >= 14 && hour < 21;
                  return hour >= 21 || hour < 5;
                });

                return (
                  <Paper 
                    key={dayIdx} 
                    elevation={0}
                    onClick={() => handleDayClick(dateStr)}
                    sx={{ 
                      p: '6px', border: '1px solid #e1e8f4', borderRadius: '10px', bgcolor: '#fff',
                      display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer',
                      '&:hover': { borderColor: COLORS.primary, bgcolor: '#fafafa' }
                    }}
                  >
                    {slotShifts.map(s => {
                      const style = getRoleColor(s.assigned_id ? s.role : 'Unassigned');
                      return (
                        <Box 
                          key={s.id}
                           // DISABLE CLICK TO ASSIGN FOR HR AND STAFF
                          onClick={(e) => { 
                             if (userRoleId === ROLE_ID.DIRECTOR || userRoleId === ROLE_ID.ADMIN) {
                               e.stopPropagation(); 
                               handleOpenAssignModal(s); 
                             }
                           }}
                          sx={{ 
                            fontSize: '10px', fontWeight: 700, p: '4px', borderRadius: '4px', 
                            bgcolor: style.bg, color: style.text, overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: (userRoleId === ROLE_ID.DIRECTOR || userRoleId === ROLE_ID.ADMIN) ? 'pointer' : 'default'
                          }}
                        >
                          {s.start_time?.substring(0,5)} {s.staff ? s.staff.first_name : '⚠ Open'}
                        </Box>
                      );
                    })}
                  </Paper>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderYearView = () => {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 2, overflowY: 'auto', flexGrow: 1, pb: 1 }}>
        {Array.from({ length: 12 }).map((_, monthIdx) => {
          const firstDayOfMonth = new Date(currentYear, monthIdx, 1);
          const monthName = firstDayOfMonth.toLocaleString('en-GB', { month: 'long' });
          const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
          
          return (
            <Paper key={monthIdx} elevation={0} sx={{ p: 1.5, border: '1px solid #e1e8f4', borderRadius: '12px', bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 800, color: COLORS.primary, mb: 1, borderBottom: '1px solid #edf2f7', pb: '3px' }}>
                {monthName}
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                {['M','T','W','T','F','S','S'].map((m, i) => (
                  <Typography key={i} sx={{ fontSize: '9px', fontWeight: 700, color: COLORS.muted }}>{m}</Typography>
                ))}
                
                {Array.from({ length: (firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1) }).map((_, bIdx) => (
                  <Box key={`empty-${bIdx}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                  const dayNum = dIdx + 1;
                  const dateStr = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayShifts = shifts.filter(s => s.date === dateStr);
                  const hasUnassigned = dayShifts.some(s => !s.assigned_id);
                  
                  let dotBg = 'transparent';
                  if (dayShifts.length > 0) {
                    dotBg = hasUnassigned ? COLORS.red : COLORS.green;
                  }

                  return (
                    <Box 
                      key={dayNum}
                      onClick={() => handleDayClick(dateStr)}
                      sx={{ 
                        fontSize: '9px', fontWeight: 600, height: '18px', width: '18px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px',
                        cursor: 'pointer', bgcolor: dotBg, color: dayShifts.length > 0 ? '#fff' : COLORS.text,
                        '&:hover': { bgcolor: COLORS.light, color: COLORS.primary }
                      }}
                    >
                      {dayNum}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // MODAL LOGIC ACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleOpenCreateModal = (dateStr) => {
    // BLOCK ACCESS FOR HR AND STAFF
    if (userRoleId === ROLE_ID.HR_OFFICER || userRoleId === ROLE_ID.STAFF) {
      alert("You do not have permission to create shifts.");
      return;
    }

    setFormData({
      client_id: clients.length > 0 ? clients[0].id : '',
      date: dateStr || formatDateLocal(new Date()),
      role: roles.length > 0 ? roles[0].name : '',
      pattern_id: '',
      start_time: '',
      end_time: '',
      notes: ''
    });
    setIsCreateModalOpen(true);
  };

   const handleSaveShift = async () => {
    // 1. Debug Logging (Check your browser console F12)
    console.log("Attempting to save shift with data:", formData);

    // 2. Validation Checks
    if (!formData.client_id) {
      return alert("Error: Care Home Location is required.");
    }
    if (!formData.date) {
      return alert("Error: Shift Date is required.");
    }
    if (!formData.start_time || !formData.end_time) {
      return alert("Error: Start and End times are required. Please select a Shift Pattern.");
    }
    if (!formData.role) {
      return alert("Error: Staff Role Category is required.");
    }

    // 3. Database Insert
    const { error } = await supabase.from('shifts').insert([{
      client_id: formData.client_id, 
      date: formData.date,
      start_time: formData.start_time, 
      end_time: formData.end_time, 
      role: formData.role,
      notes: formData.notes || '' // Ensure notes is not undefined
    }]);

    // 4. Handle Response
    if (error) {
      console.error("Database Error:", error);
      alert("Failed to publish shift: " + error.message);
    } else {
      alert("Shift published successfully!");
      setIsCreateModalOpen(false);
      fetchDataForView();
    }
  };

  const handleOpenAssignModal = async (shift) => {
    // BLOCK ACCESS FOR HR AND STAFF
    if (userRoleId === ROLE_ID.HR_OFFICER || userRoleId === ROLE_ID.STAFF) {
      return; // Silent fail
    }

    setAssignModalShift(shift);
    setIsAssignModalOpen(true);
    setAvailableStaff([]);
    
    const { data, error } = await supabase.from('staff')
      .select('id, first_name, last_name')
      .eq('role', shift.role)
      .eq('active', true);
      
    if (error) console.error("Database querying exception:", error);
    if (data) setAvailableStaff(data);
  };

  const handleAssignStaff = async (staffId) => {
    if (!assignModalShift) return;
    const { error } = await supabase.from('shifts').update({ assigned_id: staffId }).eq('id', assignModalShift.id);
    if (error) alert("Could not update record allocations: " + error.message);
    else {
      setIsAssignModalOpen(false);
      if(selectedDate === assignModalShift.date) setDrawerOpen(false);
      fetchDataForView();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (userRoleId === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ 
      p: isMobile ? 1 : 3, bgcolor: '#f7f9fc', height: '100vh', 
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      
      {/* ─── ROTA TOOLBAR ─── */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', bgcolor: '#fff', border: '1.5px solid #e1e8f4', borderRadius: '22px', p: '3px' }}>
            {['Month', 'Week', 'Year'].map((v) => (
              <Button 
                key={v} size="small" onClick={() => setViewMode(v.toLowerCase())}
                sx={{ 
                  borderRadius: '18px', px: 2, fontSize: 12, fontWeight: 600, 
                  color: viewMode === v.toLowerCase() ? '#fff' : COLORS.muted,
                  bgcolor: viewMode === v.toLowerCase() ? COLORS.primary : 'transparent',
                  '&:hover': { bgcolor: viewMode === v.toLowerCase() ? COLORS.primary : 'rgba(0,0,0,0.04)' }
                }}
              >
                {v === 'Month' ? '📅 Month' : v === 'Week' ? '🗓 Week' : '📆 Year'}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton onClick={() => handleNavigate(-1)} size="small" sx={{ border: '1.5px solid #e1e8f4' }}><ChevronLeft /></IconButton>
            <Button size="small" onClick={handleToday} sx={{ border: '1.5px solid #e1e8f4', color: COLORS.muted, fontWeight: 600 }}>Today</Button>
            <IconButton onClick={() => handleNavigate(1)} size="small" sx={{ border: '1.5px solid #e1e8f4' }}><ChevronRight /></IconButton>
          </Box>

          <Typography variant="h6" sx={{ color: COLORS.text, fontWeight: 700, minWidth: 160 }}>
            {viewMode === 'month' ? currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) :
             viewMode === 'week' ? `Week of ${getStartOfWeek(weekDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : String(currentYear)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select 
              value={selectedRoleFilter} displayEmpty onChange={(e) => setSelectedRoleFilter(e.target.value)}
              sx={{ borderRadius: '20px', bgcolor: '#fff' }}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select 
              value={selectedClientFilter} displayEmpty onChange={(e) => setSelectedClientFilter(e.target.value)}
              sx={{ borderRadius: '20px', bgcolor: '#fff' }}
            >
              <MenuItem value="">All Care Homes</MenuItem>
              {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* HIDE ADD BUTTON FOR HR AND STAFF */}
          {(userRoleId === ROLE_ID.DIRECTOR || userRoleId === ROLE_ID.ADMIN) && (
            <Button variant="contained" startIcon={<AddIcon />} size="medium" onClick={() => handleOpenCreateModal(null)} sx={{ bgcolor: COLORS.primary, borderRadius: '8px', fontWeight: 600 }}>
              + Add Shift
            </Button>
          )}
        </Box>
      </Box>

      {/* ─── ROTA LEGEND CHIPS BAR ─── */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, mr: 0.5 }}>Filter:</Typography>
        {roles.map(role => {
          const style = getRoleColor(role.name);
          return (
            <Chip 
              key={role.id} label={role.name} size="small" onClick={() => toggleLegend(role.name)}
              sx={{ 
                bgcolor: style.bg, color: style.text, border: `1.5px solid ${style.hex}44`, fontWeight: 600,
                opacity: legendFilters.size > 0 && !legendFilters.has(role.name) ? 0.3 : 1
              }}
            />
          );
        })}
        <Chip 
          label="Unassigned" size="small" onClick={() => toggleLegend('__unassigned')}
          sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 600, opacity: legendFilters.size > 0 && !legendFilters.has('__unassigned') ? 0.3 : 1 }}
        />
        {legendFilters.size > 0 && <Button size="small" sx={{ fontSize: 11, fontWeight: 600, color: COLORS.muted }} onClick={() => setLegendFilters(new Set())}>Clear</Button>}
      </Box>

      {/* ─── CALENDAR RENDERING ENGINE AREA ─── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', mb: 2 }}>
          {viewMode === 'month' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', mb: 1 }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <Typography key={d} align="center" sx={{ fontSize: '11px', fontWeight: 700, color: COLORS.muted }}>{d.toUpperCase()}</Typography>
                ))}
              </Box>
              <Box sx={{ overflowY: 'auto', flexGrow: 1, pr: 0.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>{renderMonthView()}</Box>
              </Box>
            </Box>
          )}

          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'year' && renderYearView()}
        </Box>
      )}

      {/* ─── DYNAMIC STATISTICS BAR BANNER ─── */}
      <Paper elevation={0} sx={{ 
        p: '10px 16px', bgcolor: COLORS.dark, color: '#fff', borderRadius: '12px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant="caption" sx={{ color: '#93c5fd', fontWeight: 700, letterSpacing: 0.5 }}>ROTA GENERAL METRICS:</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Demands: <span style={{ fontWeight: 800 }}>{totalShiftsCount}</span></Typography>
          <Typography variant="body2" style={{ color: '#fca5a5', fontWeight: 600 }}>Open Allocations: <span style={{ fontWeight: 800 }}>{unassignedShiftsCount}</span></Typography>
          <Typography variant="body2" style={{ color: '#86efac', fontWeight: 600 }}>Covered: <span style={{ fontWeight: 800 }}>{filledShiftsCount} ({filledPercentage}%)</span></Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 10 }}>* Filters are dynamically applied to summary calculations.</Typography>
      </Paper>

      {/* RIGHT SIDE PANEL DRAWER */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: isMobile ? '100%' : 340 } }}>
        {selectedDate && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: COLORS.dark, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="600">
                {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ color: '#fff' }}><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
              <List disablePadding>
                {shifts.filter(s => s.date === selectedDate).map((shift) => {
                  const style = getRoleColor(shift.assigned_id ? shift.role : 'Unassigned');
                  return (
                    <Paper key={shift.id} elevation={0} sx={{ border: '1px solid #e1e8f4', borderRadius: '8px', p: 2, mb: 1.5, borderLeft: `4px solid ${style.hex}` }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.primary, display: 'block' }}>
                        {shift.start_time?.substring(0,5)} – {shift.end_time?.substring(0,5)} ({shift.role})
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, my: 0.5 }}>{shift.care_homes?.name || 'Unknown Location'}</Typography>
                      
                      {shift.notes && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: COLORS.muted, my: 0.5 }}>
                          Note: {shift.notes}
                        </Typography>
                      )}

                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {shift.assigned_id ? (
                          <Typography variant="caption">Staff Assigned: {shift.staff?.first_name} {shift.staff?.last_name}</Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: COLORS.red, fontWeight: 600 }}>⚠ Open Allocation</Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </List>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ─── ADD SHIFT MODAL DIALOG ─── */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, color: COLORS.dark }}>Create New Shift Demand</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="modal-client-label">Care Home Location</InputLabel>
            <Select
              labelId="modal-client-label"
              label="Care Home Location"
              value={formData.client_id}
              onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
            >
              {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="Shift Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="modal-role-label">Staff Role Category</InputLabel>
            <Select
              labelId="modal-role-label"
              label="Staff Role Category"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            >
              {roles.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="modal-pattern-label">Shift Template Pattern</InputLabel>
            <Select
              labelId="modal-pattern-label"
              label="Shift Template Pattern"
              value={formData.pattern_id}
              onChange={handlePatternChange}
            >
              <MenuItem value="" disabled><em>Select a template pattern</em></MenuItem>
              {shiftPatterns.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notes / Special Instructions"
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder="Add handover requirements, specifics, etc."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />

        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateModalOpen(false)} sx={{ color: COLORS.muted }}>Cancel</Button>
          <Button onClick={handleSaveShift} variant="contained" sx={{ bgcolor: COLORS.primary }}>Publish Shift</Button>
        </DialogActions>
      </Dialog>

      {/* ─── STAFF ALLOCATION MODAL DIALOG ─── */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Allocate Staff Assignment</DialogTitle>
        <DialogContent>
          {assignModalShift && (
            <Typography variant="body2" sx={{ mb: 2, color: COLORS.muted }}>
              Matching eligible, active staff entries for <strong>{assignModalShift.role}</strong> positions.
            </Typography>
          )}
          <List>
            {availableStaff.length === 0 ? (
              <Typography variant="caption" sx={{ display: 'block', textStyle: 'italic', color: COLORS.muted, textAlign: 'center', my: 2 }}>
                No active staff available for this designated role category.
              </Typography>
            ) : (
              availableStaff.map((staff) => (
                <Paper key={staff.id} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{staff.first_name} {staff.last_name}</Typography>
                  <Button size="small" variant="contained" onClick={() => handleAssignStaff(staff.id)} sx={{ bgcolor: COLORS.green, '&:hover': { bgcolor: '#11823b' } }}>Assign</Button>
                </Paper>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAssignModalOpen(false)} sx={{ color: COLORS.muted }}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Rota;