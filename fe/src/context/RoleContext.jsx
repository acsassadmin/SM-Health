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


    try {
      // STEP 1: Get role_id from user_roles
      const { data: mappingData, error: mappingError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .single(); 

      if (mappingError) {
        throw new Error("User role mapping not found");
      }

      if (!mappingData || !mappingData.role_id) {
        throw new Error("Role ID is NULL in user_roles table");
      }

      const roleId = mappingData.role_id;

      // STEP 2: Fetch Role Details (Name & Slug)
      const { data: roleData, error: roleError } = await supabase
        .from('app_roles')
        .select('name, slug')
        .eq('id', roleId)
        .single();

      if (roleError) {
        throw new Error("App role definition not found");
      }

      // STALE CHECK
      if (currentExecutionId !== activeExecutionId.current) return null;

      // SUCCESS: Process Data
      const dbSlug = (roleData.slug || '').toLowerCase().trim();
      const dbName = roleData.name || 'Staff';
      
      setUserRole(dbName);

      // STEP 3: Fetch Permissions from Database (Dynamic)
      const { data: permsData, error: permsError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (resource, action)
        `)
        .eq('role_id', roleId);

      if (permsError) {
        throw new Error("Failed to load permissions");
      }

      // Transform DB data into simple permission strings
      let perms = [];
      
      // If Director, give 'all' immediately
      if (dbSlug === 'director') {
        perms = ['all'];
      } 
      // Otherwise, build list from database rows
      else if (permsData && permsData.length > 0) {
        perms = permsData
          .filter(p => p.permissions)
          .map(p => `${p.permissions.resource}_${p.permissions.action}`);
      }


      setPermissions(perms);
      setLoading(false);
      isFetching.current = false;
      return dbName;

    } catch (err) {
      if (currentExecutionId === activeExecutionId.current) {
        applyStaffFallback(err.message || "Database Query Error");
      }
      return 'Staff';
    }
  };

  useEffect(() => {
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
      subscription.unsubscribe();
    };
  }, []);

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

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used inside a structured RoleProvider template.");
  return context;
}