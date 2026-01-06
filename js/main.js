// ===== Date & Time Display =====
function updateDateTime() {
    const now = new Date();

    // Format date
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateStr = now.toLocaleDateString('id-ID', dateOptions);

    // Format time (HH:MM:SS)
    const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }) + ' WIB';

    // Update date element
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = dateStr;
    }

    // Update time element
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeStr;
    }

    // Atau jika dalam satu element (date-time)
    const dateTimeElement = document.querySelector('.date-time');
    if (dateTimeElement && !timeElement) {
        dateTimeElement.innerHTML = `<span id="current-date">${dateStr}</span> <span id="current-time" class="live-time">${timeStr}</span>`;
    }

    // weatherDateMobile sekarang diupdate oleh weather.js dengan data cuaca
}

// Alias untuk backward compatibility
function updateDate() {
    updateDateTime();
}

// Start real-time clock
function initRealTimeClock() {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second
}

// ===== Mobile Nav Scroll =====
function initNavScroll() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    navMenu.addEventListener('mousedown', (e) => {
        isDown = true;
        navMenu.style.cursor = 'grabbing';
        startX = e.pageX - navMenu.offsetLeft;
        scrollLeft = navMenu.scrollLeft;
    });

    navMenu.addEventListener('mouseleave', () => {
        isDown = false;
        navMenu.style.cursor = 'grab';
    });

    navMenu.addEventListener('mouseup', () => {
        isDown = false;
        navMenu.style.cursor = 'grab';
    });

    navMenu.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - navMenu.offsetLeft;
        const walk = (x - startX) * 2;
        navMenu.scrollLeft = scrollLeft - walk;
    });

    // Touch events for mobile
    navMenu.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - navMenu.offsetLeft;
        scrollLeft = navMenu.scrollLeft;
    }, { passive: true });

    navMenu.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - navMenu.offsetLeft;
        const walk = (x - startX) * 2;
        navMenu.scrollLeft = scrollLeft - walk;
    }, { passive: true });
}

// ===== Submenu Toggle =====
function initSubmenu() {
    const hasSubmenu = document.querySelectorAll('.has-submenu');

    // Pastikan submenu tertutup saat halaman load
    hasSubmenu.forEach(item => {
        item.classList.remove('active');
    });

    hasSubmenu.forEach(item => {
        const link = item.querySelector(':scope > a');
        const submenu = item.querySelector('.submenu');
        const submenuLinks = submenu ? submenu.querySelectorAll('a') : [];

        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Tutup user dropdown jika ada
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');

            const isOpen = item.classList.contains('active');

            // Close all submenus first
            hasSubmenu.forEach(other => {
                other.classList.remove('active');
            });

            // Open this one if it was closed
            if (!isOpen) {
                item.classList.add('active');

                // Position submenu on mobile
                if (window.innerWidth <= 768 && submenu) {
                    const rect = link.getBoundingClientRect();
                    submenu.style.top = (rect.bottom + 5) + 'px';
                }
            }
        });

        // Tutup submenu saat link di dalam submenu diklik
        submenuLinks.forEach(subLink => {
            subLink.addEventListener('click', () => {
                item.classList.remove('active');
            });
        });
    });

    // Close submenu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.has-submenu')) {
            hasSubmenu.forEach(item => item.classList.remove('active'));
        }
    });
}

// ===== Ticker Animation Reset =====
function initTicker() {
    const ticker = document.querySelector('.ticker-content');
    if (!ticker) return;

    // Clone ticker items for seamless loop
    const items = ticker.innerHTML;
    ticker.innerHTML = items + items;
}

// ===== Search Box - Global Search with Firebase =====
let searchNewsData = [];
let searchTimeout = null;

