// Cek halaman mana yang sedang aktif
const isRoomPage = window.location.pathname.includes('room.html');

if (!isRoomPage) {
    // HALAMAN INDEX (index.html)
    
    const usernameInput = document.getElementById('username');
    const createRoomCodeInput = document.getElementById('createRoomCode');
    const joinRoomCodeInput = document.getElementById('joinRoomCode');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');

    // Create Room
    createRoomBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const roomCode = createRoomCodeInput.value.trim().toUpperCase();

        if (!username) {
            alert('⚠️ Masukkan username terlebih dahulu!');
            usernameInput.focus();
            return;
        }

        if (username.length < 3) {
            alert('⚠️ Username minimal 3 karakter!');
            usernameInput.focus();
            return;
        }

        if (!roomCode) {
            alert('⚠️ Masukkan kode room yang ingin dibuat!');
            createRoomCodeInput.focus();
            return;
        }

        if (roomCode.length !== 5) {
            alert('⚠️ Kode room harus 5 karakter!');
            createRoomCodeInput.focus();
            return;
        }

        // Simpan username dan kode room di localStorage
        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('action', 'create');

        console.log('📝 Data disimpan - Create Room:', { username, roomCode });

        // Pindah ke halaman room
        window.location.href = 'room.html';
    });

    // Join Room
    joinRoomBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const roomCode = joinRoomCodeInput.value.trim().toUpperCase();

        if (!username) {
            alert('⚠️ Masukkan username terlebih dahulu!');
            usernameInput.focus();
            return;
        }

        if (username.length < 3) {
            alert('⚠️ Username minimal 3 karakter!');
            usernameInput.focus();
            return;
        }

        if (!roomCode || roomCode.length !== 5) {
            alert('⚠️ Masukkan kode room 5 karakter!');
            joinRoomCodeInput.focus();
            return;
        }

        // Simpan data di localStorage
        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('action', 'join');

        console.log('📝 Data disimpan - Join Room:', { username, roomCode });

        // Pindah ke halaman room
        window.location.href = 'room.html';
    });

    // Enter key untuk submit
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createRoomCodeInput.focus();
        }
    });

    createRoomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createRoomBtn.click();
        }
    });

    joinRoomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });

    // Auto uppercase untuk room code
    createRoomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    joinRoomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

} else {
    // HALAMAN ROOM (room.html)
    
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userCountDisplay = document.getElementById('userCount');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');

    // Ambil data dari localStorage
    const username = localStorage.getItem('username');
    const action = localStorage.getItem('action');
    const roomCode = localStorage.getItem('roomCode');

    console.log('📋 Data dari localStorage:', { username, action, roomCode });

    // Validasi
    if (!username || !action || !roomCode) {
        alert('⚠️ Sesi tidak valid. Kembali ke halaman utama.');
        window.location.href = 'index.html';
        throw new Error('Invalid session');
    }

    // Tampilkan data awal
    usernameDisplay.textContent = username;
    roomCodeDisplay.textContent = 'Connecting...';

    // Setup WebSocket dengan retry
    let ws = null;
    let currentRoomCode = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        console.log('🔌 Connecting to:', wsUrl);
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ Terhubung ke server WebSocket');
            isConnected = true;
            reconnectAttempts = 0;

            // Hapus pesan koneksi terputus jika ada
            const disconnectMsg = document.querySelector('.system-message');
            if (disconnectMsg && disconnectMsg.textContent.includes('terputus')) {
                disconnectMsg.remove();
            }

            // Kirim request join/create room
            setTimeout(() => {
                if (action === 'create') {
                    console.log('📤 Mengirim request: create_room');
                    ws.send(JSON.stringify({
                        type: 'create_room',
                        roomCode: roomCode,
                        username: username
                    }));
                } else if (action === 'join') {
                    console.log('📤 Mengirim request: join_room');
                    ws.send(JSON.stringify({
                        type: 'join_room',
                        roomCode: roomCode,
                        username: username
                    }));
                }
            }, 100);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📥 Pesan dari server:', data);

            switch (data.type) {
                case 'room_created':
                    currentRoomCode = data.roomCode;
                    roomCodeDisplay.textContent = data.roomCode;
                    usernameDisplay.textContent = data.username;
                    addSystemMessage(`🎉 Room berhasil dibuat! Kode: ${data.roomCode}`);
                    addSystemMessage(`📋 Bagikan kode ini ke teman untuk join!`);
                    break;

                case 'room_joined':
                    currentRoomCode = data.roomCode;
                    roomCodeDisplay.textContent = data.roomCode;
                    usernameDisplay.textContent = data.username;
                    addSystemMessage(`✅ Berhasil join room: ${data.roomCode}`);
                    break;

                case 'user_joined':
                    addSystemMessage(`👋 ${data.username} bergabung ke room`);
                    userCountDisplay.textContent = data.userCount;
                    break;

                case 'user_left':
                    addSystemMessage(`👋 ${data.username} keluar dari room`);
                    userCountDisplay.textContent = data.userCount;
                    break;

                case 'user_count':
                    userCountDisplay.textContent = data.count;
                    break;

                case 'new_message':
                    addChatMessage(data.username, data.message, data.timestamp);
                    break;

                case 'left_room':
                    localStorage.removeItem('username');
                    localStorage.removeItem('roomCode');
                    localStorage.removeItem('action');
                    window.location.href = 'index.html';
                    break;

                case 'error':
                    alert(`❌ Error: ${data.message}`);
                    localStorage.removeItem('username');
                    localStorage.removeItem('roomCode');
                    localStorage.removeItem('action');
                    window.location.href = 'index.html';
                    break;
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            isConnected = false;
        };

        ws.onclose = () => {
            console.log('🔌 Koneksi WebSocket terputus');
            isConnected = false;
            
            addSystemMessage('⚠️ Koneksi terputus dari server');
            
            // Auto reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.log(`🔄 Mencoba reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
                addSystemMessage(`🔄 Mencoba reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
                setTimeout(connectWebSocket, 2000);
            } else {
                addSystemMessage('❌ Gagal reconnect. Silakan refresh halaman.');
            }
        };
    }

    // Mulai koneksi
    connectWebSocket();

    // Fungsi tambah pesan chat
    function addChatMessage(username, message, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${escapeHtml(username)}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${escapeHtml(message)}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Fungsi tambah system message
    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Escape HTML untuk keamanan
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Kirim pesan
    function sendMessage() {
        const message = messageInput.value.trim();

        if (!message) {
            return;
        }

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('⚠️ Koneksi terputus. Tunggu reconnect atau refresh halaman.');
            return;
        }

        console.log('📤 Mengirim pesan:', message);

        try {
            ws.send(JSON.stringify({
                type: 'send_message',
                message: message
            }));

            messageInput.value = '';
            messageInput.focus();
        } catch (error) {
            console.error('❌ Error mengirim pesan:', error);
            alert('❌ Gagal mengirim pesan. Coba lagi.');
        }
    }

    // Event listener tombol kirim
    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Tombol kirim diklik');
        sendMessage();
    });

    // Enter untuk kirim pesan
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('⌨️ Enter ditekan');
            sendMessage();
        }
    });

    // Leave room
    leaveRoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Tombol leave diklik');
        
        if (confirm('Yakin ingin keluar dari room?')) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('📤 Mengirim request: leave_room');
                try {
                    ws.send(JSON.stringify({
                        type: 'leave_room'
                    }));
                } catch (error) {
                    console.error('❌ Error saat leave:', error);
                    localStorage.removeItem('username');
                    localStorage.removeItem('roomCode');
                    localStorage.removeItem('action');
                    window.location.href = 'index.html';
                }
            } else {
                localStorage.removeItem('username');
                localStorage.removeItem('roomCode');
                localStorage.removeItem('action');
                window.location.href = 'index.html';
            }
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({
                    type: 'leave_room'
                }));
            } catch (error) {
                console.error('Error saat unload:', error);
            }
        }
    });

    // Focus ke input message saat halaman load
    setTimeout(() => {
        messageInput.focus();
    }, 1000);
}