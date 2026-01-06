// Firebase News - Realtime Database Only (No Storage)
const firebaseNewsConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    authDomain: "login-fe9bf.firebaseapp.com",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf",
    storageBucket: "login-fe9bf.firebasestorage.app",
    messagingSenderId: "698680870534",
    appId: "1:698680870534:web:bc3f03d534a9659f6d7307"
};

let firebaseNewsApp;
let newsDatabase;

function initFirebaseNews() {
    return new Promise((resolve, reject) => {
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined') {
                clearInterval(checkFirebase);
                try {
                    try {
                        firebaseNewsApp = firebase.app('newsApp');
                    } catch (e) {
                        firebaseNewsApp = firebase.initializeApp(firebaseNewsConfig, 'newsApp');
                    }
                    newsDatabase = firebaseNewsApp.database();
                    console.log('Firebase News initialized');
                    resolve();
                } catch (err) {
                    console.error('Firebase News init error:', err);
                    reject(err);
                }
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkFirebase);
            reject(new Error('Firebase not loaded'));
        }, 10000);
    });
}

// Save news to Firebase Database
async function saveNewsToFirebase(newsData) {
    // Generate slug from title
    newsData.slug = generateSlug(newsData.judul);
    const newsRef = newsDatabase.ref('newsSubmissions/' + newsData.id);
    await newsRef.set(newsData);
    return newsData.id;
}

// Generate URL-friendly slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // hapus karakter spesial
        .replace(/\s+/g, '-')          // spasi jadi dash
        .replace(/-+/g, '-')           // multiple dash jadi single
        .substring(0, 60)              // max 60 karakter
        .replace(/-$/, '');            // hapus dash di akhir
}

// Get all news from Firebase (realtime)
function getAllNews(callback) {
    const newsRef = newsDatabase.ref('newsSubmissions');
    newsRef.on('value', (snapshot) => {
        const news = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                news.push(child.val());
            });
            // Sort by submittedAt descending
            news.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        }
        console.log('Firebase news data:', news);
        callback(news);
    }, (error) => {
        console.error('Firebase read error:', error);
        callback([]);
    });
}

// Update news status
async function updateNewsStatus(id, status) {
    const newsRef = newsDatabase.ref('newsSubmissions/' + id);
    await newsRef.update({
        status: status,
        reviewedAt: new Date().toISOString()
    });
}

// Delete news
async function deleteNews(id) {
    const newsRef = newsDatabase.ref('newsSubmissions/' + id);
    await newsRef.remove();
}

// Update news content (for editing)
async function updateNews(id, updates) {
    const newsRef = newsDatabase.ref('newsSubmissions/' + id);
    // Re-generate slug if title changed
    if (updates.judul) {
        updates.slug = generateSlug(updates.judul);
    }
    await newsRef.update(updates);
}

// Export
window.firebaseNews = {
    init: initFirebaseNews,
    save: saveNewsToFirebase,
    getAll: getAllNews,
    updateStatus: updateNewsStatus,
    delete: deleteNews,
    update: updateNews
};


// Update existing news with slug (run once for old data)
async function updateExistingNewsWithSlug() {
    const newsRef = newsDatabase.ref('newsSubmissions');
    const snapshot = await newsRef.once('value');

    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            const news = child.val();
            if (!news.slug && news.judul) {
                const slug = generateSlug(news.judul);
                newsDatabase.ref('newsSubmissions/' + news.id + '/slug').set(slug);
                console.log('Added slug for:', news.judul, '->', slug);
            }
        });
    }
}

// Export
window.firebaseNews.generateSlug = generateSlug;
window.firebaseNews.updateSlugs = updateExistingNewsWithSlug;
