// Kirim Event - Same flow as Kirim Berita
document.addEventListener('DOMContentLoaded', function() {
    initKirimEvent();
});

let eventImageData = null;

function isUserLoggedIn() {
    return localStorage.getItem('googleUser') !== null;
}

function showLoginNotification() {
    const existing = document.getElementById('loginNotification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'loginNotification';
    notification.className = 'login-notification';
    notification.innerHTML = `
        <div class="login-notif-content">
            <span class="login-notif-icon">🔐</span>
            <div class="login-notif-text">
                <strong>Login Diperlukan</strong>
                <p>Silakan login dengan Google untuk mengirim event</p>
            </div>
            <button type="button" class="login-notif-btn" onclick="showLoginModal(); closeLoginNotification();">Login</button>
            <button type="button" class="login-notif-close" onclick="closeLoginNotification()">×</button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('active'), 10);
    setTimeout(() => closeLoginNotification(), 5000);
}

function closeLoginNotification() {
    const notification = document.getElementById('loginNotification');
    if (notification) {
        notification.classList.remove('active');
        setTimeout(() => notification.remove(), 300);
    }
}

// Compress image
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedData = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedData);
            };
            img.onerror = () => reject(new Error('Gagal memproses gambar'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsDataURL(file);
    });
}

function showUploadProgress(status) {
    let modal = document.getElementById('uploadModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'uploadModal';
        modal.className = 'kb-modal-overlay active';
        modal.innerHTML = `
            <div class="kb-modal kb-upload-modal">
                <div class="kb-upload-spinner"></div>
                <h3>Mengirim Event...</h3>
                <p id="uploadStatus">Memproses...</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('uploadStatus').textContent = status || 'Memproses...';
}

function hideUploadProgress() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.remove();
}

function initKirimEvent() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('eventImage');
    const preview = document.getElementById('imagePreview');
    
    // Firebase init
    const firebaseConfig = {
        apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
        databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
        projectId: "login-fe9bf"
    };
    
    let eventApp;
    try { eventApp = firebase.app('eventApp'); }
    catch (e) { eventApp = firebase.initializeApp(firebaseConfig, 'eventApp'); }
    
    const eventDb = eventApp.database();
    
    // Upload events
    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.ke-preview-item')) {
            if (!isUserLoggedIn()) { showLoginNotification(); return; }
            fileInput.click();
        }
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (isUserLoggedIn()) uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (!isUserLoggedIn()) { showLoginNotification(); return; }
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await handleImageFile(file);
        }
    });

    fileInput.addEventListener('change', async (e) => {
        if (!isUserLoggedIn()) { showLoginNotification(); fileInput.value = ''; return; }
        const file = e.target.files[0];
        if (file) await handleImageFile(file);
        fileInput.value = '';
    });

    async function handleImageFile(file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran gambar maksimal 5MB');
            return;
        }
        
        try {
            eventImageData = await compressImage(file);
            renderPreview();
        } catch (err) {
            alert(err.message);
        }
    }

    function renderPreview() {
        if (eventImageData) {
            preview.innerHTML = `
                <div class="ke-preview-item">
                    <img src="${eventImageData}" alt="Preview">
                    <button type="button" class="ke-preview-remove" onclick="removeEventImage()">×</button>
                </div>
            `;
        } else {
            preview.innerHTML = '';
        }
    }

    window.removeEventImage = function() {
        eventImageData = null;
        renderPreview();
    };

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isUserLoggedIn()) { showLoginNotification(); return; }
        
        const user = JSON.parse(localStorage.getItem('googleUser'));
        
        const name = document.getElementById('eventName').value.trim();
        const category = document.getElementById('eventCategory').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value.trim();
        const price = document.getElementById('eventPrice').value.trim();
        const link = document.getElementById('eventLink').value.trim();
        const description = document.getElementById('eventDesc').value.trim();
        const contact = document.getElementById('eventContact').value.trim();
        
        if (!name || !category || !date || !location || !description || !contact) {
            alert('Lengkapi semua field yang wajib (*)');
            return;
        }

        showUploadProgress('Menyimpan event...');
        
        try {
            const eventData = {
                id: 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name,
                category,
                date,
                time: time || 'TBA',
                location,
                price: price || 'Gratis',
                link,
                description,
                image: eventImageData || '',
                contact,
                status: 'pending',
                createdAt: new Date().toISOString(),
                slug: generateSlug(name),
                submittedBy: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    picture: user.picture
                }
            };
            
            await eventDb.ref('eventSubmissions/' + eventData.id).set(eventData);
            
            hideUploadProgress();
            document.getElementById('successModal').classList.add('active');
            
            // Reset
            form.reset();
            eventImageData = null;
            renderPreview();
            
        } catch (err) {
            hideUploadProgress();
            console.error(err);
            alert('Gagal mengirim: ' + err.message);
        }
    });
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
}
