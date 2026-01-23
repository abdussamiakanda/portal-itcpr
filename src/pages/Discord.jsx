import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { DISCORD_GUILD_ID, API_ENDPOINTS, DISCORD_ROLE_IDS } from '../config/env';
import LoadingOverlay from '../components/LoadingOverlay';
import '../css/style.css';

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

    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
        discordId: discordUserData.id,
        discordUsername: `${discordUserData.username}#${discordUserData.discriminator}`,
        discordAvatar: `https://cdn.discordapp.com/avatars/${discordUserData.id}/${discordUserData.avatar}.png`,
    });
    const userSnap = await getDoc(userRef);
    const userInfo = userSnap.data();

    await assignRole(discordUserData.id, DISCORD_ROLE_IDS[userInfo.group]);
    await assignRole(discordUserData.id, DISCORD_ROLE_IDS[userInfo.role === "intern" ? "intern" : "member"]);
}

async function addUserToGuild(userId, accessToken) {
    const API_URL = API_ENDPOINTS.discord.addUser;
    await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            userId: userId,
            accessToken: accessToken,
        }),
    });
}

async function assignRole(userId, roleId) {
    const API_URL = API_ENDPOINTS.discord.assignRole;
    await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            userId: userId,
            roleId: roleId,
        }),
    });
}

export default function Discord() {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        async function handleDiscordCallback() {
            try {
                const accessToken = getAccessTokenFromUrl();
                
                if (!accessToken) {
                    // No token, redirect to dashboard
                    navigate('/dashboard');
                    return;
                }

                // Process Discord OAuth callback
                await getUserInfo();
                
                // Redirect to dashboard after successful connection
                navigate('/dashboard');
            } catch (error) {
                console.error('Error handling Discord callback:', error);
                navigate('/dashboard');
            }
        }

        if (user) {
            handleDiscordCallback();
        } else {
            navigate('/');
        }
    }, [user, navigate]);

    return <LoadingOverlay show={true} />;
}

