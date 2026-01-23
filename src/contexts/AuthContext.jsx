import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../config';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ssoData, setSsoData] = useState(null);

    const handleSSOAuthentication = useCallback(async (data) => {
        if (!data || !data.token) {
            console.error('Invalid SSO data');
            return;
        }

        try {
            await signInWithCustomToken(auth, data.token);
            localStorage.setItem('ssoData', JSON.stringify(data));
        } catch (error) {
            console.error('SSO authentication failed:', error);
            alert('SSO authentication failed. Please try again.');
        }
    }, []);

    useEffect(() => {
        // Check for SSO data in URL on mount
        const urlParams = new URLSearchParams(window.location.search);
        const ssoParam = urlParams.get('sso');
        
        if (ssoParam) {
            try {
                const data = JSON.parse(decodeURIComponent(ssoParam));
                setSsoData(data);
                handleSSOAuthentication(data);
                
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
            } catch (error) {
                console.error('Error parsing SSO data:', error);
            }
        }
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userExists = await checkUserExists(firebaseUser.email);
                if (userExists) {
                    await updateUserInfo(firebaseUser);
                    const data = await loadUserInfo(firebaseUser);
                    setUser(firebaseUser);
                    setUserData(data);
                } else {
                    await signOutUser();
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [handleSSOAuthentication]);

    useEffect(() => {
        const handleMessage = (event) => {
            // Accept messages from SSO server (the sender's origin)
            // The message comes FROM sso.itcpr.org, regardless of target
            const allowedOrigins = [
                'https://sso.itcpr.org',
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                window.location.origin // Allow same origin for testing
            ];
            
            // For development, be more permissive - accept any localhost origin
            const isDevelopment = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1';
            
            // Check if origin is allowed
            const isOriginAllowed = allowedOrigins.includes(event.origin) || 
                                   (isDevelopment && event.origin.startsWith('http://localhost')) ||
                                   (isDevelopment && event.origin.startsWith('http://127.0.0.1'));
            
            if (!isOriginAllowed) {
                return;
            }
            
            const data = event.data;
            
            // Validate data is an object
            if (!data || typeof data !== 'object') {
                return;
            }
            
            // Check for success payload (from SSO popup) - this is the main format
            if (data.success === true && data.token && data.tokenType === 'custom_token') {
                setSsoData(data);
                handleSSOAuthentication(data);
                return;
            } 
            // Check for token payload (alternative format without success flag)
            else if (data.token && data.tokenType === 'custom_token') {
                setSsoData(data);
                handleSSOAuthentication(data);
                return;
            } 
            // Check for error payload
            else if (data.success === false) {
                console.error('❌ SSO error received:', data.error);
                alert('SSO authentication failed: ' + (data.error || 'Unknown error'));
                return;
            }
            // Ignore unexpected messages
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [handleSSOAuthentication]);

    async function signInWithSSO() {
        try {
            // Get the current origin (portal URL) - use full origin including protocol
            const currentOrigin = window.location.origin;
            
            // Build SSO URL with popup mode and parent origin
            // The parent parameter should be the full origin URL
            const ssoUrl = `https://sso.itcpr.org?popup=true&parent=${encodeURIComponent(currentOrigin)}`;
            
            const popup = window.open(
                ssoUrl, 
                'SSO Login', 
                'width=500,height=600,scrollbars=yes,resizable=yes,left=100,top=100'
            );
            
            if (!popup) {
                alert('Popup blocked. Please allow popups for this site and try again.');
                return;
            }
            
            // Give the popup time to load before checking
            let popupReady = false;
            const checkPopupReady = setInterval(() => {
                try {
                    // Try to access popup location (will throw if cross-origin, which is expected)
                    if (popup.location) {
                        popupReady = true;
                    }
                } catch (e) {
                    // Cross-origin, popup is loaded
                    popupReady = true;
                }
                
                if (popupReady || popup.closed) {
                    clearInterval(checkPopupReady);
                }
            }, 100);
            
            // Monitor popup closure - the message handler will process the SSO response
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    clearInterval(checkPopupReady);
                }
            }, 500);
            
            // Cleanup after 60 seconds if popup is still open
            setTimeout(() => {
                clearInterval(checkClosed);
                clearInterval(checkPopupReady);
                if (popup && !popup.closed) {
                    popup.close();
                }
            }, 60000);
            
        } catch (error) {
            console.error('SSO authentication error:', error);
            alert('Failed to open SSO login. Please try again.');
        }
    }

    async function signOutUser() {
        try {
            await signOut(auth);
            localStorage.removeItem('ssoData');
            setSsoData(null);
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
        }
    }

    async function checkUserExists(email) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking email:', error);
            return false;
        }
    }

    async function updateUserInfo(firebaseUser) {
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (!data.timezone || data.timezone !== userTimeZone) {
                    await updateDoc(userRef, { timezone: userTimeZone });
                }
                await updateDoc(userRef, { lastLogin: serverTimestamp() });
            }
        } catch (error) {
            console.error('Error updating user info:', error);
        }
    }

    async function loadUserInfo(firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        return userSnap.data();
    }

    const value = {
        user,
        userData,
        loading,
        signInWithSSO,
        signOutUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

