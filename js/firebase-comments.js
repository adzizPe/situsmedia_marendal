// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, push, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

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

// Get article ID from URL
function getArticleId() {
    return window.location.pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'default';
}

// Save comment to Firebase
export function saveCommentToFirebase(name, picture, text) {
    const articleId = getArticleId();
    const commentsRef = ref(database, `comments/${articleId}`);
    
    const newComment = {
        name: name,
        picture: picture || '',
        text: text,
        timestamp: Date.now(),
        date: new Date().toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    
    return push(commentsRef, newComment);
}

// Listen to comments from Firebase (realtime)
export function listenToComments(callback) {
    const articleId = getArticleId();
    const commentsRef = ref(database, `comments/${articleId}`);
    
    onValue(commentsRef, (snapshot) => {
        const comments = [];
        snapshot.forEach((childSnapshot) => {
            comments.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp descending (newest first)
        comments.sort((a, b) => b.timestamp - a.timestamp);
        
        callback(comments);
    });
}

// Make functions available globally
window.firebaseComments = {
    save: saveCommentToFirebase,
    listen: listenToComments
};