function initSearch() {
    const searchBoxes = document.querySelectorAll('.search-box');

    searchBoxes.forEach(searchBox => {
        const input = searchBox.querySelector('input');
        const button = searchBox.querySelector('button');

        if (!input) return;

        // Create dropdown for results
        let dropdown = searchBox.querySelector('.search-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'search-dropdown';
            searchBox.appendChild(dropdown);
        }

        // Load news data for search
        loadSearchData();

        // Input event - live search
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = input.value.trim().toLowerCase();

            if (query.length < 2) {
                dropdown.innerHTML = '';
                dropdown.classList.remove('active');
                return;
            }

            searchTimeout = setTimeout(() => {
                const results = searchNewsData.filter(news =>
                    news.judul.toLowerCase().includes(query) ||
                    news.lokasi.toLowerCase().includes(query) ||
                    (news.deskripsi && news.deskripsi.toLowerCase().includes(query))
                ).slice(0, 5);

                if (results.length > 0) {
                    dropdown.innerHTML = results.map(news => {
                        // Untuk berita hardcoded, gunakan folder path
                        const newsUrl = news.id === 'banjir-pesantren-aceh-tamiang' 
                            ? `${getBeritaUrl()}Banjir%20Seret%20Banyak%20Gelondongan%20Kayu,%20Pesantren%20Darul%20Mukhlisin%20di%20Karang%20Baru%20Aceh%20Tamiang%20Terdampak/`
                            : `${getBeritaUrl()}detail/?id=${news.slug || news.id}`;
                        return `
                        <a href="${newsUrl}" class="search-result-item">
                            <span class="search-result-title">${highlightMatch(news.judul, query)}</span>
                            <span class="search-result-meta">${news.lokasi} • ${news.kategori}</span>
                        </a>
                    `}).join('') + `
                        <a href="${getBeritaUrl()}?q=${encodeURIComponent(input.value.trim())}" class="search-result-all">
                            Lihat semua hasil untuk "${input.value.trim()}"
                        </a>
                    `;
                    dropdown.classList.add('active');
                } else {
                    dropdown.innerHTML = '<div class="search-no-result">Tidak ada hasil</div>';
                    dropdown.classList.add('active');
                }
            }, 300);
        });

        // Button click - go to search page
        button.addEventListener('click', () => {
            const query = input.value.trim();
            if (query) {
                window.location.href = `${getBeritaUrl()}?q=${encodeURIComponent(query)}`;
            }
        });

        // Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (query) {
                    window.location.href = `${getBeritaUrl()}?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchBox.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        // Touch support for mobile
        input.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        dropdown.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });

        // Focus - show dropdown if has results
        input.addEventListener('focus', () => {
            if (dropdown.innerHTML && input.value.length >= 2) {
                dropdown.classList.add('active');
            }
        });
    });
}

function getBeritaUrl() {
    const path = window.location.pathname;
    const depth = path.split('/').filter(p => p && !p.includes('.')).length;
    
    // Jika sudah di halaman berita
    if (path.includes('/berita/')) {
        if (path.endsWith('/berita/') || path.endsWith('/berita')) return './';
        // Subfolder dalam berita (detail, atau artikel)
        return '../'.repeat(depth - 1) + 'berita/';
    }
    
    // Dari halaman lain
    if (depth === 0) return './berita/';
    return '../'.repeat(depth) + 'berita/';
}

function loadSearchData() {
    // Berita contoh (hardcoded) - selalu ada
    const hardcodedNews = [{
        id: 'banjir-pesantren-aceh-tamiang',
        slug: 'banjir-pesantren-aceh-tamiang',
        judul: 'Banjir Seret Banyak Gelondongan Kayu, Pesantren Darul Mukhlisin di Karang Baru Aceh Tamiang Terdampak',
        lokasi: 'Karang Baru, Aceh Tamiang',
        kategori: 'Bencana',
        deskripsi: 'Banjir menerjang kawasan Pesantren Darul Mukhlisin yang berada di Kecamatan Karang Baru, Kabupaten Aceh Tamiang'
    }];
    
    searchNewsData = [...hardcodedNews];

    // Check if Firebase is available
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined') {
            clearInterval(checkFirebase);

            try {
                let app;
                try { app = firebase.app('searchApp'); }
                catch (e) {
                    app = firebase.initializeApp({
                        apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
                        databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
                        projectId: "login-fe9bf"
                    }, 'searchApp');
                }

                const db = app.database();
                
                // Listen for real-time updates from Firebase
                db.ref('newsSubmissions').on('value', (snapshot) => {
                    // Reset dengan hardcoded news
                    searchNewsData = [...hardcodedNews];
                    
                    if (snapshot.exists()) {
                        snapshot.forEach((child) => {
                            const news = child.val();
                            // Ambil berita yang sudah disetujui dan punya judul
                            if (news && news.status === 'approved' && news.judul) {
                                searchNewsData.push({
                                    id: news.id || child.key,
                                    slug: news.slug || news.id || child.key,
                                    judul: news.judul,
                                    lokasi: news.lokasi || '',
                                    kategori: news.kategori || 'Lainnya',
                                    deskripsi: news.deskripsi || ''
                                });
                            }
                        });
                    }
                    console.log('📰 Search data loaded:', searchNewsData.length, 'berita', searchNewsData.map(n => n.judul.substring(0, 30)));
                }, (error) => {
                    console.error('Firebase search listener error:', error);
                });
            } catch (err) {
                console.error('Search Firebase init error:', err);
            }
        }
    }, 200);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkFirebase), 10000);
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ===== Smooth Scroll =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== Dark Mode Toggle =====
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');

    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Apply rain effect if dark mode
    if (savedTheme === 'dark') {
        createRainEffect();
    }

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Toggle rain effect
        if (newTheme === 'dark') {
            createRainEffect();
        } else {
            removeRainEffect();
        }
    });
}

// ===== Rain Effect for Dark Mode =====
function createRainEffect() {
    // Remove existing rain container if any
    removeRainEffect();

    // Create rain container
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-container';
    rainContainer.id = 'rainEffect';

    // Create rain drops
    const dropCount = 100;
    for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';

        // Random position and animation
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.opacity = Math.random() * 0.3 + 0.1;

        rainContainer.appendChild(drop);
    }

    document.body.appendChild(rainContainer);
}

function removeRainEffect() {
    const existing = document.getElementById('rainEffect');
    if (existing) {
        existing.remove();
    }
}

// Apply theme immediately to prevent flash
(function () {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// ===== Sorotan Slider =====
function initSorotanSlider() {
    const track = document.getElementById('sorotanTrack');
    const prevBtn = document.getElementById('sorotanPrev');
    const nextBtn = document.getElementById('sorotanNext');

    if (!track) return;

    const scrollAmount = 200;
    const autoScrollDelay = 4000; // 4 detik delay antar scroll
    const scrollDuration = 800; // durasi animasi scroll (ms)

    // Custom smooth scroll dengan easing
    function smoothScrollTo(element, targetScroll, duration) {
        const startScroll = element.scrollLeft;
        const distance = targetScroll - startScroll;
        const startTime = performance.now();

        function easeInOutCubic(t) {
            return t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            element.scrollLeft = startScroll + (distance * easedProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const targetScroll = Math.max(0, track.scrollLeft - scrollAmount);
            smoothScrollTo(track, targetScroll, scrollDuration);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            const targetScroll = Math.min(maxScroll, track.scrollLeft + scrollAmount);
            smoothScrollTo(track, targetScroll, scrollDuration);
        });
    }

    // Auto scroll dengan delay dan smooth animation
    let autoScroll = setInterval(() => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        
        if (track.scrollLeft >= maxScroll - 10) {
            // Smooth reset ke awal dengan delay
            smoothScrollTo(track, 0, scrollDuration * 1.5);
        } else {
            const targetScroll = Math.min(maxScroll, track.scrollLeft + scrollAmount);
            smoothScrollTo(track, targetScroll, scrollDuration);
        }
    }, autoScrollDelay);

    // Pause auto scroll on hover/touch
    track.addEventListener('mouseenter', () => clearInterval(autoScroll));
    track.addEventListener('touchstart', () => clearInterval(autoScroll), { passive: true });
    
    const resumeAutoScroll = () => {
        clearInterval(autoScroll);
        autoScroll = setInterval(() => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            
            if (track.scrollLeft >= maxScroll - 10) {
                smoothScrollTo(track, 0, scrollDuration * 1.5);
            } else {
                const targetScroll = Math.min(maxScroll, track.scrollLeft + scrollAmount);
                smoothScrollTo(track, targetScroll, scrollDuration);
            }
        }, autoScrollDelay);
    };
    
    track.addEventListener('mouseleave', resumeAutoScroll);
    track.addEventListener('touchend', () => setTimeout(resumeAutoScroll, 2000), { passive: true });
}

// ===== Copy Link Function =====
function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.querySelector('.share-btn.copy-link');
        if (btn) {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 2000);
        }
        alert('Link berhasil disalin!');
    }).catch(err => {
        console.error('Gagal menyalin link:', err);
    });
}

// ===== Scroll Reveal Animation =====
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length === 0) return;

    const revealOnScroll = () => {
        revealElements.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const elementBottom = el.getBoundingClientRect().bottom;
            const windowHeight = window.innerHeight;

            // Element masuk viewport
            if (elementTop < windowHeight - 80 && elementBottom > 80) {
                el.classList.add('active');
            } else {
                // Element keluar viewport - reset untuk efek berulang
                el.classList.remove('active');
            }
        });
    };

    // Initial check
    revealOnScroll();

    // On scroll
    window.addEventListener('scroll', revealOnScroll, { passive: true });
}

// ===== Page Loader =====
function hidePageLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('hidden');
        // Remove from DOM after animation
        setTimeout(() => {
            loader.remove();
        }, 400);
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initRealTimeClock(); // Real-time clock (replaces updateDate)
    initNavScroll();
    initSubmenu();
    initTicker();
    initSearch();
    initSmoothScroll();
    initThemeToggle();
    initSorotanSlider();
    initScrollReveal();
});

// Hide loader when page fully loaded
window.addEventListener('load', () => {
    hidePageLoader();
});
