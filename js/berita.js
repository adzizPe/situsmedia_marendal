// ===== Berita Page - List & Detail Mode =====

const firebaseBeritaConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    authDomain: "login-fe9bf.firebaseapp.com",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf"
};

let beritaDatabase;

function initFirebaseBerita() {
    return new Promise((resolve, reject) => {
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined') {
                clearInterval(checkFirebase);
                try {
                    let app;
                    try { app = firebase.app('beritaApp'); } 
                    catch (e) { app = firebase.initializeApp(firebaseBeritaConfig, 'beritaApp'); }
                    beritaDatabase = app.database();
                    resolve();
                } catch (err) { reject(err); }
            }
        }, 100);
        setTimeout(() => { clearInterval(checkFirebase); reject(new Error('Firebase not loaded')); }, 10000);
    });
}

// Check if URL has slug (detail mode)
function getSlugFromURL() {
    const search = window.location.search;
    if (!search || search === '?') return null;
    
    // Format: ?pahlawan-wakanda atau ?kategori=xxx
    const params = new URLSearchParams(search);
    
    // Jika ada kategori/q, ini mode list
    if (params.has('kategori') || params.has('q')) return null;
    
    // Ambil slug dari query string (tanpa key)
    const slug = search.substring(1); // hapus "?"
    if (slug && !slug.includes('=')) return slug;
    
    return null;
}

// ===== DETAIL MODE =====
function loadNewsDetail(slug) {
    const container = document.querySelector('.main-content .container');
    
    container.innerHTML = `
        <div class="article-layout">
            <article class="article-main" id="articleMain">
                <div class="article-loading"><p>Memuat berita...</p></div>
            </article>
            <aside class="sidebar">
                <div class="sidebar-widget">
                    <div class="section-header"><h3 class="section-title">Berita Terkait</h3></div>
                    <div class="related-list" id="relatedNews"><p style="color:#888;font-size:0.9rem;">Memuat...</p></div>
                </div>
            </aside>
        </div>
    `;
    
    // Check if it's the hardcoded news
    if (slug === 'banjir-pesantren-aceh-tamiang') {
        const hardcodedNews = {
            id: 'banjir-pesantren-aceh-tamiang',
            slug: 'banjir-pesantren-aceh-tamiang',
            judul: 'Banjir Seret Banyak Gelondongan Kayu, Pesantren Darul Mukhlisin di Karang Baru Aceh Tamiang Terdampak',
            kategori: 'bencana',
            lokasi: 'Karang Baru, Aceh Tamiang',
            tanggal: '2025-12-20',
            penerbit: 'Admin',
            gambar: ['../assets/2.png'],
            mediaTypes: ['image'],
            deskripsi: `Banjir menerjang kawasan Pesantren Darul Mukhlisin yang berada di Kecamatan Karang Baru, Kabupaten Aceh Tamiang pada Jumat (20/12/2025).

Banjir yang terjadi akibat hujan deras selama beberapa hari terakhir menyebabkan air sungai meluap dan membawa banyak gelondongan kayu ke area pesantren.

Menurut keterangan warga setempat, banjir mulai melanda kawasan tersebut sejak dini hari dan terus meninggi hingga pagi hari. Gelondongan kayu yang terbawa arus sungai menambah kerusakan yang terjadi.

Para santri dan pengurus pesantren telah dievakuasi ke tempat yang lebih aman. Saat ini, pihak BPBD setempat sedang melakukan pendataan kerusakan dan memberikan bantuan kepada korban terdampak.

Warga diimbau untuk tetap waspada mengingat cuaca masih belum stabil dan potensi banjir susulan masih ada.`,
            status: 'approved'
        };
        renderNewsDetail(hardcodedNews);
        loadRelatedNews(hardcodedNews.kategori, hardcodedNews.id);
        return;
    }
    
    // Find by slug from Firebase
    beritaDatabase.ref('newsSubmissions').orderByChild('slug').equalTo(slug).once('value', (snapshot) => {
        let news = null;
        snapshot.forEach((child) => { news = child.val(); });
        
        if (!news || news.status !== 'approved') {
            document.getElementById('articleMain').innerHTML = `
                <div class="article-not-found">
                    <h2>Berita Tidak Ditemukan</h2>
                    <p>Berita yang Anda cari tidak tersedia.</p>
                    <a href="./" class="btn-back">← Kembali ke Berita</a>
                </div>
            `;
            return;
        }
        
        renderNewsDetail(news);
        loadRelatedNews(news.kategori, news.id);
    });
}

