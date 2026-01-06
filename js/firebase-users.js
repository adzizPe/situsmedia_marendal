// Firebase Users - Track logged in users
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    authDomain: "login-fe9bf.firebaseapp.com",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf",
    storageBucket: "login-fe9bf.firebasestorage.app",
    messagingSenderId: "698680870534",
    appId: "1:698680870534:web:bc3f03d534a9659f6d7307"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Save user to Firebase when they login
export function saveUserToFirebase(user) {
    if (!user || !user.id) return;
    
    const userRef = ref(database, `users/${user.id}`);
    
    // Get existing user data first
    get(userRef).then((snapshot) => {
        const existingData = snapshot.val() || {};
        
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            firstLogin: existingData.firstLogin || Date.now(),
            lastLogin: Date.now(),
            loginCount: (existingData.loginCount || 0) + 1
        };
        
        set(userRef, userData);
    }).catch((error) => {
        console.error('Error saving user:', error);
    });
}

// Get all users (for admin)
export function getAllUsers(callback) {
    const usersRef = ref(database, 'users');
    
    onValue(usersRef, (snapshot) => {
        const users = [];
        snapshot.forEach((childSnapshot) => {
            users.push(childSnapshot.val());
        });
        
        // Sort by lastLogin descending
        users.sort((a, b) => b.lastLogin - a.lastLogin);
        
        callback(users);
    });
}

// Get user count
export function getUserCount(callback) {
    const usersRef = ref(database, 'users');
    
    onValue(usersRef, (snapshot) => {
        let count = 0;
        snapshot.forEach(() => count++);
        callback(count);
    });
}

// Make functions available globally
window.firebaseUsers = {
    save: saveUserToFirebase,
    getAll: getAllUsers,
    getCount: getUserCount
};
