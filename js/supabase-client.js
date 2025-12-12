// Supabase Configuration
const SUPABASE_URL = 'https://vjhdibyrqjxyrdwxnigl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Sf11a1WG4cMb0bwoeNZRPw_LjJkgtl3';

let supabase = null;

// Initialize Supabase client
function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded. Please check CDN script.');
        return false;
    }

    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ Supabase not configured. Using mock data mode.');
        return false;
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
    return true;
}

// Export for use in app.js
window.supabaseClient = {
    init: initSupabase,
    get client() { return supabase; }
};
