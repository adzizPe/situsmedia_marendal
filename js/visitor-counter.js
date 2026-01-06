/**
 * Real-time Visitor Counter using Firebase Realtime Database
 * Fast & accurate tracking - visitors removed immediately when leaving
 */

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    get,
    remove,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    authDomain: "login-fe9bf.firebaseapp.com",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf",
    storageBucket: "login-fe9bf.firebasestorage.app",
    messagingSenderId: "698680870534",
    appId: "1:698680870534:web:bc3f03d534a9659f6d7307"
};

let app, database, visitorId, heartbeatInterval, cleanupInterval;
const HEARTBEAT_INTERVAL = 5000;  // 5 detik
const STALE_THRESHOLD = 15000;    // 15 detik tanpa heartbeat = dianggap offline

function initFirebase() {
    try {
        app = initializeApp(firebaseConfig, 'visitor-counter');
    } catch (e) {
        try { app = getApp('visitor-counter'); } 
        catch { app = getApp(); }
    }
    database = getDatabase(app);
    return database !== null;
}

function getVisitorId() {
    let id = sessionStorage.getItem('marendal_vid');
    if (!id) {
        id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        sessionStorage.setItem('marendal_vid', id);
    }
    return id;
}

function animateCount(element, from, to) {
    if (from === to) return;
    const duration = 200;
    const start = performance.now();
    const diff = to - from;

    function update(currentTime) {
        const progress = Math.min((currentTime - start) / duration, 1);
        element.textContent = Math.round(from + diff * progress);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// Remove visitor via REST API (reliable saat page close)
function removeVisitorNow(vid) {
    const url = `${firebaseConfig.databaseURL}/liveVisitors/${vid}.json`;
    
    // Gunakan fetch dengan keepalive
    fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {
        // Fallback sync XHR
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('DELETE', url, false);
            xhr.send();
        } catch (e) {}
    });
}

// Cleanup visitor yang sudah tidak aktif (stale)
async function cleanupStale() {
    try {
        const snapshot = await get(ref(database, 'liveVisitors'));
        if (!snapshot.exists()) return;

        const now = Date.now();
        const removes = [];

        snapshot.forEach((child) => {
            const data = child.val();
            if (now - (data.ts || 0) > STALE_THRESHOLD) {
                removes.push(child.key);
            }
        });

        // Hapus semua yang stale
        for (const key of removes) {
            await remove(ref(database, `liveVisitors/${key}`));
        }

        if (removes.length > 0) {
            console.log(`🧹 Cleaned ${removes.length} stale visitors`);
        }
    } catch (e) {
        console.warn('Cleanup error:', e);
    }
}

// Update heartbeat
async function sendHeartbeat() {
    if (!visitorId || !database) return;
    
    try {
        await set(ref(database, `liveVisitors/${visitorId}`), {
            ts: Date.now(),
            p: window.location.pathname.slice(0, 30)
        });
    } catch (e) {
        console.warn('Heartbeat failed:', e);
    }
}

// Handle visibility change (tab hidden/visible)
function handleVisibility() {
    if (document.hidden) {
        // Tab hidden - tetap kirim heartbeat tapi lebih jarang
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(sendHeartbeat, 10000);
    } else {
        // Tab visible - heartbeat normal
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        sendHeartbeat(); // Kirim langsung
    }
}

async function initVisitorCounter() {
    const counterEl = document.getElementById('visitorCount');
    if (!counterEl) return;

    if (!initFirebase()) {
        counterEl.textContent = '0';
        return;
    }

    visitorId = getVisitorId();
    const myRef = ref(database, `liveVisitors/${visitorId}`);
    const allRef = ref(database, 'liveVisitors');

    try {
        // Cleanup dulu sebelum register
        await cleanupStale();

        // Register visitor
        await set(myRef, {
            ts: Date.now(),
            p: window.location.pathname.slice(0, 30)
        });

        // Firebase onDisconnect sebagai backup
        await onDisconnect(myRef).remove();

        // Heartbeat setiap 5 detik
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        // Cleanup setiap 10 detik
        cleanupInterval = setInterval(cleanupStale, 10000);

        // Listen visitor count
        let currentCount = 0;
        onValue(allRef, (snapshot) => {
            let count = 0;
            if (snapshot.exists()) {
                const now = Date.now();
                snapshot.forEach((child) => {
                    const data = child.val();
                    // Hanya hitung yang masih fresh (< 15 detik)
                    if (now - (data.ts || 0) < STALE_THRESHOLD) {
                        count++;
                    }
                });
            }

            if (count !== currentCount) {
                animateCount(counterEl, currentCount, count);
                currentCount = count;
            }
        });

        // Handle tab visibility
        document.addEventListener('visibilitychange', handleVisibility);

        // Handle page close
        const handleClose = () => {
            clearInterval(heartbeatInterval);
            clearInterval(cleanupInterval);
            removeVisitorNow(visitorId);
        };

        window.addEventListener('beforeunload', handleClose);
        window.addEventListener('pagehide', handleClose);

        console.log('✅ Visitor counter ready:', visitorId);

    } catch (error) {
        console.error('Visitor counter error:', error);
        counterEl.textContent = '0';
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisitorCounter);
} else {
    initVisitorCounter();
}
