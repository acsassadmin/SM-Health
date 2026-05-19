import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwsnxbvayshoeoonoukd.supabase.co'; 

const supabaseAnonKey = 'sb_publishable_xT_5RS5vBc0rsvu3DzAo-Q_RhdOOyOz';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);