// Admin Portal JavaScript - Firebase Version
document.addEventListener('DOMContentLoaded', function () {
    checkSession();
    initLogin();
    initDashboard();
});

const ADMIN = { username: 'adminsiapaaja', password: 'adminsiapaaja' };

let allNewsData = [];
let allEventsData = [];

const firebaseConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf"
};

let eventAdminApp;
try { eventAdminApp = firebase.app('eventAdminApp'); }
catch (e) { eventAdminApp = firebase.initializeApp(firebaseConfig, 'eventAdminApp'); }

const eventAdminDb = eventAdminApp.database();

// Toggle Sidebar for Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.adm-sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}
window.toggleSidebar = toggleSidebar;

function checkSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }
}

function initLogin() {
    const form = document.getElementById('adminLoginForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('adminUsername').value;
        const pass = document.getElementById('adminPassword').value;
        if (user === ADMIN.username && pass === ADMIN.password) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            showDashboard();
        } else {
            document.getElementById('loginError').classList.add('show');
            setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
        }
    });
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminDashboard').classList.add('active');
    loadNews();
    loadUsers();
    loadEvents();
}

function initDashboard() {
    document.getElementById('btnLogout').addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        location.reload();
    });
    document.querySelectorAll('.adm-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.adm-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterNews(btn.dataset.filter);
        });
    });
}


