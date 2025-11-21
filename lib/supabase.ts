
import { createClient } from '@supabase/supabase-js';

// Credentials provided by user
const SUPABASE_URL = 'https://gxuqncpmvfvmxieynudo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dXFuY3BtdmZ2bXhpZXludWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODQ3NzcsImV4cCI6MjA3OTI2MDc3N30.c12nyVvUKT75RkAd3wbRZYUHLRoSndB1_uwUDkQ2tqI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
