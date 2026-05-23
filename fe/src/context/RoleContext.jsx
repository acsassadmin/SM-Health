import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; 

export const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [userRole, setUserRole] = useState(null); 
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isFetching = useRef(false);
  const activeExecutionId = useRef(0);

  const applyStaffFallback = (reason) => {
    console.warn(`🛡️ [RoleContext] Emergency Fallback Active: ${reason}`);
    setUserRole('Staff');
    setPermissions(['staff_read', 'rota_read', 'timesheets_submit', 'settings_read']);
    setLoading(false);
    isFetching.current = false;
  };

  const fetchUserRole = async (userId) => {
    if (!userId) {
      applyStaffFallback("No User ID");
      return 'Staff';
    }

    if (isFetching.current) return;
    isFetching.current = true;
    activeExecutionId.current += 1;
    const currentExecutionId = activeExecutionId.current;

    console.log("🔍 [RoleContext] Database query initiated for UID:", userId);

    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          app_roles!inner (name, slug)
        `)
        .eq('user_id', userId)
        .maybeSingle(); 

      if (error) {
        console.error("❌ [RoleContext] Supabase Database Error Response:", error);
        throw error;
      }

      if (currentExecutionId !== activeExecutionId.current) return null;

      let finalRoleName = 'Staff';
      let perms = ['staff_read', 'rota_read', 'timesheets_submit', 'settings_read'];

      if (roleData && roleData.app_roles) {
        const dbSlug = (roleData.app_roles.slug || '').toLowerCase().trim();
        const dbName = roleData.app_roles.name || 'Staff';
        
        console.log(`📄 [RoleContext] Role verified successfully: ${dbName}`);
        
        if (dbSlug.includes('director')) {
          perms = ['all'];
          finalRoleName = 'Director';
        } else if (dbSlug.includes('administrator') || dbSlug.includes('admin')) {
          perms = ['staff_read', 'staff_write', 'staff_delete', 'clients_read', 'clients_write', 'clients_delete', 'rota_read', 'rota_write', 'rota_delete', 'timesheets_read', 'timesheets_approve', 'compliance_read', 'reports_read', 'settings_read', 'settings_write'];
          finalRoleName = 'Admin';
        } else if (dbSlug.includes('hr_officer') || dbSlug.includes('hr officer')) {
          perms = ['staff_read', 'staff_write', 'clients_read', 'rota_read', 'timesheets_read', 'compliance_read', 'reports_read'];
          finalRoleName = 'HR';
        } else {
          finalRoleName = dbName;
        }
      } else {
        console.warn("⚠️ [RoleContext] User authenticated, but no matching row in user_roles table.");
      }

      setUserRole(finalRoleName);
      setPermissions(perms);
      setLoading(false);
      isFetching.current = false;
      return finalRoleName;

    } catch (err) {
      console.error("❌ [RoleContext] Caught Promise Exception:", err);
      if (currentExecutionId === activeExecutionId.current) {
        applyStaffFallback(err.message || "Query Failed");
      }
      return 'Staff';
    }
  };

  useEffect(() => {
    console.log("🚀 [RoleContext] Context Provider Mounted to DOM");
    
    const emergencyTimer = setTimeout(() => {
      if (loading) {
        console.error("🚨 [RoleContext] EMERGENCY TRIP: Loading took too long. Forcing loader OFF.");
        setLoading(false);
      }
    }, 3000);

    let initialized = false;

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Init session fatal error:", e);
        setLoading(false);
      } finally {
        initialized = true;
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            if (initialized) {
              await fetchUserRole(session.user.id); 
            }
          }
        } 
        else if (event === 'SIGNED_OUT') {
          activeExecutionId.current += 1;
          setUser(null);
          setUserRole(null);
          setPermissions([]);
          setLoading(false);
          isFetching.current = false;
        }
      }
    );

    return () => {
      clearTimeout(emergencyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (requiredPerm) => permissions.includes('all') || permissions.includes(requiredPerm);
  const hasAnyPermission = (permList) => permissions.includes('all') || permList.some(p => permissions.includes(p));

  return (
    <RoleContext.Provider value={{ user, userRole, permissions, hasPermission, hasAnyPermission, loading, fetchUserRole }}>
      {children}
    </RoleContext.Provider>
  );
};

// Simple rule utility export helper to satisfy fast refresh components requirements
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used inside a structured RoleProvider template.");
  return context;
}