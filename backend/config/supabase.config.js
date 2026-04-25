import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://example.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "public-anon-key";

const supabase = createClient(supabaseUrl, supabaseKey);

export default null;