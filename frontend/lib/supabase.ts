import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdeplxufauwbzcusxvtd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_CYhZfqDkN45GEbWj4BwRGw_zDiiJvUO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