function showSection(section) {
    document.querySelectorAll('.adm-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) item.classList.add('active');
    });
    const topbarTitle = document.querySelector('.adm-topbar h2');
    document.querySelector('.adm-content:not(.adm-section)').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    document.getElementById('eventsSection').style.display = 'none';
    const quizSection = document.getElementById('quizSection');
    if (quizSection) quizSection.style.display = 'none';

    if (section === 'news') {
        document.querySelector('.adm-content:not(.adm-section)').style.display = 'block';
        if (topbarTitle) topbarTitle.textContent = 'Berita Masuk';
    } else if (section === 'users') {
        document.getElementById('usersSection').style.display = 'block';
        if (topbarTitle) topbarTitle.textContent = 'Users Login';
    } else if (section === 'events') {
        document.getElementById('eventsSection').style.display = 'block';
        if (topbarTitle) topbarTitle.textContent = 'Event Masuk';
    } else if (section === 'quiz') {
        if (quizSection) quizSection.style.display = 'block';
        if (topbarTitle) topbarTitle.textContent = 'Quiz Berita';
        loadQuiz();
    }

    // Close sidebar on mobile after selecting menu
    if (window.innerWidth <= 900) {
        const sidebar = document.querySelector('.adm-sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}
window.showSection = showSection;

function loadUsers() {
    const usersList = document.getElementById('usersList');
    const totalUsers = document.getElementById('totalUsers');
    const checkFirebase = () => {
        if (window.firebaseUsers) {
            window.firebaseUsers.getAll((users) => {
                if (totalUsers) totalUsers.textContent = users.length;
                if (users.length === 0) {
                    usersList.innerHTML = '<p class="adm-empty-users">Belum ada user yang login</p>';
                    return;
                }
                usersList.innerHTML = users.map(user => `
                    <div class="adm-user-card">
                        <img src="${user.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name)}" alt="${user.name}" class="adm-user-avatar">
                        <div class="adm-user-info">
                            <strong>${escapeHtml(user.name)}</strong>
                            <small>${escapeHtml(user.email)}</small>
                        </div>
                        <div class="adm-user-stats">
                            <span title="Login count">🔑 ${user.loginCount || 1}x</span>
                            <span title="Last login">🕐 ${formatDateTime(user.lastLogin)}</span>
                        </div>
                    </div>
                `).join('');
            });
        } else {
            setTimeout(checkFirebase, 500);
        }
    };
    checkFirebase();
}

function loadNews() {
    const container = document.getElementById('adminNewsList');
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Memuat data...</p>';
    const checkFirebase = () => {
        if (window.firebaseNews) {
            window.firebaseNews.init().then(() => {
                window.firebaseNews.getAll((news) => {
                    allNewsData = news;
                    updateStats();
                    const activeFilter = document.querySelector('.adm-filter-btn.active');
                    renderNews(news, activeFilter ? activeFilter.dataset.filter : 'pending');
                });
            }).catch(err => {
                container.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">Gagal memuat. Error: ' + err.message + '</p>';
            });
        } else {
            setTimeout(checkFirebase, 300);
        }
    };
    checkFirebase();
}

function getThumbnail(gambar) {
    if (Array.isArray(gambar)) return gambar[0] || 'https://placehold.co/100x80/eee/999?text=No+Image';
    return gambar || 'https://placehold.co/100x80/eee/999?text=No+Image';
}

function renderNews(data, filter = 'pending') {
    const container = document.getElementById('adminNewsList');
    const empty = document.getElementById('emptyState');
    if (!container) return;
    let filtered = filter === 'all' ? data : data.filter(n => n.status === filter);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="adm-empty-state"><p>Tidak ada berita</p></div>';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    container.innerHTML = filtered.map(news => `
        <div class="adm-news-item" data-id="${news.id}">
            <div class="adm-news-thumb">
                <img src="${getThumbnail(news.gambar)}" alt="" onerror="this.src='https://placehold.co/100x80/eee/999?text=Error'">
            </div>
            <div class="adm-news-info">
                <span class="adm-news-status ${news.status}">${statusLabel(news.status)}</span>
                <h3 class="adm-news-title">${escapeHtml(news.judul || '')}</h3>
                <div class="adm-news-meta">
                    <span>👤 ${escapeHtml(news.penerbit || '')}</span>
                    <span>📍 ${escapeHtml(news.lokasi || '')}</span>
                    <span>📅 ${formatDate(news.tanggal)}</span>
                </div>
                <p class="adm-news-excerpt">${escapeHtml((news.deskripsi || '').substring(0, 100))}...</p>
            </div>
            <div class="adm-news-actions">
                <button type="button" class="adm-btn adm-btn-view" onclick="viewDetail('${news.id}')">Lihat</button>
                <button type="button" class="adm-btn adm-btn-edit" onclick="editNews('${news.id}')">✏️ Edit</button>
                ${news.status === 'pending' ? `
                    <button type="button" class="adm-btn adm-btn-approve" onclick="confirmAction('${news.id}', 'approve')">✓ Setujui</button>
                    <button type="button" class="adm-btn adm-btn-reject" onclick="confirmAction('${news.id}', 'reject')">✕ Tolak</button>
                ` : ''}
                <button type="button" class="adm-btn adm-btn-delete" onclick="confirmAction('${news.id}', 'delete')">🗑 Hapus</button>
            </div>
        </div>
    `).join('');
}

function filterNews(filter) { renderNews(allNewsData, filter); }

function updateStats() {
    document.getElementById('pendingCount').textContent = allNewsData.filter(n => n.status === 'pending').length;
    document.getElementById('approvedCount').textContent = allNewsData.filter(n => n.status === 'approved').length;
    document.getElementById('rejectedCount').textContent = allNewsData.filter(n => n.status === 'rejected').length;
}


function isVideoUrl(url) {
    if (!url) return false;
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const lowerUrl = url.toLowerCase();
    return videoExts.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video');
}

function renderMediaElement(url, isMain = false) {
    if (!url) return '<div style="background:#f0f0f0;height:200px;display:flex;align-items:center;justify-content:center;color:#999;">No Media</div>';

    if (isVideoUrl(url)) {
        return `<video controls ${isMain ? 'style="width:100%;max-height:400px;border-radius:8px;"' : ''}>
            <source src="${url}" type="video/mp4">
            Browser tidak support video.
        </video>`;
    }
    return `<img src="${url}" alt="" ${isMain ? 'id="detailMainMedia"' : ''} onerror="this.src='https://placehold.co/400x300/eee/999?text=Error'" style="width:100%;border-radius:8px;">`;
}

function viewDetail(id) {
    const news = allNewsData.find(n => n.id === id);
    if (!news) return;
    const media = Array.isArray(news.gambar) ? news.gambar : [news.gambar];
    const submitter = news.submittedBy || {};

    // Render all media (images and videos)
    let mediaHtml = '';
    if (media.length > 0 && media[0]) {
        mediaHtml = `<div class="adm-detail-gallery"><div class="adm-gallery-main">${renderMediaElement(media[0], true)}</div>`;
        if (media.length > 1) {
            mediaHtml += `<div class="adm-gallery-thumbs" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">`;
            media.forEach((m, i) => {
                if (m) {
                    if (isVideoUrl(m)) {
                        mediaHtml += `<div style="width:80px;height:60px;background:#333;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:20px;" onclick="changeMainMedia('${m}', true)">▶</div>`;
                    } else {
                        mediaHtml += `<img src="${m}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="changeMainMedia('${m}', false)">`;
                    }
                }
            });
            mediaHtml += `</div>`;
        }
        mediaHtml += `</div>`;
    }

    // Format kontak
    let kontakHtml = '-';
    if (news.kontakValue) {
        const kontakType = news.kontakType || 'whatsapp';
        if (kontakType === 'whatsapp') {
            kontakHtml = `<a href="https://wa.me/${news.kontakValue.replace(/^0/, '62')}" target="_blank" style="color:#25D366;">📱 ${news.kontakValue}</a>`;
        } else {
            kontakHtml = `<a href="mailto:${news.kontakValue}" style="color:#2196F3;">📧 ${news.kontakValue}</a>`;
        }
    }

    // Format tanggal kejadian
    let tanggalKejadianHtml = '-';
    if (news.tanggal) {
        tanggalKejadianHtml = formatDate(news.tanggal);
        if (news.waktu) {
            tanggalKejadianHtml += ` pukul ${news.waktu}`;
        }
    }

    document.getElementById('modalBody').innerHTML = `
        <div class="adm-detail-header">
            <span class="adm-news-status ${news.status}">${statusLabel(news.status)}</span>
            <h2 class="adm-detail-title">${escapeHtml(news.judul)}</h2>
        </div>
        ${mediaHtml}
        <div class="adm-detail-info">
            <div class="adm-detail-row"><span class="adm-detail-label">Kategori</span><span class="adm-detail-value">${capitalize(news.kategori)}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Lokasi</span><span class="adm-detail-value">${escapeHtml(news.lokasi)}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Waktu Kejadian</span><span class="adm-detail-value">${tanggalKejadianHtml}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Tanggal Dikirim</span><span class="adm-detail-value">${formatDateTime(news.submittedAt)}</span></div>
        </div>
        <div class="adm-detail-info" style="margin-top:15px;">
            <h4 style="margin-bottom:10px;font-size:0.9rem;color:#666;">👤 Informasi Pengirim</h4>
            <div class="adm-detail-row"><span class="adm-detail-label">Nama</span><span class="adm-detail-value">${escapeHtml(news.penerbit)}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Kontak</span><span class="adm-detail-value">${kontakHtml}</span></div>
        </div>
        <div class="adm-detail-content"><h4>Isi Berita:</h4><p>${escapeHtml(news.deskripsi || '').replace(/\n/g, '<br>')}</p></div>
        <div class="adm-detail-actions">
            <button type="button" class="adm-btn adm-btn-edit" onclick="editNews('${news.id}'); closeDetailModal();">✏️ Edit</button>
            ${news.status === 'pending' ? `
                <button type="button" class="adm-btn adm-btn-approve" onclick="confirmAction('${news.id}', 'approve'); closeDetailModal();">✓ Setujui</button>
                <button type="button" class="adm-btn adm-btn-reject" onclick="confirmAction('${news.id}', 'reject'); closeDetailModal();">✕ Tolak</button>
            ` : ''}
            <button type="button" class="adm-btn adm-btn-delete" onclick="confirmAction('${news.id}', 'delete'); closeDetailModal();">🗑 Hapus</button>
        </div>
    `;
    document.getElementById('detailModal').classList.add('active');
}

