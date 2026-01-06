// BMKG Weather API Integration
const BMKG_LOCATIONS = [
    { name: 'Marindal I', adm4: '12.71.11.1003' },
    { name: 'Medan', adm4: '12.71.01.1001' },
    { name: 'Aceh Tamiang', adm4: '11.13.01.2001' },
    { name: 'Binjai', adm4: '12.75.01.1001' },
    { name: 'Deli Serdang', adm4: '12.07.01.2001' },
    { name: 'Banda Aceh', adm4: '11.71.01.1001' },
    { name: 'Marindal II', adm4: '12.71.11.1004' }
];

// Icon cuaca BMKG
function getWeatherIcon(code) {
    const icons = {
        0: '☀️',   // Cerah
        1: '🌤️',  // Cerah Berawan
        2: '🌤️',  // Cerah Berawan
        3: '☁️',   // Berawan
        4: '☁️',   // Berawan Tebal
        5: '🌫️',  // Udara Kabur
        10: '🌧️', // Hujan Ringan
        45: '🌫️', // Berkabut
        60: '🌧️', // Hujan Ringan
        61: '🌧️', // Hujan Sedang
        63: '🌧️', // Hujan Lebat
        80: '🌦️', // Hujan Lokal
        95: '⛈️', // Hujan Petir
        97: '⛈️'  // Hujan Petir
    };
    return icons[code] || '🌤️';
}

// Deskripsi cuaca BMKG
function getWeatherDesc(code) {
    const desc = {
        0: 'Cerah',
        1: 'Cerah Berawan',
        2: 'Cerah Berawan',
        3: 'Berawan',
        4: 'Berawan Tebal',
        5: 'Udara Kabur',
        10: 'Hujan Ringan',
        45: 'Berkabut',
        60: 'Hujan Ringan',
        61: 'Hujan Sedang',
        63: 'Hujan Lebat',
        80: 'Hujan Lokal',
        95: 'Hujan Petir',
        97: 'Hujan Petir'
    };
    return desc[code] || '-';
}

// Fetch cuaca dari BMKG
async function fetchBMKGWeather(location) {
    try {
        const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${location.adm4}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error('API Error');
        
        const data = await res.json();
        
        // Ambil data cuaca terkini (index 0)
        if (data.data && data.data[0] && data.data[0].cuaca && data.data[0].cuaca[0]) {
            const cuaca = data.data[0].cuaca[0][0]; // Cuaca saat ini
            return {
                name: location.name,
                temp: Math.round(cuaca.t || 0),
                code: cuaca.weather,
                desc: getWeatherDesc(cuaca.weather),
                icon: getWeatherIcon(cuaca.weather),
                humidity: cuaca.hu
            };
        }
        
        throw new Error('No data');
    } catch (e) {
        console.error(`Error fetching weather for ${location.name}:`, e);
        return {
            name: location.name,
            temp: '-',
            desc: '-',
            icon: '🌤️'
        };
    }
}

// Fetch semua cuaca
async function fetchAllWeather() {
    const promises = BMKG_LOCATIONS.map(loc => fetchBMKGWeather(loc));
    return await Promise.all(promises);
}

// Update ticker
async function updateWeatherTicker() {
    const ticker = document.getElementById('weatherTicker');
    const updateEl = document.getElementById('weatherUpdate');
    if (!ticker) return;
    
    ticker.innerHTML = '<span class="ticker-item">Memuat info cuaca...</span>';
    
    try {
        const weatherData = await fetchAllWeather();
        
        let html = '';
        weatherData.forEach(w => {
            if (w.temp !== '-') {
                html += `<span class="ticker-item">${w.icon} ${w.name}: ${w.temp}°C, ${w.desc}</span>`;
            } else {
                html += `<span class="ticker-item">${w.icon} ${w.name}: -</span>`;
            }
        });
        
        // Duplicate untuk seamless loop
        ticker.innerHTML = html + html;
        
        // Update timestamp
        if (updateEl) {
            const now = new Date();
            updateEl.textContent = `Update: ${now.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        }
        
        setupTickerDrag();
        
    } catch (e) {
        console.error('Error updating weather:', e);
        ticker.innerHTML = '<span class="ticker-item">⚠️ Gagal memuat data cuaca</span>';
    }
}

// Drag/Swipe Ticker
function setupTickerDrag() {
    const ticker = document.getElementById('weatherTicker');
    if (!ticker) return;
    
    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    
    ticker.addEventListener('mouseenter', () => ticker.classList.add('paused'));
    ticker.addEventListener('mouseleave', () => { if (!isDragging) ticker.classList.remove('paused'); });
    
    ticker.addEventListener('mousedown', (e) => {
        isDragging = true;
        ticker.classList.add('paused');
        startX = e.pageX;
        const style = window.getComputedStyle(ticker);
        const matrix = new DOMMatrix(style.transform);
        currentTranslate = matrix.m41;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const walk = e.pageX - startX;
        ticker.style.transform = `translateX(${currentTranslate + walk}px)`;
        ticker.style.animation = 'none';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            setTimeout(() => {
                ticker.style.animation = '';
                ticker.style.transform = '';
                ticker.classList.remove('paused');
            }, 2000);
        }
    });
    
    // Touch for mobile
    ticker.addEventListener('touchstart', (e) => {
        isDragging = true;
        ticker.classList.add('paused');
        startX = e.touches[0].pageX;
        const style = window.getComputedStyle(ticker);
        const matrix = new DOMMatrix(style.transform);
        currentTranslate = matrix.m41;
    }, { passive: true });
    
    ticker.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const walk = e.touches[0].pageX - startX;
        ticker.style.transform = `translateX(${currentTranslate + walk}px)`;
        ticker.style.animation = 'none';
    }, { passive: true });
    
    ticker.addEventListener('touchend', () => {
        isDragging = false;
        setTimeout(() => {
            ticker.style.animation = '';
            ticker.style.transform = '';
            ticker.classList.remove('paused');
        }, 2000);
    });
}

// Init
document.addEventListener('DOMContentLoaded', updateWeatherTicker);

// Refresh setiap 30 menit
setInterval(updateWeatherTicker, 30 * 60 * 1000);
