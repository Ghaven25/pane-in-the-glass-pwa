// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ybncxfvrzfcdwcwilkmv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibmN4ZnZyemZjZHdjd2lsa212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjEzNjgsImV4cCI6MjA3ODE5NzM2OH0.MYFnt-nAinmBTrJ1_2umV5z7Eq1_wpmE0QV_bW6XYmQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});