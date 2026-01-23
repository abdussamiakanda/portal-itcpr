// Environment configuration
// All environment variables must be prefixed with VITE_ to be accessible in the browser
// All values are REQUIRED - no fallbacks to prevent exposing secrets

function getEnvVar(name, required = true) {
    const value = import.meta.env[name];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${name}. Please set it in your .env file.`);
    }
    return value;
}

export const API_BASE_URL = getEnvVar('VITE_API_BASE_URL');

// Discord Configuration
export const DISCORD_CLIENT_ID = getEnvVar('VITE_DISCORD_CLIENT_ID');
export const DISCORD_REDIRECT_URI = getEnvVar('VITE_DISCORD_REDIRECT_URI');
export const DISCORD_GUILD_ID = getEnvVar('VITE_DISCORD_GUILD_ID');

// Portal URL
export const PORTAL_URL = getEnvVar('VITE_PORTAL_URL');

// Discord Role IDs
export const DISCORD_ROLE_IDS = {
    spintronics: getEnvVar('VITE_DISCORD_ROLE_SPINTRONICS'),
    photonics: getEnvVar('VITE_DISCORD_ROLE_PHOTONICS'),
    member: getEnvVar('VITE_DISCORD_ROLE_MEMBER'),
    intern: getEnvVar('VITE_DISCORD_ROLE_INTERN')
};

// Discord Channel IDs
export const DISCORD_CHANNEL_IDS = {
    spintronics: getEnvVar('VITE_DISCORD_CHANNEL_SPINTRONICS'),
    photonics: getEnvVar('VITE_DISCORD_CHANNEL_PHOTONICS'),
    papers: getEnvVar('VITE_DISCORD_CHANNEL_PAPERS'),
    admin: getEnvVar('VITE_DISCORD_CHANNEL_ADMIN'),
    general: getEnvVar('VITE_DISCORD_CHANNEL_GENERAL')
};

// Supabase Configuration (from environment variables)
export const SUPABASE_CONFIG = {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    serviceKey: getEnvVar('VITE_SUPABASE_SERVICE_KEY')
};

// Firebase Configuration (from environment variables)
export const FIREBASE_CONFIG = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID'),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', false) // Optional
};

// API Endpoints
export const API_ENDPOINTS = {
    email: `${API_BASE_URL}/email/itcpr`,
    discord: {
        addUser: `${API_BASE_URL}/discord/add_user`,
        assignRole: `${API_BASE_URL}/discord/assign_role`,
        message: `${API_BASE_URL}/discord/message`
    },
    github: {
        uploadFile: `${API_BASE_URL}/github/upload_file`,
        getFiles: `${API_BASE_URL}/github/get_files`
    },
    supabase: {
        uploadFile: `${API_BASE_URL}/supabase/upload_file`
    },
    cloudflare: {
        upload: `${API_BASE_URL}/cloudflare/upload`
    },
    calendar: {
        ics: `${API_BASE_URL}/tool/itcpr_calendar_ics`
    }
};

