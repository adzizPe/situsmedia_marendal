// Quiz Berita Harian
const firebaseConfig = {
    apiKey: "AIzaSyAAjCd2CvsfiRCVWcwNSmjNt_w3N4eVSbM",
    databaseURL: "https://login-fe9bf-default-rtdb.firebaseio.com",
    projectId: "login-fe9bf"
};

let quizApp, quizDb;
let quizCurrentUser = null; // Renamed to avoid conflict with auth.js
let questions = [];
let currentQuestion = 0;
let selectedAnswer = null;
let userAnswers = [];
let score = 0;

// Timer variables
let questionTimer = null;
let timeLeft = 15; // 15 seconds per question
let questionStartTime = 0;
let totalDuration = 0; // Total time in milliseconds

// Default questions (admin bisa tambah dari panel)
const defaultQuestions = [
    {
        question: "Apa nama ibu kota Provinsi Sumatera Utara?",
        options: ["Binjai", "Medan", "Pematangsiantar", "Tebing Tinggi"],
        answer: 1
    },
    {
        question: "Danau vulkanik terbesar di dunia yang terletak di Sumatera Utara adalah?",
        options: ["Danau Singkarak", "Danau Toba", "Danau Maninjau", "Danau Kerinci"],
        answer: 1
    },
    {
        question: "Bandara internasional utama di Sumatera Utara bernama?",
        options: ["Soekarno-Hatta", "Kualanamu", "Juanda", "Sultan Hasanuddin"],
        answer: 1
    },
    {
        question: "Makanan khas Medan yang terbuat dari mie kuning dengan kuah santan adalah?",
        options: ["Mie Aceh", "Mie Gomak", "Mie Medan", "Mie Ayam"],
        answer: 1
    },
    {
        question: "Suku asli yang mendiami kawasan Danau Toba adalah?",
        options: ["Suku Melayu", "Suku Batak", "Suku Minang", "Suku Aceh"],
        answer: 1
    }
];

