import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vylkgnqdcnneonxcrquu.supabase.co";
const supabaseAnonKey = "sb_publishable_9FcMN56X_24ubms6d_6WFA_VwBa4Dda";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
