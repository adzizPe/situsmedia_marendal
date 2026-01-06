// Google Auth Configuration
const GOOGLE_CLIENT_ID = '830162422312-5h3nq1bohtktfhg4ksodt0jjsbeuria9.apps.googleusercontent.com';

let currentUser = null;
let googleInitialized = false;

// Initialize Google Sign-In
function initGoogleAuth() {
    // Load saved user from localStorage
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    updateAuthUI();
    
    // Wait for Google library to load
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleButton();
    } else {
        // Retry after a short delay
        setTimeout(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                initializeGoogleButton();
            }
        }, 1000);
    }
}

// Initialize Google button
function initializeGoogleButton() {
    if (googleInitialized) return;
    
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    
    googleInitialized = true;
}

// Handle Google Sign-In callback
function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    
    currentUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture
    };
    
    // Save to localStorage
    localStorage.setItem('googleUser', JSON.stringify(currentUser));
    
    // Save to Firebase (for tracking)
    if (window.firebaseUsers) {
        window.firebaseUsers.save(currentUser);
    } else {
        // Retry after Firebase loads
        setTimeout(() => {
            if (window.firebaseUsers) {
                window.firebaseUsers.save(currentUser);
            }
        }, 1000);
    }
    
    updateAuthUI();
    
    // Dispatch custom event for other scripts
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: currentUser }));
    
    // Close login modal if open
    closeLoginModal();
    
    // Reload page to update all components
    location.reload();
}

// Parse JWT token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Update UI based on auth state
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;
    
    if (currentUser) {
        authContainer.innerHTML = `
            <div class="user-menu">
                <button class="user-btn" onclick="toggleUserDropdown()">
                    <img src="${currentUser.picture}" alt="${currentUser.name}" class="user-avatar">
                    <span class="user-name">${currentUser.name.split(' ')[0]}</span>
                </button>
                <div class="user-dropdown" id="userDropdown">
                    <div class="user-dropdown-header">
                        <img src="${currentUser.picture}" alt="${currentUser.name}">
                        <div>
                            <strong>${currentUser.name}</strong>
                            <small>${currentUser.email}</small>
                        </div>
                    </div>
                    <div class="user-dropdown-menu">
                        <a href="${getBasePath()}kirim-berita/">📝 Kirim Berita</a>
                        <button onclick="logout()">🚪 Keluar</button>
                    </div>
                </div>
            </div>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="login-btn-google" onclick="showLoginModal()">
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Masuk
            </button>
        `;
    }
}

// Get base path for links
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/berita/') && path.includes('/index.html')) {
        return '../../';
    } else if (path.includes('/berita/')) {
        return '../';
    } else if (path.includes('/kirim-berita/')) {
        return '../';
    }
    return './';
}

// Toggle user dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        // Tutup submenu navbar jika ada
        document.querySelectorAll('.has-submenu.active').forEach(item => {
            item.classList.remove('active');
        });
        
        dropdown.classList.toggle('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }
});

// Show login modal
function showLoginModal() {
    let modal = document.getElementById('loginModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loginModal';
        modal.className = 'login-modal-overlay';
        
        // Determine logo path based on current page depth
        const pathDepth = window.location.pathname.split('/').filter(p => p && !p.includes('.')).length;
        const logoPath = pathDepth === 0 ? 'assets/marendallogo.png' : '../'.repeat(pathDepth) + 'assets/marendallogo.png';
        
        modal.innerHTML = `
            <div class="login-modal">
                <button class="login-modal-close" onclick="closeLoginModal()">×</button>
                <div class="login-modal-content">
                    <div class="login-modal-logo">
                        <img src="${logoPath}" alt="MarendalSatu" style="height:40px;">
                    </div>
                    <h2>Masuk ke Akun</h2>
                    <p>Masuk untuk berkomentar dan mengirim berita</p>
                    <div id="googleSignInBtn" class="google-signin-wrapper"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.add('active');
    
    // Render Google button after modal is visible
    setTimeout(() => {
        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer && typeof google !== 'undefined' && google.accounts) {
            btnContainer.innerHTML = ''; // Clear previous
            google.accounts.id.renderButton(
                btnContainer,
                { 
                    theme: 'outline', 
                    size: 'large',
                    width: 280,
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                }
            );
        }
    }, 100);
}

// Close login modal
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('login-modal-overlay')) {
        closeLoginModal();
    }
});

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('googleUser');
    updateAuthUI();
    location.reload();
}

// Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
});
