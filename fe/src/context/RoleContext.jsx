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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserRole(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        app_roles!inner (name, slug)
      `)
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (error) {
      console.error("Error fetching role:", error);
      setLoading(false);
      return;
    }

    if (data) {
      const roleName = data.app_roles.name;
      const roleSlug = data.app_roles.slug;
      
      setUserRole(roleName);

      // --- CUSTOMER RBAC MATRIX IMPLEMENTATION (4 Roles) ---
      let perms = [];

      switch (roleSlug) {
        
        // ---------------------------------------------------------
        // 1. DIRECTOR
        // Full system access
        // ---------------------------------------------------------
        case 'director':
          perms = ['all']; 
          break;

        // ---------------------------------------------------------
        // 2. ADMINISTRATOR
        // Full Access EXCEPT "Users & Roles"
        // ---------------------------------------------------------
        case 'administrator':
          perms = [
            'staff_read', 'staff_write', 'staff_delete',
            'clients_read', 'clients_write', 'clients_delete',
            'rota_read', 'rota_write', 'rota_delete',
            'timesheets_read', 'timesheets_approve', 
            'compliance_read',
            'reports_read',
            'settings_read', 'settings_write'
            // NOTE: 'users_read', 'users_write', 'roles_write' are EXCLUDED
          ];
          break;

        // ---------------------------------------------------------
        // 3. HR OFFICER
        // "Add + Edit" Staff, "Read" Clients/Rota/Timesheets, "No Delete"
        // ---------------------------------------------------------
        case 'hr_officer':
          perms = [
            'staff_read', 'staff_write', // Add + Edit allowed
            // 'staff_delete' is MISSING
            'clients_read',
            'rota_read',
            'timesheets_read',
            'compliance_read',
            'reports_read' 
          ];
          break;

        // ---------------------------------------------------------
        // 4. STAFF
        // "Own record only", "Read (own) Rota", "Submit own" Timesheets
        // ---------------------------------------------------------
        case 'staff':
        default:
          perms = [
            'staff_read', // UI should filter to show only own record
            'rota_read',  // UI should filter to show only own shifts
            'timesheets_submit',
            'settings_read' 
          ];
          break;
      }

      setPermissions(perms);
    }
    setLoading(false);
  };

  // Helper: Check if user has a specific permission
  const hasPermission = (requiredPerm) => {
    if (permissions.includes('all')) return true;
    return permissions.includes(requiredPerm);
  };

  // Helper: Check if user has ANY permission from a list
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