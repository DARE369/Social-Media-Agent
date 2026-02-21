import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujkuwemwlhilzarbrozu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa3V3ZW13bGhpbHphcmJyb3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzM4MDQsImV4cCI6MjA3Nzg0OTgwNH0.omlnc_MMUJf5_h-01KPPoTNO1F0AIdBIwZTWA6ZoQmc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);