function renderNewsDetail(news) {
    document.title = news.judul + ' - Marendal';
    
    const images = Array.isArray(news.gambar) ? news.gambar : [news.gambar];
    const mediaTypes = news.mediaTypes || images.map(() => 'image');
    const tanggal = new Date(news.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    
    document.getElementById('articleMain').innerHTML = `
        <div class="article-header">
            <span class="article-category">${capitalize(news.kategori)}</span>
            <h1 class="article-title">${escapeHtml(news.judul)}</h1>
            <div class="article-meta">
                <span>📍 ${escapeHtml(news.lokasi)}</span>
                <span>📅 ${tanggal}</span>
                <span>✍️ ${escapeHtml(news.penerbit)}</span>
            </div>
        </div>
        <div class="article-gallery">
            <div class="gallery-main">
                <span class="news-badge-user" style="position:absolute;top:15px;left:15px;z-index:5;">Kiriman Warga</span>
                ${mediaTypes[0] === 'video' ? 
                    `<video src="${images[0]}" autoplay muted loop playsinline style="width:100%;max-height:500px;"></video>` :
                    `<img src="${images[0]}" alt="${escapeHtml(news.judul)}">`}
            </div>
            ${images.length > 1 ? `<div class="gallery-thumbs">${images.map((m, i) => `
                <div class="gallery-thumb ${i===0?'active':''}" onclick="changeMedia(this,'${m}','${mediaTypes[i]}')">
                    ${mediaTypes[i]==='video'?`<video src="${m}" muted></video>`:`<img src="${m}">`}
                </div>`).join('')}</div>` : ''}
        </div>
        <div class="article-content">
            ${escapeHtml(news.deskripsi).split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
        </div>
        <div class="article-share">
            <span>Bagikan:</span>
            <div class="share-buttons">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" class="share-btn-circle facebook"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(location.href)}" target="_blank" class="share-btn-circle twitter"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="https://wa.me/?text=${encodeURIComponent(news.judul + ' ' + location.href)}" target="_blank" class="share-btn-circle whatsapp"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                <button type="button" class="share-btn-circle copy" onclick="copyLink()"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            </div>
        </div>
        <div class="comments-section">
            <h3>Komentar</h3>
            <div id="commentsList" class="comments-list"></div>
            <div id="commentForm" class="comment-form-container"></div>
        </div>
    `;
    
    loadComments(news.id);
}

function loadComments(newsId) {
    const list = document.getElementById('commentsList');
    const form = document.getElementById('commentForm');
    const user = JSON.parse(localStorage.getItem('googleUser') || 'null');
    
    if (user) {
        form.innerHTML = `<div class="comment-form"><img src="${user.picture}" class="comment-avatar"><div class="comment-input-wrap"><textarea id="commentInput" placeholder="Tulis komentar..." rows="2"></textarea><button type="button" onclick="submitComment('${newsId}')" class="btn-comment">Kirim</button></div></div>`;
    } else {
        form.innerHTML = `<div class="comment-login-prompt"><p>🔐 Silakan login untuk berkomentar</p><button type="button" class="btn-google-login" onclick="showLoginModal()"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>Login dengan Google</button></div>`;
    }
    
    beritaDatabase.ref('comments/' + newsId).on('value', (snapshot) => {
        const comments = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => { comments.push({ id: child.key, ...child.val() }); });
            comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        list.innerHTML = comments.length === 0 ? '<p class="no-comments">Belum ada komentar.</p>' :
            comments.map(c => `<div class="comment-item"><img src="${c.userPicture || 'https://ui-avatars.com/api/?name='+encodeURIComponent(c.userName)}" class="comment-avatar"><div class="comment-body"><div class="comment-header"><strong>${escapeHtml(c.userName)}</strong><span>${timeAgo(c.createdAt)}</span></div><p>${escapeHtml(c.text)}</p></div></div>`).join('');
    });
}