function initFirebase() {
    try { 
        quizApp = firebase.app('quizApp'); 
    } catch (e) { 
        quizApp = firebase.initializeApp(firebaseConfig, 'quizApp'); 
    }
    quizDb = quizApp.database();
    console.log('Quiz: Firebase initialized');
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function checkLoginStatus() {
    const userData = localStorage.getItem('googleUser');
    console.log('Quiz: Checking login status...', userData ? 'Found user' : 'No user');

    if (userData) {
        try {
            quizCurrentUser = JSON.parse(userData);
            console.log('Quiz: User logged in:', quizCurrentUser.name);
            
            // Pastikan Firebase sudah ready
            if (!quizDb) {
                initFirebase();
            }
            
            // Check if user has WhatsApp number
            checkWhatsAppNumber();
        } catch (e) {
            console.error('Quiz: Error parsing user data', e);
            showLoginRequired();
        }
    } else {
        showLoginRequired();
    }
}

function checkWhatsAppNumber() {
    const oderId = quizCurrentUser.id || quizCurrentUser.email.replace(/[.@]/g, '_');

    quizDb.ref('quizLeaderboard/' + oderId + '/whatsapp').once('value', (snapshot) => {
        const whatsapp = snapshot.val();
        if (whatsapp) {
            quizCurrentUser.whatsapp = whatsapp;
            checkTodayQuiz();
        } else {
            showWhatsAppForm();
        }
    }).catch((error) => {
        console.error('Error checking WhatsApp:', error);
        // Jika error, langsung tampilkan form WhatsApp
        showWhatsAppForm();
    });
}

function showWhatsAppForm() {
    document.getElementById('quizContainer').innerHTML = `
        <div class="quiz-wa-form">
            <div class="quiz-wa-icon">📱</div>
            <h2>Lengkapi Data</h2>
            <p>Masukkan nomor WhatsApp untuk bisa dihubungi jika menang hadiah mingguan</p>
            <form onsubmit="saveWhatsAppNumber(event)">
                <div class="quiz-wa-input">
                    <span class="quiz-wa-prefix">+62</span>
                    <input type="tel" id="waNumber" placeholder="8123456789" pattern="[0-9]{9,13}" required>
                </div>
                <p class="quiz-wa-hint">Contoh: 81234567890 (tanpa 0 di depan)</p>
                <button type="submit" class="quiz-wa-btn">Simpan & Mulai Quiz</button>
            </form>
        </div>
    `;
}

async function saveWhatsAppNumber(e) {
    e.preventDefault();
    const waInput = document.getElementById('waNumber').value.trim();

    if (!waInput || waInput.length < 9) {
        alert('Nomor WhatsApp tidak valid');
        return;
    }

    const whatsapp = '+62' + waInput.replace(/^0+/, '');
    const oderId = quizCurrentUser.id || quizCurrentUser.email.replace(/[.@]/g, '_');

    // Show loading
    const btn = document.querySelector('.quiz-wa-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';
    }

    try {
        // Save to leaderboard
        await quizDb.ref('quizLeaderboard/' + oderId).set({
            oderId,
            name: quizCurrentUser.name,
            email: quizCurrentUser.email,
            picture: quizCurrentUser.picture || '',
            whatsapp: whatsapp,
            totalScore: 0,
            quizCount: 0,
            totalDuration: 0,
            avgDuration: 0
        });

        quizCurrentUser.whatsapp = whatsapp;
        checkTodayQuiz();
    } catch (err) {
        console.error('Error saving WhatsApp:', err);
        alert('Gagal menyimpan: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Simpan & Mulai Quiz';
        }
    }
}
window.saveWhatsAppNumber = saveWhatsAppNumber;

function showLoginRequired() {
    document.getElementById('quizContainer').innerHTML = `
        <div class="quiz-login">
            <div class="quiz-login-icon">🔐</div>
            <h2>Login Diperlukan</h2>
            <p>Silakan login dengan Google untuk memulai quiz</p>
            <button type="button" class="quiz-login-btn" onclick="showLoginModal()">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                Login dengan Google
            </button>
        </div>
    `;
}

function checkTodayQuiz() {
    const today = getTodayDate();
    const oderId = quizCurrentUser.id || quizCurrentUser.email.replace(/[.@]/g, '_');

    quizDb.ref('quizResults/' + oderId + '_' + today).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const result = snapshot.val();
            showAlreadyPlayed(result);
        } else {
            loadQuestions();
        }
    });
}

function showAlreadyPlayed(result) {
    const emoji = result.score >= 80 ? '🏆' : result.score >= 60 ? '👍' : '💪';
    document.getElementById('quizContainer').innerHTML = `
        <div class="quiz-done">
            <div class="quiz-done-icon">${emoji}</div>
            <h2>Kamu sudah main hari ini!</h2>
            <p>Skor kamu:</p>
            <div class="quiz-done-score">${result.score}</div>
            <p>Benar: ${result.correct} dari ${result.total} soal</p>
            <div class="quiz-done-info">
                Kembali besok untuk quiz baru ya! <br>
                <a href="./leaderboard/" style="color:var(--primary);margin-top:15px;display:inline-block;">Lihat Papan Peringkat →</a>
            </div>
        </div>
    `;
}

function loadQuestions() {
    // Load from Firebase or use default
    quizDb.ref('quizQuestions').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            questions = Object.values(data);
            // Shuffle and take 5
            questions = shuffleArray(questions).slice(0, 5);
        } else {
            questions = shuffleArray([...defaultQuestions]).slice(0, 5);
        }
        startQuiz();
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz() {
    currentQuestion = 0;
    selectedAnswer = null;
    userAnswers = [];
    score = 0;
    totalDuration = 0; // Reset total duration
    renderQuestion();
}

