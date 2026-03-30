import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "Project URL";
const supabaseAnonKey = "Anon Key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
