// AI Chat Widget - MarendalSatu
const AI_CONFIG = {
    apiUrl: 'https://api.vibe-dev.web.id/v1/chat/completions',
    apiKey: 'vibedevid-I9Y5L5GQocE3m5qgMbE4rRTx0P6ZkJ1V',
    model: 'claude-sonnet-4-5',
    maxTokens: 800
};

let chatHistory = [];
let currentUserName = null;

function getLoggedInUser() {
    try {
        const userData = localStorage.getItem('googleUser');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (e) {
        console.error('Error getting user data:', e);
    }
    return null;
}

function initAIChat() {
    // Get logged in user for personalization
    const user = getLoggedInUser();
    currentUserName = user ? user.name.split(' ')[0] : null; // First name only

    const greeting = currentUserName
        ? `Halo ${currentUserName}! 👋 Saya asisten AI MarendalSatu. Ada yang bisa saya bantu?`
        : `Halo! 👋 Saya asisten AI MarendalSatu. Ada yang bisa saya bantu?`;

    // Determine logo path based on current page depth
    const pathDepth = window.location.pathname.split('/').filter(p => p && !p.includes('.')).length;
    const logoPath = pathDepth === 0 ? '../assets/marendallogo.png' : '../'.repeat(pathDepth) + '../assets/marendallogo.png';

    // Create chat widget HTML
    const widget = document.createElement('div');
    widget.innerHTML = `
        <!-- Floating Button -->
        <button type="button" class="ai-fab" id="aiFab" title="Tanya AI">
            <span class="ai-fab-icon"><img src="${logoPath}" alt="AI" style="width:24px;height:24px;border-radius:50%;"></span>
            <span class="ai-fab-close">✕</span>
        </button>
        
        <!-- Chat Box -->
        <div class="ai-chat-box" id="aiChatBox">
            <div class="ai-chat-header">
                <div class="ai-chat-title">
                    <img src="${logoPath}" alt="AI" style="width:32px;height:32px;border-radius:50%;">
                    <div>
                        <strong>Asisten AI</strong>
                        <small>MarendalSatu${currentUserName ? ' • ' + currentUserName : ''}</small>
                    </div>
                </div>
                <button type="button" class="ai-chat-close" onclick="toggleAIChat()">✕</button>
            </div>
            <div class="ai-chat-messages" id="aiMessages">
                <div class="ai-message ai-bot">
                    <p>${greeting}</p>
                </div>
            </div>
            <div class="ai-chat-input">
                <input type="text" id="aiInput" placeholder="Ketik pertanyaan..." autocomplete="off">
                <button type="button" id="aiSend" onclick="sendAIMessage()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('aiFab').addEventListener('click', toggleAIChat);
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });

    // Listen for login changes to update greeting
    window.addEventListener('userLoggedIn', () => {
        const newUser = getLoggedInUser();
        if (newUser) {
            currentUserName = newUser.name.split(' ')[0];
            updateChatHeader();
        }
    });
}

function updateChatHeader() {
    const headerSmall = document.querySelector('.ai-chat-title small');
    if (headerSmall && currentUserName) {
        headerSmall.textContent = 'MarendalSatu • ' + currentUserName;
    }
}

function toggleAIChat() {
    const chatBox = document.getElementById('aiChatBox');
    const fab = document.getElementById('aiFab');
    chatBox.classList.toggle('active');
    fab.classList.toggle('active');

    if (chatBox.classList.contains('active')) {
        document.getElementById('aiInput').focus();
    }
}

async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    const typingId = showTyping();

    try {
        const response = await fetch(AI_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: `Kamu asisten AI MarendalSatu, portal berita Sumatera Utara. ${currentUserName ? 'Kamu sedang berbicara dengan ' + currentUserName + '. ' : ''}Jawab singkat, jelas, tanpa emoji berlebihan, tanpa bullet point, tanpa format markdown. Pakai bahasa Indonesia santai seperti ngobrol biasa. Langsung ke inti jawaban.`
                    },
                    ...chatHistory.slice(-6),
                    { role: 'user', content: message }
                ],
                max_tokens: AI_CONFIG.maxTokens
            })
        });

        const data = await response.json();
        removeTyping(typingId);

        if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            addMessage(reply, 'bot');
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: reply });
        } else {
            addMessage('Maaf, terjadi kesalahan. Coba lagi ya.', 'bot');
        }
    } catch (error) {
        removeTyping(typingId);
        addMessage('Maaf, tidak bisa terhubung ke server. Coba lagi nanti.', 'bot');
        console.error('AI Error:', error);
    }
}

function addMessage(text, type) {
    const container = document.getElementById('aiMessages');
    const div = document.createElement('div');
    div.className = `ai-message ai-${type}`;
    div.innerHTML = `<p>${escapeHtml(text)}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const container = document.getElementById('aiMessages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'ai-message ai-bot ai-typing';
    div.id = id;
    div.innerHTML = '<p><span class="dot"></span><span class="dot"></span><span class="dot"></span></p>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
} else {
    initAIChat();
}

window.toggleAIChat = toggleAIChat;
window.sendAIMessage = sendAIMessage;
