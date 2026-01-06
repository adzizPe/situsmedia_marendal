// Kirim Berita - Compress + Firebase Database
document.addEventListener('DOMContentLoaded', function() {
    initKirimBerita();
});

let uploadedFiles = [];

function isUserLoggedIn() {
    return localStorage.getItem('googleUser') !== null;
}

// Compress image
function compressImage(file, maxWidth = 800, quality = 0.6) {
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

// Process video - convert to thumbnail only (video too large for DB)
function processVideo(file) {
    return new Promise((resolve, reject) => {
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > 5) {
            reject(new Error(`Video terlalu besar (${sizeInMB.toFixed(1)}MB). Maksimal 5MB.`));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Gagal membaca video'));
        reader.readAsDataURL(file);
    });
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
                <p>Silakan login dengan Google untuk mengirim berita</p>
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

function showUploadProgress(status) {
    let modal = document.getElementById('uploadModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'uploadModal';
        modal.className = 'kb-modal-overlay active';
        modal.innerHTML = `
            <div class="kb-modal kb-upload-modal">
                <div class="kb-upload-spinner"></div>
                <h3>Mengirim Berita...</h3>
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

function initKirimBerita() {
    const form = document.getElementById('submitNewsForm');
    if (!form) return;
    
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('gambarBerita');
    const uploadInner = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const textarea = document.getElementById('deskripsiBerita');
    const charCount = document.getElementById('charCount');
    const contactRadios = document.querySelectorAll('input[name="contactType"]');
    const kontakInput = document.getElementById('kontakValue');
    const tanggalInput = document.getElementById('tanggalBerita');
    const waktuInput = document.getElementById('waktuBerita');
    
    // Auto-fill from Google
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const namaPenerbit = document.getElementById('namaPenerbit');
        if (namaPenerbit && !namaPenerbit.value) {
            namaPenerbit.value = user.name;
        }
    }

    const now = new Date();
    if (tanggalInput) tanggalInput.value = now.toISOString().split('T')[0];
    if (waktuInput) waktuInput.value = now.toTimeString().slice(0, 5);

    // Upload events
    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.kb-preview-item') && !e.target.closest('.kb-preview-add')) {
            if (!isUserLoggedIn()) { showLoginNotification(); return; }
            fileInput.click();
        }
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (isUserLoggedIn()) uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (!isUserLoggedIn()) { showLoginNotification(); return; }
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        if (!isUserLoggedIn()) { showLoginNotification(); fileInput.value = ''; return; }
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    async function handleFiles(files) {
        for (const file of Array.from(files)) {
            if (uploadedFiles.length >= 5) {
                alert('Maksimal 5 file.');
                return;
            }
            
            const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
            const isImage = validImageTypes.includes(file.type);
            const isVideo = validVideoTypes.includes(file.type);
            
            if (!isImage && !isVideo) {
                alert('Format tidak didukung. Gunakan JPG, PNG, WebP, GIF, MP4, MOV, atau WebM.');
                continue;
            }

            try {
                let data, type;
                
                if (isImage) {
                    data = await compressImage(file);
                    type = 'image';
                } else {
                    data = await processVideo(file);
                    type = 'video';
                }
                
                uploadedFiles.push({ data, type, name: file.name });
                renderPreviews();
            } catch (err) {
                alert(err.message);
            }
        }
    }

    function renderPreviews() {
        if (uploadedFiles.length > 0) {
            uploadInner.style.display = 'none';
            previewContainer.innerHTML = uploadedFiles.map((media, idx) => `
                <div class="kb-preview-item ${media.type === 'video' ? 'kb-preview-video' : ''}">
                    ${media.type === 'video' ? 
                        `<video src="${media.data}" muted></video><span class="kb-video-badge">▶ Video</span>` : 
                        `<img src="${media.data}" alt="Preview">`
                    }
                    <button type="button" class="kb-preview-remove" onclick="removeFile(${idx})">×</button>
                    ${idx === 0 ? '<span class="kb-preview-main">Utama</span>' : ''}
                </div>
            `).join('') + (uploadedFiles.length < 5 ? `
                <div class="kb-preview-add" onclick="triggerFileInput()">
                    <span>+</span><small>Tambah</small>
                </div>
            ` : '');
            previewContainer.classList.add('active');
        } else {
            uploadInner.style.display = 'block';
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('active');
        }
    }

    window.triggerFileInput = function() {
        if (!isUserLoggedIn()) { showLoginNotification(); return; }
        fileInput.click();
    };

    window.removeFile = function(idx) {
        uploadedFiles.splice(idx, 1);
        renderPreviews();
    };

    if (textarea) {
        textarea.addEventListener('input', () => {
            charCount.textContent = textarea.value.length;
        });
    }

    contactRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            kontakInput.placeholder = radio.value === 'whatsapp' ? '08xxxxxxxxxx' : 'email@contoh.com';
            kontakInput.type = radio.value === 'whatsapp' ? 'tel' : 'email';
        });
    });

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isUserLoggedIn()) { showLoginNotification(); return; }
        
        const user = JSON.parse(localStorage.getItem('googleUser'));
        
        if (uploadedFiles.length === 0) {
            alert('Upload minimal 1 foto/video.');
            return;
        }

        if (!document.getElementById('noHoax').checked) {
            alert('Centang pernyataan bukan hoax.');
            return;
        }

        const judul = document.getElementById('judulBerita').value.trim();
        const penerbit = document.getElementById('namaPenerbit').value.trim();
        const deskripsi = document.getElementById('deskripsiBerita').value.trim();
        const lokasi = document.getElementById('lokasiKejadian').value.trim();
        const kategori = document.getElementById('kategoriBerita').value;
        const kontakValue = document.getElementById('kontakValue').value.trim();
        
        if (!judul || !penerbit || !deskripsi || !lokasi || !kategori || !kontakValue) {
            alert('Lengkapi semua field.');
            return;
        }

        showUploadProgress('Menyimpan berita...');
        
        try {
            await window.firebaseNews.init();
            
            const newsData = {
                id: 'news_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                judul,
                penerbit,
                gambar: uploadedFiles.map(f => f.data),
                mediaTypes: uploadedFiles.map(f => f.type),
                deskripsi,
                tanggal: tanggalInput.value,
                waktu: waktuInput.value,
                lokasi,
                kategori,
                kontakType: document.querySelector('input[name="contactType"]:checked').value,
                kontakValue,
                status: 'pending',
                submittedAt: new Date().toISOString(),
                submittedBy: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    picture: user.picture
                }
            };
            
            await window.firebaseNews.save(newsData);
            
            hideUploadProgress();
            document.getElementById('successModal').classList.add('active');
            
            // Reset
            form.reset();
            uploadedFiles = [];
            renderPreviews();
            if (charCount) charCount.textContent = '0';
            tanggalInput.value = new Date().toISOString().split('T')[0];
            waktuInput.value = new Date().toTimeString().slice(0, 5);
            document.getElementById('namaPenerbit').value = user.name;
            
        } catch (err) {
            hideUploadProgress();
            console.error(err);
            alert('Gagal mengirim: ' + err.message);
        }
    });
}

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
}
