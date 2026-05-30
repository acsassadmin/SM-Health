import { supabase } from '../supabaseClient';

export const logActivity = async (action, details) => {
  console.log("🟢 [LOGGER] Function called with:", { action, details });

  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log("🟢 [LOGGER] Session check:", session?.user?.email || "No session found");
    
    if (!session?.user) {
      console.warn("🔴 [LOGGER] ABORTED: No active user session.");
      return;
    }

    // Prepare the data object
    const logData = { 
      user_email: session.user.email, 
      action: action, 
      details: details 
    };
    
    console.log("🟢 [LOGGER] Preparing to insert into 'activity_logs':", logData);

    // Insert into the activity_logs table
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([logData])
      .select();

    if (error) {
      console.error("🔴 [LOGGER] SUPABASE INSERT FAILED:", error);
    } else {
      console.log("✅ [LOGGER] SUCCESS! Data saved to DB:", data);
    }

  } catch (err) {
    console.error("🔴 [LOGGER] UNEXPECTED ERROR:", err);
  }
};