window.submitComment = function(newsId) {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return alert('Tulis komentar dulu');
    
    const user = JSON.parse(localStorage.getItem('googleUser'));
    if (!user) return alert('Login dulu');
    
    beritaDatabase.ref('comments/' + newsId).push({
        text, userName: user.name, userEmail: user.email, userPicture: user.picture, userId: user.id, createdAt: new Date().toISOString()
    }).then(() => input.value = '');
};

function loadRelatedNews(kategori, currentId) {
    beritaDatabase.ref('newsSubmissions').once('value', (snapshot) => {
        const related = [];
        snapshot.forEach((child) => {
            const n = child.val();
            if (n.status === 'approved' && n.kategori === kategori && n.id !== currentId) related.push(n);
        });
        
        if (related.length === 0) return;
        document.getElementById('relatedNews').innerHTML = related.slice(0, 3).map(n => {
            const img = Array.isArray(n.gambar) ? n.gambar[0] : n.gambar;
            return `<div class="related-item"><img src="${img}" onerror="this.src='https://placehold.co/80x60/eee/999?text=Img'"><div class="related-content"><h4><a href="./?${n.slug || n.id}">${escapeHtml(n.judul)}</a></h4><span>${formatDate(n.tanggal)}</span></div></div>`;
        }).join('');
    });
}

window.changeMedia = function(thumb, src, type) {
    const main = document.querySelector('.gallery-main');
    const badge = main.querySelector('.news-badge-user');
    main.innerHTML = type === 'video' ? `<video src="${src}" autoplay muted loop playsinline style="width:100%;max-height:500px;"></video>` : `<img src="${src}">`;
    if (badge) main.insertBefore(badge, main.firstChild);
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
};

window.copyLink = function() { navigator.clipboard.writeText(location.href); alert('Link disalin!'); };

// ===== LIST MODE =====
function getApprovedNews(callback) {
    beritaDatabase.ref('newsSubmissions').on('value', (snapshot) => {
        const news = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const item = child.val();
                if (item.status === 'approved') news.push(item);
            });
            news.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        }
        callback(news);
    });
}

function renderNewsGrid(publishedNews = []) {
    const container = document.getElementById('newsGrid');
    if (!container) return;
    
    // Berita contoh (hardcoded)
    let html = `
        <article class="news-card-full" data-kategori="bencana" data-title="banjir seret banyak gelondongan kayu pesantren darul mukhlisin karang baru aceh tamiang terdampak">
            <a href="./Banjir%20Seret%20Banyak%20Gelondongan%20Kayu,%20Pesantren%20Darul%20Mukhlisin%20di%20Karang%20Baru%20Aceh%20Tamiang%20Terdampak/" class="news-card-image">
                <span class="region-badge">ACEH</span>
                <img src="../assets/2.png" alt="Banjir Pesantren Aceh Tamiang">
            </a>
            <div class="news-card-content">
                <span class="news-card-category">Bencana</span>
                <h3 class="news-card-title"><a href="./Banjir%20Seret%20Banyak%20Gelondongan%20Kayu,%20Pesantren%20Darul%20Mukhlisin%20di%20Karang%20Baru%20Aceh%20Tamiang%20Terdampak/">Banjir Seret Banyak Gelondongan Kayu, Pesantren Darul Mukhlisin di Karang Baru Aceh Tamiang Terdampak</a></h3>
                <p class="news-card-excerpt">Banjir menerjang kawasan Pesantren Darul Mukhlisin yang berada di Kecamatan Karang Baru, Kabupaten Aceh Tamiang...</p>
                <span class="news-card-meta">📅 20 Des 2025 • 📍 Karang Baru, Aceh Tamiang</span>
            </div>
        </article>
    `;
    
    publishedNews.forEach(news => {
        const images = Array.isArray(news.gambar) ? news.gambar : [news.gambar];
        const mediaTypes = news.mediaTypes || images.map(() => 'image');
        const isVideo = mediaTypes[0] === 'video';
        const slug = news.slug || news.id;
        
        html += `
            <article class="news-card-full" data-kategori="${news.kategori}" data-title="${escapeHtml((news.judul + ' ' + news.lokasi).toLowerCase())}">
                <a href="./?${slug}" class="news-card-image">
                    <span class="news-badge-user">Kiriman Warga</span>
                    ${isVideo ? `<video src="${images[0]}" autoplay muted loop playsinline></video>` : `<img src="${images[0]}" alt="${escapeHtml(news.judul)}" onerror="this.src='https://placehold.co/400x200/eee/999?text=Gambar'">`}
                </a>
                <div class="news-card-content">
                    <span class="news-card-category">${capitalize(news.kategori)}</span>
                    <h3 class="news-card-title"><a href="./?${slug}">${escapeHtml(news.judul)}</a></h3>
                    <p class="news-card-excerpt">${escapeHtml((news.deskripsi || '').substring(0, 150))}...</p>
                    <span class="news-card-meta">📅 ${formatDate(news.tanggal)} • 📍 ${escapeHtml(news.lokasi)}</span>
                </div>
            </article>
        `;
    });
    
    container.innerHTML = html;
    filterNews();
}

