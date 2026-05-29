import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aagiixnjsbnszuhhstva.supabase.co'; 

const supabaseAnonKey = 'sb_publishable_5lpWO0dq0pp5D4hu33vh7g_7BPLAu-n';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);