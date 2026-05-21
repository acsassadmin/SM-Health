import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [userRole, setUserRole] = useState(null); 
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    console.log("🔍 [RoleContext] Checking user session...");
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      console.log("✅ [RoleContext] Session found. User ID:", session.user.id);
      setUser(session.user);
      await fetchUserRole(session.user.id);
    } else {
      console.warn("⚠️ [RoleContext] No session found.");
      setLoading(false);
    }
  };

  const fetchUserRole = async (userId) => {
    console.log("🔍 [RoleContext] Fetching role for User ID:", userId);
    setLoading(true);

    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        app_roles!inner (name, slug)
      `)
      .eq('user_id', userId)
      .maybeSingle(); 

    if (error) {
      console.error("❌ [RoleContext] Database Error:", error);
      setUserRole('Staff');
      setPermissions(['staff_read', 'rota_read', 'timesheets_submit']);
      setLoading(false);
      return;
    }

    if (roleData) {
      const dbSlug = (roleData.app_roles.slug || '').toLowerCase();
      const dbName = roleData.app_roles.name;
      
      console.log(`📄 [RoleContext] User Role: ${dbName}`);
      setUserRole(dbName);
      
      let perms = [];

      if (dbSlug.includes('director')) {
        perms = ['all'];
      } else if (dbSlug.includes('administrator') || dbSlug.includes('admin')) {
        perms = ['staff_read', 'staff_write', 'staff_delete', 'clients_read', 'clients_write', 'clients_delete', 'rota_read', 'rota_write', 'rota_delete', 'timesheets_read', 'timesheets_approve', 'compliance_read', 'reports_read', 'settings_read', 'settings_write'];
      } else if (dbSlug.includes('hr_officer') || dbSlug.includes('hr officer')) {
        perms = ['staff_read', 'staff_write', 'clients_read', 'rota_read', 'timesheets_read', 'compliance_read', 'reports_read'];
      } else {
        perms = ['staff_read', 'rota_read', 'timesheets_submit', 'settings_read'];
      }

      setPermissions(perms);
    } else {
      console.warn("⚠️ [RoleContext] No role assigned. Defaulting to Staff.");
      setUserRole('Staff');
      setPermissions(['staff_read', 'rota_read', 'timesheets_submit', 'settings_read']);
    }
    setLoading(false);
  };

  const hasPermission = (requiredPerm) => {
    return permissions.includes('all') || permissions.includes(requiredPerm);
  };

  const hasAnyPermission = (permList) => {
    if (permissions.includes('all')) return true;
    return permList.some(p => permissions.includes(p));
  };

  return (
    <RoleContext.Provider value={{ user, userRole, permissions, hasPermission, hasAnyPermission, loading, fetchUserRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  
  if (!context) {
    console.error("🚨 [useRole] CRITICAL: Context is missing. Check App.jsx wrapping.");
    return {
      user: null,
      userRole: 'Guest',
      permissions: [],
      hasPermission: () => false,
      hasAnyPermission: () => false,
      loading: false,
      fetchUserRole: async () => {}
    };
  }
  
  return context;
};