function changeMainMedia(url, isVideo) {
    const container = document.querySelector('.adm-gallery-main');
    if (container) {
        container.innerHTML = renderMediaElement(url, true);
    }
}
window.changeMainMedia = changeMainMedia;

function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

let pendingAction = null;
function confirmAction(id, action) {
    pendingAction = { id, action };
    const title = document.getElementById('confirmTitle');
    const msg = document.getElementById('confirmMessage');
    const btn = document.getElementById('btnConfirmAction');
    if (action === 'approve') { title.textContent = 'Setujui Berita?'; msg.textContent = 'Berita akan dipublikasikan.'; btn.className = 'adm-btn-confirm'; btn.textContent = 'Ya, Setujui'; }
    else if (action === 'reject') { title.textContent = 'Tolak Berita?'; msg.textContent = 'Berita tidak akan dipublikasikan.'; btn.className = 'adm-btn-confirm danger'; btn.textContent = 'Ya, Tolak'; }
    else if (action === 'delete') { title.textContent = 'Hapus Berita?'; msg.textContent = 'Berita akan dihapus permanen.'; btn.className = 'adm-btn-confirm danger'; btn.textContent = 'Ya, Hapus'; }
    btn.onclick = executeAction;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() { document.getElementById('confirmModal').classList.remove('active'); pendingAction = null; }

async function executeAction() {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    try {
        if (action === 'delete') await window.firebaseNews.delete(id);
        else if (action === 'approve') await window.firebaseNews.updateStatus(id, 'approved');
        else if (action === 'reject') await window.firebaseNews.updateStatus(id, 'rejected');
    } catch (err) { alert('Gagal: ' + err.message); }
    closeConfirmModal();
}

function statusLabel(status) { return { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }[status] || status; }
function formatDate(str) { if (!str) return '-'; return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
function formatDateTime(str) { if (!str) return '-'; const d = new Date(str); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function capitalize(str) { if (!str) return ''; return str.charAt(0).toUpperCase() + str.slice(1); }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

document.addEventListener('click', (e) => { if (e.target.classList.contains('adm-modal-overlay')) e.target.classList.remove('active'); });

window.viewDetail = viewDetail;
window.closeDetailModal = closeDetailModal;
window.confirmAction = confirmAction;
window.closeConfirmModal = closeConfirmModal;

// ==================== NEWS EDIT FUNCTIONS ====================
function editNews(id) {
    console.log('editNews called with id:', id);

    const news = allNewsData.find(n => n.id === id);
    if (!news) {
        console.error('News not found for id:', id);
        alert('Berita tidak ditemukan!');
        return;
    }

    console.log('Found news:', news);

    const editModal = document.getElementById('editNewsModal');
    if (!editModal) {
        console.error('Edit modal not found');
        alert('Modal editor tidak ditemukan!');
        return;
    }

    // Fill form fields
    document.getElementById('editNewsId').value = id;
    document.getElementById('editNewsTitle').value = news.judul || '';
    document.getElementById('editNewsCategory').value = news.kategori || 'lainnya';
    document.getElementById('editNewsLocation').value = news.lokasi || '';
    document.getElementById('editNewsContent').value = news.deskripsi || '';
    
    // Tanggal dan waktu kejadian
    if (news.tanggal) {
        document.getElementById('editNewsTanggal').value = news.tanggal;
    } else {
        document.getElementById('editNewsTanggal').value = '';
    }
    document.getElementById('editNewsWaktu').value = news.waktu || '';
    
    // Informasi pengirim
    document.getElementById('editNewsPenerbit').value = news.penerbit || '';
    document.getElementById('editNewsContactType').value = news.kontakType || 'whatsapp';
    document.getElementById('editNewsContact').value = news.kontakValue || '';

    editModal.classList.add('active');
    console.log('Edit modal opened');
}

function closeEditNewsModal() {
    document.getElementById('editNewsModal').classList.remove('active');
}

async function saveNewsEdit(e) {
    e.preventDefault();

    const id = document.getElementById('editNewsId').value;
    const judul = document.getElementById('editNewsTitle').value.trim();
    const kategori = document.getElementById('editNewsCategory').value;
    const lokasi = document.getElementById('editNewsLocation').value.trim();
    const deskripsi = document.getElementById('editNewsContent').value.trim();
    const tanggal = document.getElementById('editNewsTanggal').value;
    const waktu = document.getElementById('editNewsWaktu').value;

    if (!judul || !deskripsi) {
        alert('Judul dan isi berita harus diisi!');
        return;
    }

    try {
        await window.firebaseNews.update(id, {
            judul,
            kategori,
            lokasi,
            deskripsi,
            tanggal,
            waktu,
            editedAt: new Date().toISOString(),
            editedBy: 'Admin'
        });

        closeEditNewsModal();
        alert('Berita berhasil diperbarui!');
    } catch (err) {
        alert('Gagal menyimpan: ' + err.message);
    }
}

// Initialize edit form handler
document.addEventListener('DOMContentLoaded', function () {
    const editNewsForm = document.getElementById('editNewsForm');
    if (editNewsForm) {
        editNewsForm.addEventListener('submit', saveNewsEdit);
    }
});

window.editNews = editNews;
window.closeEditNewsModal = closeEditNewsModal;


// ==================== EVENT MANAGEMENT ====================
function loadEvents() {
    const container = document.getElementById('adminEventsList');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Memuat data event...</p>';
    eventAdminDb.ref('eventSubmissions').on('value', (snapshot) => {
        const data = snapshot.val();
        allEventsData = data ? Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
        updateEventStats();
        renderEvents(allEventsData, 'pending');
    });
}

function renderEvents(data, filter = 'pending') {
    const container = document.getElementById('adminEventsList');
    if (!container) return;
    let filtered = filter === 'all' ? data : data.filter(e => e.status === filter);
    if (filtered.length === 0) { container.innerHTML = '<div class="adm-empty-state"><p>Tidak ada event</p></div>'; return; }
    container.innerHTML = filtered.map(event => `
        <div class="adm-news-item" data-id="${event.id}">
            <div class="adm-news-thumb"><img src="${event.image || 'https://placehold.co/100x80/eee/999?text=No+Image'}" alt="" onerror="this.src='https://placehold.co/100x80/eee/999?text=Error'"></div>
            <div class="adm-news-info">
                <span class="adm-news-status ${event.status}">${statusLabel(event.status)}</span>
                <h3 class="adm-news-title">${escapeHtml(event.name || '')}</h3>
                <div class="adm-news-meta"><span>📅 ${formatDate(event.date)}</span><span>📍 ${escapeHtml(event.location || '')}</span></div>
            </div>
            <div class="adm-news-actions">
                <button type="button" class="adm-btn adm-btn-view" onclick="viewEventDetail('${event.id}')">Lihat</button>
                ${event.status === 'pending' ? `
                    <button type="button" class="adm-btn adm-btn-approve" onclick="confirmEventAction('${event.id}', 'approve')">✓ Setujui</button>
                    <button type="button" class="adm-btn adm-btn-reject" onclick="confirmEventAction('${event.id}', 'reject')">✕ Tolak</button>
                ` : ''}
                <button type="button" class="adm-btn adm-btn-delete" onclick="confirmEventAction('${event.id}', 'delete')">🗑 Hapus</button>
            </div>
        </div>
    `).join('');
}

function filterEvents(filter) {
    document.querySelectorAll('#eventsSection .adm-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) btn.classList.add('active');
    });
    renderEvents(allEventsData, filter);
}

function updateEventStats() {
    const pending = document.getElementById('eventPendingCount');
    const approved = document.getElementById('eventApprovedCount');
    const rejected = document.getElementById('eventRejectedCount');
    if (pending) pending.textContent = allEventsData.filter(e => e.status === 'pending').length;
    if (approved) approved.textContent = allEventsData.filter(e => e.status === 'approved').length;
    if (rejected) rejected.textContent = allEventsData.filter(e => e.status === 'rejected').length;
}

function viewEventDetail(id) {
    const event = allEventsData.find(e => e.id === id);
    if (!event) return;
    document.getElementById('modalBody').innerHTML = `
        <div class="adm-detail-header"><span class="adm-news-status ${event.status}">${statusLabel(event.status)}</span><h2 class="adm-detail-title">${escapeHtml(event.name)}</h2></div>
        ${event.image ? `<div class="adm-detail-gallery"><div class="adm-gallery-main"><img src="${event.image}" alt=""></div></div>` : ''}
        <div class="adm-detail-info">
            <div class="adm-detail-row"><span class="adm-detail-label">Tanggal</span><span class="adm-detail-value">${formatDate(event.date)}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Lokasi</span><span class="adm-detail-value">${escapeHtml(event.location || '-')}</span></div>
            <div class="adm-detail-row"><span class="adm-detail-label">Harga</span><span class="adm-detail-value">${escapeHtml(event.price || 'Gratis')}</span></div>
        </div>
        <div class="adm-detail-content"><h4>Deskripsi:</h4><p>${escapeHtml(event.description || '').replace(/\n/g, '<br>')}</p></div>
        <div class="adm-detail-actions">
            ${event.status === 'pending' ? `
                <button type="button" class="adm-btn adm-btn-approve" onclick="confirmEventAction('${event.id}', 'approve'); closeDetailModal();">✓ Setujui</button>
                <button type="button" class="adm-btn adm-btn-reject" onclick="confirmEventAction('${event.id}', 'reject'); closeDetailModal();">✕ Tolak</button>
            ` : ''}
            <button type="button" class="adm-btn adm-btn-delete" onclick="confirmEventAction('${event.id}', 'delete'); closeDetailModal();">🗑 Hapus</button>
        </div>
    `;
    document.getElementById('detailModal').classList.add('active');
}

let pendingEventAction = null;
function confirmEventAction(id, action) {
    pendingEventAction = { id, action };
    const title = document.getElementById('confirmTitle');
    const msg = document.getElementById('confirmMessage');
    const btn = document.getElementById('btnConfirmAction');
    if (action === 'approve') { title.textContent = 'Setujui Event?'; msg.textContent = 'Event akan dipublikasikan.'; btn.className = 'adm-btn-confirm'; btn.textContent = 'Ya, Setujui'; }
    else if (action === 'reject') { title.textContent = 'Tolak Event?'; msg.textContent = 'Event tidak akan dipublikasikan.'; btn.className = 'adm-btn-confirm danger'; btn.textContent = 'Ya, Tolak'; }
    else if (action === 'delete') { title.textContent = 'Hapus Event?'; msg.textContent = 'Event akan dihapus permanen.'; btn.className = 'adm-btn-confirm danger'; btn.textContent = 'Ya, Hapus'; }
    btn.onclick = executeEventAction;
    document.getElementById('confirmModal').classList.add('active');
}

async function executeEventAction() {
    if (!pendingEventAction) return;
    const { id, action } = pendingEventAction;
    try {
        if (action === 'delete') await eventAdminDb.ref('eventSubmissions/' + id).remove();
        else if (action === 'approve') await eventAdminDb.ref('eventSubmissions/' + id + '/status').set('approved');
        else if (action === 'reject') await eventAdminDb.ref('eventSubmissions/' + id + '/status').set('rejected');
    } catch (err) { alert('Gagal: ' + err.message); }
    closeConfirmModal();
    pendingEventAction = null;
}

window.viewEventDetail = viewEventDetail;
window.confirmEventAction = confirmEventAction;
window.filterEvents = filterEvents;


// ==================== QUIZ MANAGEMENT ====================
let allQuizQuestions = [];
let editingQuestionId = null;

function loadQuiz() {
    loadQuizQuestions();
    loadQuizStats();
    loadQuizLeaderboard();
}

function loadQuizQuestions() {
    const container = document.getElementById('quizQuestionsList');
    if (!container) return;
    container.innerHTML = '<p class="adm-loading">Memuat soal...</p>';

    eventAdminDb.ref('quizQuestions').on('value', (snapshot) => {
        const data = snapshot.val();
        allQuizQuestions = data ? Object.entries(data).map(([id, q]) => ({ id, ...q })) : [];
        renderQuizQuestions();
        updateQuizStats();
    });
}

function renderQuizQuestions() {
    const container = document.getElementById('quizQuestionsList');
    if (!container) return;

    if (allQuizQuestions.length === 0) {
        container.innerHTML = '<div class="adm-empty-state"><p>Belum ada soal quiz. Klik "Tambah Soal" untuk menambahkan.</p></div>';
        return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    container.innerHTML = allQuizQuestions.map((q, idx) => `
        <div class="adm-quiz-item" data-id="${q.id}">
            <div class="adm-quiz-num">${idx + 1}</div>
            <div class="adm-quiz-info">
                <div class="adm-quiz-question">${escapeHtml(q.question)}</div>
                <div class="adm-quiz-options">
                    ${q.options.map((opt, i) => `
                        <span class="${i === q.answer ? 'correct' : ''}">${letters[i]}. ${escapeHtml(opt)}</span>
                    `).join('')}
                </div>
            </div>
            <div class="adm-quiz-actions">
                <button type="button" onclick="editQuestion('${q.id}')">✏️ Edit</button>
                <button type="button" class="btn-delete" onclick="deleteQuestion('${q.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

function loadQuizStats() {
    const today = new Date().toISOString().split('T')[0];

    // Count today's plays
    eventAdminDb.ref('quizResults').orderByChild('date').equalTo(today).once('value', (snapshot) => {
        const data = snapshot.val();
        const todayPlays = data ? Object.keys(data).length : 0;
        const el = document.getElementById('quizTodayPlays');
        if (el) el.textContent = todayPlays;
    });

    // Count total players from leaderboard
    eventAdminDb.ref('quizLeaderboard').once('value', (snapshot) => {
        const data = snapshot.val();
        const totalPlayers = data ? Object.keys(data).length : 0;
        const el = document.getElementById('quizTotalPlayers');
        if (el) el.textContent = totalPlayers;
    });
}

function updateQuizStats() {
    const el = document.getElementById('quizTotalQuestions');
    if (el) el.textContent = allQuizQuestions.length;
}

function loadQuizLeaderboard() {
    const container = document.getElementById('quizLeaderboardList');
    if (!container) return;
    container.innerHTML = '<p class="adm-loading">Memuat data...</p>';

    eventAdminDb.ref('quizLeaderboard').orderByChild('totalScore').limitToLast(10).once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<div class="adm-empty-state"><p>Belum ada pemain</p></div>';
            return;
        }

        const players = Object.values(data).sort((a, b) => b.totalScore - a.totalScore);
        renderQuizLeaderboard(players);
    });
}

function renderQuizLeaderboard(players) {
    const container = document.getElementById('quizLeaderboardList');
    if (!container) return;

    container.innerHTML = players.map((player, idx) => {
        const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
        return `
            <div class="adm-lb-item">
                <div class="adm-lb-rank ${rankClass}">${idx + 1}</div>
                <img src="${player.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(player.name)}" alt="" class="adm-lb-avatar">
                <div class="adm-lb-info">
                    <div class="adm-lb-name">${escapeHtml(player.name)}</div>
                    <div class="adm-lb-email">${escapeHtml(player.email)}</div>
                    ${player.whatsapp ? `<div class="adm-lb-wa"><a href="https://wa.me/${player.whatsapp.replace('+', '')}" target="_blank">📱 ${escapeHtml(player.whatsapp)}</a></div>` : '<div class="adm-lb-wa" style="color:#999;">📱 Belum ada WA</div>'}
                </div>
                <div style="text-align:right;display:flex;align-items:center;gap:15px;">
                    <div>
                        <div class="adm-lb-score">${player.totalScore}</div>
                        <div class="adm-lb-count">${player.quizCount}x main</div>
                    </div>
                    <button type="button" class="adm-btn-delete-player" onclick="deleteQuizPlayer('${player.oderId}')" title="Hapus pemain">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteQuizPlayer(oderId) {
    if (!confirm('Hapus pemain ini dari leaderboard? Data hasil quiz juga akan dihapus.')) return;

    // Hapus dari leaderboard
    eventAdminDb.ref('quizLeaderboard/' + oderId).remove()
        .then(() => {
            // Hapus semua hasil quiz pemain ini
            eventAdminDb.ref('quizResults').orderByChild('oderId').equalTo(oderId).once('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const updates = {};
                    Object.keys(data).forEach(key => {
                        updates[key] = null;
                    });
                    eventAdminDb.ref('quizResults').update(updates);
                }
            });
            loadQuizLeaderboard();
            loadQuizStats();
        })
        .catch(err => alert('Gagal menghapus: ' + err.message));
}
window.deleteQuizPlayer = deleteQuizPlayer;

function showQuizTab(tab) {
    document.querySelectorAll('.adm-quiz-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.adm-quiz-tab[onclick="showQuizTab('${tab}')"]`).classList.add('active');

    document.getElementById('quizQuestionsTab').style.display = tab === 'questions' ? 'block' : 'none';
    document.getElementById('quizStatsTab').style.display = tab === 'stats' ? 'block' : 'none';
    const hadiahTab = document.getElementById('quizHadiahTab');
    if (hadiahTab) hadiahTab.style.display = tab === 'hadiah' ? 'block' : 'none';

    if (tab === 'stats') {
        loadQuizLeaderboard();
    }
}

function showAddQuestionModal() {
    editingQuestionId = null;
    document.getElementById('questionModalTitle').textContent = 'Tambah Soal Quiz';
    document.getElementById('questionForm').reset();
    document.getElementById('questionModal').classList.add('active');
}

function editQuestion(id) {
    const question = allQuizQuestions.find(q => q.id === id);
    if (!question) return;

    editingQuestionId = id;
    document.getElementById('questionModalTitle').textContent = 'Edit Soal Quiz';
    document.getElementById('questionText').value = question.question;
    document.getElementById('optionA').value = question.options[0] || '';
    document.getElementById('optionB').value = question.options[1] || '';
    document.getElementById('optionC').value = question.options[2] || '';
    document.getElementById('optionD').value = question.options[3] || '';
    document.getElementById('correctAnswer').value = question.answer;
    document.getElementById('questionModal').classList.add('active');
}

function deleteQuestion(id) {
    if (!confirm('Hapus soal ini?')) return;

    eventAdminDb.ref('quizQuestions/' + id).remove()
        .then(() => {
            // Will auto-refresh via listener
        })
        .catch(err => alert('Gagal menghapus: ' + err.message));
}

function closeQuestionModal() {
    document.getElementById('questionModal').classList.remove('active');
    editingQuestionId = null;
}

// Question form submit handler
document.addEventListener('DOMContentLoaded', function () {
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const questionData = {
                question: document.getElementById('questionText').value.trim(),
                options: [
                    document.getElementById('optionA').value.trim(),
                    document.getElementById('optionB').value.trim(),
                    document.getElementById('optionC').value.trim(),
                    document.getElementById('optionD').value.trim()
                ],
                answer: parseInt(document.getElementById('correctAnswer').value),
                updatedAt: new Date().toISOString()
            };

            try {
                if (editingQuestionId) {
                    await eventAdminDb.ref('quizQuestions/' + editingQuestionId).update(questionData);
                } else {
                    questionData.createdAt = new Date().toISOString();
                    await eventAdminDb.ref('quizQuestions').push(questionData);
                }
                closeQuestionModal();
            } catch (err) {
                alert('Gagal menyimpan: ' + err.message);
            }
        });
    }
});

window.loadQuiz = loadQuiz;
window.showQuizTab = showQuizTab;
window.showAddQuestionModal = showAddQuestionModal;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.closeQuestionModal = closeQuestionModal;