let currentKategori = 'semua';
let searchQuery = '';

function filterNews() {
    const cards = document.querySelectorAll('.news-card-full');
    let count = 0;
    
    cards.forEach(card => {
        const kat = card.dataset.kategori;
        const title = card.dataset.title || '';
        const matchKat = currentKategori === 'semua' || kat === currentKategori;
        const matchSearch = !searchQuery || title.includes(searchQuery.toLowerCase());
        
        if (matchKat && matchSearch) { card.style.display = 'flex'; count++; }
        else { card.style.display = 'none'; }
    });
    
    updateNoResults(count);
}

function updateNoResults(count) {
    let el = document.getElementById('noResults');
    if (count === 0) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'noResults';
            el.className = 'no-results';
            el.innerHTML = `<p>😕 Tidak ada berita ditemukan</p><button type="button" onclick="resetSearch()">Reset</button>`;
            document.getElementById('newsGrid').appendChild(el);
        }
        el.style.display = 'block';
    } else if (el) { el.style.display = 'none'; }
}

window.resetSearch = function() {
    searchQuery = '';
    currentKategori = 'semua';
    const input = document.getElementById('searchBerita');
    if (input) input.value = '';
    document.querySelectorAll('.category-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.kategori === 'semua');
    });
    filterNews();
};

// ===== HELPERS =====
function formatDate(str) { return str ? new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
function escapeHtml(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function timeAgo(str) {
    const diff = Math.floor((new Date() - new Date(str)) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    return Math.floor(diff / 86400) + ' hari lalu';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('newsGrid');
    if (container) container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Memuat...</p>';
    
    initFirebaseBerita().then(() => {
        const slug = getSlugFromURL();
        
        if (slug) {
            // Detail mode
            loadNewsDetail(slug);
        } else {
            // List mode
            getApprovedNews(renderNewsGrid);
            
            // Check for search query from URL
            const params = new URLSearchParams(window.location.search);
            const urlQuery = params.get('q');
            if (urlQuery) {
                searchQuery = urlQuery;
                const searchInput = document.getElementById('searchBerita');
                if (searchInput) searchInput.value = urlQuery;
            }
            
            // Check for kategori from URL
            const urlKategori = params.get('kategori');
            if (urlKategori) {
                currentKategori = urlKategori;
                document.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.kategori === urlKategori);
                });
            }
            
            // Category tabs
            document.querySelectorAll('.category-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentKategori = tab.dataset.kategori;
                    filterNews();
                });
            });
            
            // Search
            const searchInput = document.getElementById('searchBerita');
            const searchBtn = document.getElementById('btnSearchBerita');
            if (searchInput) {
                searchBtn?.addEventListener('click', () => { searchQuery = searchInput.value.trim(); filterNews(); });
                searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { searchQuery = searchInput.value.trim(); filterNews(); } });
            }
        }
    }).catch(err => {
        console.error(err);
        if (document.getElementById('newsGrid')) renderNewsGrid([]);
    });
});
