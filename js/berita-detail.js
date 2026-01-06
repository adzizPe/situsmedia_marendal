// ===== Image Gallery =====
function changeMainImage(thumb, src) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = src;
    }
    
    document.querySelectorAll('.gallery-thumb').forEach(t => {
        t.classList.remove('active');
    });
    thumb.classList.add('active');
}

// ===== Image Slider =====
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

function showSlide(index) {
    if (!slides.length) return;
    
    if (index >= slides.length) currentSlide = 0;
    if (index < 0) currentSlide = slides.length - 1;
    
    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (dots[i]) dots[i].classList.remove('active');
    });
    
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function changeSlide(direction) {
    currentSlide += direction;
    showSlide(currentSlide);
}

function goToSlide(index) {
    currentSlide = index;
    showSlide(currentSlide);
}

if (slides.length > 0) {
    setInterval(() => {
        changeSlide(1);
    }, 5000);
}

// Touch/Swipe support
let touchStartX = 0;
let touchEndX = 0;

const sliderContainer = document.querySelector('.slider-container');
if (sliderContainer) {
    sliderContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    sliderContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            changeSlide(diff > 0 ? 1 : -1);
        }
    });
}

// ===== Comment System with Firebase =====
const commentList = document.getElementById('commentList');
const commentFormContainer = document.getElementById('commentFormContainer');

// Initialize comment form based on login state
function initCommentForm() {
    if (!commentFormContainer) return;
    
    const savedUser = localStorage.getItem('googleUser');
    
    if (savedUser) {
        const user = JSON.parse(savedUser);
        commentFormContainer.innerHTML = `
            <div class="comment-user-info">
                <img src="${user.picture}" alt="${user.name}" class="comment-user-avatar">
                <span>Berkomentar sebagai <strong>${user.name}</strong></span>
            </div>
            <form class="comment-form-simple" id="commentForm">
                <textarea id="commentText" placeholder="Tulis komentar..." required></textarea>
                <button type="submit">Kirim Komentar</button>
            </form>
        `;
        
        const form = document.getElementById('commentForm');
        if (form) {
            form.addEventListener('submit', handleCommentSubmit);
        }
    } else {
        commentFormContainer.innerHTML = `
            <div class="comment-login-prompt">
                <p>🔐 Silakan login untuk berkomentar</p>
                <button type="button" class="btn-comment-login" onclick="showLoginModal()">
                    Login dengan Google
                </button>
            </div>
        `;
    }
}

// Handle comment submit
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    const savedUser = localStorage.getItem('googleUser');
    if (!savedUser) {
        showLoginModal();
        return;
    }
    
    const user = JSON.parse(savedUser);
    const textInput = document.getElementById('commentText');
    const text = textInput.value.trim();
    
    if (!text) {
        alert('Mohon isi komentar');
        return;
    }
    
    // Disable button while submitting
    const submitBtn = document.querySelector('#commentForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
    }
    
    try {
        // Save to Firebase
        if (window.firebaseComments) {
            await window.firebaseComments.save(user.name, user.picture, text);
        }
        
        // Clear form
        textInput.value = '';
    } catch (error) {
        console.error('Error saving comment:', error);
        alert('Gagal mengirim komentar. Coba lagi.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Komentar';
        }
    }
}

// Render comments to DOM
function renderComments(comments) {
    if (!commentList) return;
    
    if (comments.length === 0) {
        commentList.innerHTML = '<p class="no-comments">Belum ada komentar. Jadilah yang pertama!</p>';
        return;
    }
    
    let html = '';
    comments.forEach(comment => {
        const avatar = comment.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.name)}&background=2d8a4e&color=fff`;
        html += `
            <div class="comment-item-simple">
                <div class="comment-header">
                    <img src="${avatar}" alt="${escapeHtml(comment.name)}" class="comment-avatar">
                    <div class="comment-meta">
                        <span class="comment-name">${escapeHtml(comment.name)}</span>
                        <span class="comment-date">${comment.date}</span>
                    </div>
                </div>
                <p class="comment-text">${escapeHtml(comment.text)}</p>
            </div>
        `;
    });
    
    commentList.innerHTML = html;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize comments
function initComments() {
    initCommentForm();
    
    // Show loading
    if (commentList) {
        commentList.innerHTML = '<p class="loading-comments">Memuat komentar...</p>';
    }
    
    // Listen to Firebase comments (realtime)
    if (window.firebaseComments) {
        window.firebaseComments.listen(renderComments);
    } else {
        // Retry after Firebase loads
        setTimeout(() => {
            if (window.firebaseComments) {
                window.firebaseComments.listen(renderComments);
            } else {
                if (commentList) {
                    commentList.innerHTML = '<p class="no-comments">Belum ada komentar.</p>';
                }
            }
        }, 2000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initComments);
