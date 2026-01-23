import { getAuth } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from '../contexts/AuthContext';
import { 
    DISCORD_CLIENT_ID, 
    DISCORD_REDIRECT_URI, 
    DISCORD_GUILD_ID,
    DISCORD_ROLE_IDS,
    DISCORD_CHANNEL_IDS,
    API_ENDPOINTS
} from '../config/env';

export const CLIENT_ID = DISCORD_CLIENT_ID;
export const REDIRECT_URI = DISCORD_REDIRECT_URI;

const roleIds = DISCORD_ROLE_IDS;
const channelIds = DISCORD_CHANNEL_IDS;

/**
 * Generate Discord OAuth authorization URL
 * @returns {string} Discord OAuth URL
 */
export function getDiscordAuthUrl() {
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=token&scope=identify%20guilds.members.read%20guilds.join`;
}

function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get("access_token");
}

async function getUserInfo() {
    const accessToken = getAccessTokenFromUrl();
    if (!accessToken) return;

    const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const discordUserData = await userResponse.json();

    const guildResponse = await fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const isInGuild = guildResponse.status === 200;

    if (!isInGuild) {
        await addUserToGuild(discordUserData.id, accessToken);
    }

    const auth = getAuth();

    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
        discordId: discordUserData.id,
        discordUsername: `${discordUserData.username}#${discordUserData.discriminator}`,
        discordAvatar: `https://cdn.discordapp.com/avatars/${discordUserData.id}/${discordUserData.avatar}.png`,
    });
    const userSnap = await getDoc(userRef);
    const userInfo = userSnap.data();

    await assignRole(discordUserData.id, roleIds[userInfo.group]);
    await assignRole(discordUserData.id, roleIds[userInfo.role === "intern" ? "intern" : "member"]);

    window.location.href = "./";
}

async function addUserToGuild(userId, accessToken) {
    const API_URL = API_ENDPOINTS.discord.addUser;

    await fetch(API_URL, {
        method: "POST", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, accessToken })
    })
    .then(response => response.json())
    .then(data => console.log("Success:", data))
    .catch(error => console.error("Error:", error));
}

async function assignRole(userId, roleId) {
    const API_URL = API_ENDPOINTS.discord.assignRole;

    await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, roleId })
    })
    .then(response => response.json())
    .then(data => console.log("Role Assigned:", data))
    .catch(error => console.error("Error:", error));
}

export async function sendMessageToChannel(groupId, message) {
    const API_URL = API_ENDPOINTS.discord.message;
    const channelId = channelIds[groupId];

    await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ channelId, message })
    })
    .then(response => response.json())
    .then(data => console.log("Message response:", data))
    .catch(error => console.error("Error sending message:", error));
}

// Call on mount if needed
if (typeof window !== 'undefined' && window.location.pathname === '/discord') {
    getUserInfo();
}


