// Import configuration from environment variables
import { FIREBASE_CONFIG, SUPABASE_CONFIG } from './config/env';

// Firebase configuration (from environment variables)
export const firebaseConfig = FIREBASE_CONFIG;

// Supabase configuration (from environment variables)
export const supabaseConfig = {
    url: SUPABASE_CONFIG.url,
    key: SUPABASE_CONFIG.anonKey,
    serviceKey: SUPABASE_CONFIG.serviceKey
};


