
import { createClient } from '@supabase/supabase-js';

// Credentials provided by user
const SUPABASE_URL = 'https://rgbptwuhhecunldjvdbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYnB0d3VoaGVjdW5sZGp2ZGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzY3ODgsImV4cCI6MjA4MDI1Mjc4OH0.jK6BE3kPbkC6U53BkiUhZ-uKcZuawg9qsTfExLR7cyI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