function renderQuestion() {
    const q = questions[currentQuestion];
    const progress = ((currentQuestion) / questions.length) * 100;
    const letters = ['A', 'B', 'C', 'D'];

    // Reset timer
    timeLeft = 15;
    questionStartTime = Date.now();

    document.getElementById('quizContainer').innerHTML = `
        <div class="quiz-progress">
            <div class="quiz-progress-bar">
                <div class="quiz-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="quiz-progress-text">
                <span>Soal ${currentQuestion + 1} dari ${questions.length}</span>
                <span>Skor: ${score}</span>
            </div>
        </div>
        
        <div class="quiz-timer" id="quizTimer">
            <div class="quiz-timer-icon">⏱️</div>
            <div class="quiz-timer-bar">
                <div class="quiz-timer-fill" id="timerFill" style="width: 100%"></div>
            </div>
            <div class="quiz-timer-text" id="timerText">${timeLeft}</div>
        </div>
        
        <div class="quiz-question">
            <div class="quiz-question-num">PERTANYAAN ${currentQuestion + 1}</div>
            <div class="quiz-question-text">${q.question}</div>
        </div>
        
        <div class="quiz-options">
            ${q.options.map((opt, idx) => `
                <div class="quiz-option" onclick="selectAnswer(${idx})" data-idx="${idx}">
                    <span class="quiz-option-letter">${letters[idx]}</span>
                    <span class="quiz-option-text">${opt}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="quiz-actions">
            <button type="button" class="quiz-btn quiz-btn-primary" id="btnNext" onclick="nextQuestion()" disabled>
                ${currentQuestion === questions.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'}
            </button>
        </div>
    `;

    // Start countdown timer
    startTimer();
}

function startTimer() {
    // Clear existing timer
    if (questionTimer) clearInterval(questionTimer);

    questionTimer = setInterval(() => {
        timeLeft--;

        const timerFill = document.getElementById('timerFill');
        const timerText = document.getElementById('timerText');

        if (timerFill && timerText) {
            const percentage = (timeLeft / 15) * 100;
            timerFill.style.width = percentage + '%';
            timerText.textContent = timeLeft;

            // Change color when time is low
            if (timeLeft <= 5) {
                timerFill.style.background = '#e74c3c';
                document.getElementById('quizTimer').classList.add('warning');
            }
        }

        // Time's up!
        if (timeLeft <= 0) {
            clearInterval(questionTimer);
            autoSelectWrongAnswer();
        }
    }, 1000);
}

function autoSelectWrongAnswer() {
    if (selectedAnswer !== null) return; // Already answered

    const q = questions[currentQuestion];
    const timeTaken = Date.now() - questionStartTime;
    totalDuration += timeTaken;

    // Mark as wrong (no answer selected)
    userAnswers.push({
        question: q.question,
        selected: -1, // No answer
        correct: q.answer,
        isCorrect: false,
        timeTaken: timeTaken
    });

    selectedAnswer = -1; // Mark as answered (timeout)

    // Update UI
    document.querySelectorAll('.quiz-option').forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === q.answer) {
            opt.classList.add('correct');
        }
    });

    document.getElementById('btnNext').disabled = false;
}

function selectAnswer(idx) {
    if (selectedAnswer !== null) return; // Already answered

    // Stop timer and calculate time taken
    clearInterval(questionTimer);
    const timeTaken = Date.now() - questionStartTime;
    totalDuration += timeTaken;

    selectedAnswer = idx;
    const q = questions[currentQuestion];
    const isCorrect = idx === q.answer;

    if (isCorrect) score += 20;

    userAnswers.push({
        question: q.question,
        selected: idx,
        correct: q.answer,
        isCorrect,
        timeTaken: timeTaken
    });

    // Update UI
    document.querySelectorAll('.quiz-option').forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === q.answer) {
            opt.classList.add('correct');
        } else if (i === idx && !isCorrect) {
            opt.classList.add('wrong');
        }
    });

    document.getElementById('btnNext').disabled = false;
}

function nextQuestion() {
    if (selectedAnswer === null) return;

    currentQuestion++;
    selectedAnswer = null;

    if (currentQuestion >= questions.length) {
        showResult();
    } else {
        renderQuestion();
    }
}

function showResult() {
    const correct = userAnswers.filter(a => a.isCorrect).length;
    const emoji = score >= 80 ? '🏆' : score >= 60 ? '🎉' : score >= 40 ? '👍' : '💪';
    const message = score >= 80 ? 'Luar biasa!' : score >= 60 ? 'Bagus sekali!' : score >= 40 ? 'Lumayan!' : 'Tetap semangat!';

    // Format duration
    const durationSeconds = Math.floor(totalDuration / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} detik`;

    // Save to Firebase
    saveResult(correct);

    document.getElementById('quizContainer').innerHTML = `
        <div class="quiz-result">
            <div class="quiz-result-icon">${emoji}</div>
            <h2>${message}</h2>
            <div class="quiz-result-score">${score}</div>
            <div class="quiz-result-detail">
                Kamu menjawab ${correct} dari ${questions.length} soal dengan benar
            </div>
            <div class="quiz-result-duration">
                ⏱️ Waktu: ${durationText}
            </div>
            <div class="quiz-result-actions">
                <a href="./leaderboard/" class="btn-leaderboard">Lihat Peringkat</a>
                <a href="../" class="btn-home">Kembali ke Beranda</a>
            </div>
        </div>
    `;
}

async function saveResult(correct) {
    const today = getTodayDate();
    const oderId = quizCurrentUser.id || quizCurrentUser.email.replace(/[.@]/g, '_');

    // Save today's result with duration
    const resultData = {
        oderId,
        name: quizCurrentUser.name,
        email: quizCurrentUser.email,
        picture: quizCurrentUser.picture || '',
        whatsapp: quizCurrentUser.whatsapp || '',
        score,
        correct,
        total: questions.length,
        duration: totalDuration, // Total duration in ms
        date: today,
        timestamp: new Date().toISOString()
    };

    await quizDb.ref('quizResults/' + oderId + '_' + today).set(resultData);

    // Update leaderboard with average duration
    const leaderboardRef = quizDb.ref('quizLeaderboard/' + oderId);
    leaderboardRef.once('value', async (snapshot) => {
        const existing = snapshot.val();
        if (existing) {
            const newTotalDuration = (existing.totalDuration || 0) + totalDuration;
            const newQuizCount = existing.quizCount + 1;
            await leaderboardRef.update({
                totalScore: existing.totalScore + score,
                quizCount: newQuizCount,
                totalDuration: newTotalDuration,
                avgDuration: Math.floor(newTotalDuration / newQuizCount),
                lastDuration: totalDuration,
                lastPlayed: today
            });
        } else {
            await leaderboardRef.set({
                oderId,
                name: quizCurrentUser.name,
                email: quizCurrentUser.email,
                picture: quizCurrentUser.picture || '',
                whatsapp: quizCurrentUser.whatsapp || '',
                totalScore: score,
                quizCount: 1,
                totalDuration: totalDuration,
                avgDuration: totalDuration,
                lastDuration: totalDuration,
                lastPlayed: today
            });
        }
    });
}

// Listen for login changes
window.addEventListener('storage', (e) => {
    if (e.key === 'googleUser') {
        checkLoginStatus();
    }
});

// Listen for custom login event from auth.js
window.addEventListener('userLoggedIn', () => {
    checkLoginStatus();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();

    // Check login dengan interval sampai berhasil atau timeout
    let attempts = 0;
    const maxAttempts = 10;

    const checkLogin = () => {
        const userData = localStorage.getItem('googleUser');
        if (userData || attempts >= maxAttempts) {
            checkLoginStatus();
        } else {
            attempts++;
            setTimeout(checkLogin, 200);
        }
    };

    checkLogin();
});
