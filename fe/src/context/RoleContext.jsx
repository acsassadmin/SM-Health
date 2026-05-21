import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
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
      await fetchUserRole(session.user.id);
    } else {
      console.warn("⚠️ [RoleContext] No session found.");
      setLoading(false);
    }
  };

    const fetchUserRole = async (userId) => {
    console.log("🔍 [RoleContext] Fetching role for User ID:", userId);

    // REMOVED: .eq('is_primary', true) because it seems to be causing issues
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        app_roles!inner (name, slug)
      `)
      .eq('user_id', userId)
      .maybeSingle(); // Changed from .single() to .maybeSingle() to prevent crash

    if (error) {
      console.error("❌ [RoleContext] Database Error:", error);
      setLoading(false);
      return;
    }

    if (data) {
      const dbSlug = (data.app_roles.slug || '').toLowerCase();
      const dbName = (data.app_roles.name || '').toLowerCase();
      
      console.log(`📄 [RoleContext] Raw Data from DB:`, data);
      console.log(`🔎 [RoleContext] Parsed Slug: "${dbSlug}" | Parsed Name: "${dbName}"`);
      
      setUserRole(data.app_roles.name);

      let perms = [];

      if (dbSlug.includes('director')) {
        console.log("✅ [RoleContext] MATCHED: Director. Assigning ['all']");
        perms = ['all']; 
      } else if (dbSlug.includes('administrator') || dbSlug.includes('admin')) {
        console.log("✅ [RoleContext] MATCHED: Administrator. Assigning Admin Perms");
        perms = ['staff_read', 'staff_write', 'staff_delete', 'clients_read', 'clients_write', 'clients_delete', 'rota_read', 'rota_write', 'rota_delete', 'timesheets_read', 'timesheets_approve', 'compliance_read', 'reports_read', 'settings_read', 'settings_write'];
      } else if (dbSlug.includes('hr_officer') || dbSlug.includes('hr officer')) {
        console.log("✅ [RoleContext] MATCHED: HR Officer. Assigning HR Perms");
        perms = ['staff_read', 'staff_write', 'clients_read', 'rota_read', 'timesheets_read', 'compliance_read', 'reports_read'];
      } else {
        console.log("⚠️ [RoleContext] NO MATCH. Defaulting to Staff permissions.");
        perms = ['staff_read', 'rota_read', 'timesheets_submit', 'settings_read'];
      }

      console.log("🔓 [RoleContext] FINAL PERMISSIONS ARRAY:", perms);
      setPermissions(perms);
    } else {
      console.warn("⚠️ [RoleContext] NO DATA FOUND for this user ID in user_roles.");
      setPermissions(['staff_read', 'rota_read', 'timesheets_submit', 'settings_read']);
    }
    setLoading(false);
  };

  const hasPermission = (requiredPerm) => {
    const result = permissions.includes('all') || permissions.includes(requiredPerm);
    
    return result;
  };

  const hasAnyPermission = (permList) => {
    if (permissions.includes('all')) return true;
    return permList.some(p => permissions.includes(p));
  };

  return (
    <RoleContext.Provider value={{ userRole, permissions, hasPermission, hasAnyPermission, loading, fetchUserRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);