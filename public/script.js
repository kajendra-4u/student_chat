// Cek halaman mana yang sedang aktif
const isRoomPage = window.location.pathname.includes('room.html');

if (!isRoomPage) {
    // ==================== HALAMAN INDEX ====================
    
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

        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('action', 'create');

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

        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('action', 'join');

        window.location.href = 'room.html';
    });

    // Enter key handlers
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoomCodeInput.focus();
    });

    createRoomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoomBtn.click();
    });

    joinRoomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoomBtn.click();
    });

    // Auto uppercase
    createRoomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    joinRoomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

} else {
    // ==================== HALAMAN ROOM ====================
    
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userCountDisplay = document.getElementById('userCount');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const attachBtn = document.getElementById('attachBtn');
    const voiceBtn = document.getElementById('voiceBtn');

    // File inputs
    const imageInput = document.getElementById('imageInput');
    const videoInput = document.getElementById('videoInput');
    const fileInput = document.getElementById('fileInput');

    // Modals
    const attachModal = document.getElementById('attachModal');
    const previewModal = document.getElementById('previewModal');
    const voiceModal = document.getElementById('voiceModal');
    const mediaViewerModal = document.getElementById('mediaViewerModal');

    // Modal buttons
    const attachCancelBtn = document.getElementById('attachCancelBtn');
    const attachImageBtn = document.getElementById('attachImageBtn');
    const attachVideoBtn = document.getElementById('attachVideoBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const previewCloseBtn = document.getElementById('previewCloseBtn');
    const sendPreviewBtn = document.getElementById('sendPreviewBtn');
    const mediaViewerCloseBtn = document.getElementById('mediaViewerCloseBtn');
    const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');

    // Ambil data dari localStorage
    const username = localStorage.getItem('username');
    const action = localStorage.getItem('action');
    const roomCode = localStorage.getItem('roomCode');

    if (!username || !action || !roomCode) {
        alert('⚠️ Sesi tidak valid. Kembali ke halaman utama.');
        window.location.href = 'index.html';
        throw new Error('Invalid session');
    }

    usernameDisplay.textContent = username;
    roomCodeDisplay.textContent = 'Connecting...';

    // WebSocket setup
    let ws = null;
    let currentRoomCode = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    // Voice recording variables
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingStartTime = null;
    let recordingInterval = null;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let animationId = null;

    // Preview variables
    let currentPreviewFile = null;
    let currentPreviewType = null;

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        console.log('🔌 Connecting to:', wsUrl);
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ Terhubung ke server WebSocket');
            isConnected = true;
            reconnectAttempts = 0;

            setTimeout(() => {
                if (action === 'create') {
                    ws.send(JSON.stringify({
                        type: 'create_room',
                        roomCode: roomCode,
                        username: username
                    }));
                } else if (action === 'join') {
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
            console.log('📥 Pesan dari server:', data.type);

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
                    addChatMessage(data);
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
            
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                addSystemMessage(`🔄 Mencoba reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
                setTimeout(connectWebSocket, 2000);
            } else {
                addSystemMessage('❌ Gagal reconnect. Silakan refresh halaman.');
            }
        };
    }

    connectWebSocket();

    // ==================== MESSAGE FUNCTIONS ====================

    function addChatMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        let messageContent = '';
        
        // Header
        messageContent += `
            <div class="message-header">
                <span class="message-username">${escapeHtml(data.username)}</span>
                <span class="message-time">${data.timestamp}</span>
            </div>
        `;

        // Message content based on type
        if (data.messageType === 'text') {
            messageContent += `<div class="message-text">${escapeHtml(data.message)}</div>`;
        } 
        else if (data.messageType === 'image') {
            if (data.message) {
                messageContent += `<div class="message-text">${escapeHtml(data.message)}</div>`;
            }
            messageContent += `
                <div class="message-media">
                    <img src="${data.fileData}" alt="Image" class="message-image" onclick="viewMedia('${data.fileData}', 'image')">
                </div>
            `;
        } 
        else if (data.messageType === 'video') {
            if (data.message) {
                messageContent += `<div class="message-text">${escapeHtml(data.message)}</div>`;
            }
            messageContent += `
                <div class="message-media">
                    <video src="${data.fileData}" controls class="message-video"></video>
                </div>
            `;
        } 
        else if (data.messageType === 'file') {
            if (data.message) {
                messageContent += `<div class="message-text">${escapeHtml(data.message)}</div>`;
            }
            messageContent += `
                <div class="message-media">
                    <a href="${data.fileData}" download="${data.fileName}" class="message-file">
                        <span class="file-icon">📄</span>
                        <div class="file-info">
                            <div class="file-name">${escapeHtml(data.fileName)}</div>
                            <div class="file-size">${formatFileSize(data.fileSize)}</div>
                        </div>
                    </a>
                </div>
            `;
        } 
        else if (data.messageType === 'voice') {
            messageContent += `
                <div class="message-media">
                    <div class="message-voice">
                        <button class="voice-play-btn" onclick="playVoice(this, '${data.fileData}')">▶️</button>
                        <div class="voice-waveform"></div>
                        <span class="voice-duration">${formatDuration(data.duration)}</span>
                    </div>
                </div>
            `;
        }

        messageDiv.innerHTML = messageContent;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ==================== LOADING MESSAGE ====================

    function showLoadingMessage(type, previewData = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message loading-message';
        messageDiv.id = 'loading-message-' + Date.now();
        
        let messageContent = `
            <div class="message-header">
                <span class="message-username">${escapeHtml(username)}</span>
                <span class="message-time">Mengirim...</span>
            </div>
        `;

        if (type === 'image' && previewData) {
            messageContent += `
                <div class="message-media loading-media">
                    <img src="${previewData}" alt="Loading" class="message-image loading-blur">
                    <div class="media-loading-overlay">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Mengirim...</div>
                    </div>
                </div>
            `;
        } else if (type === 'video' && previewData) {
            messageContent += `
                <div class="message-media loading-media">
                    <div class="video-placeholder">
                        <span class="file-icon" style="font-size: 48px;">🎥</span>
                        <div class="media-loading-overlay">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">Mengirim video...</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'file') {
            messageContent += `
                <div class="message-media loading-media">
                    <div class="message-file loading">
                        <span class="file-icon">📄</span>
                        <div class="file-info">
                            <div class="file-name">Mengirim file...</div>
                        </div>
                        <div class="loading-spinner small"></div>
                    </div>
                </div>
            `;
        } else if (type === 'voice') {
            messageContent += `
                <div class="message-media loading-media">
                    <div class="message-voice loading">
                        <span class="file-icon">🎤</span>
                        <div class="voice-waveform"></div>
                        <div class="loading-spinner small"></div>
                    </div>
                </div>
            `;
        }

        messageDiv.innerHTML = messageContent;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return messageDiv.id;
    }

    function removeLoadingMessage(loadingId) {
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    // ==================== SEND MESSAGE ====================

    function sendMessage() {
        const message = messageInput.value.trim();

        if (!message) return;

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('⚠️ Koneksi terputus. Tunggu reconnect atau refresh halaman.');
            return;
        }

        try {
            ws.send(JSON.stringify({
                type: 'send_message',
                message: message,
                messageType: 'text'
            }));

            messageInput.value = '';
            messageInput.focus();
        } catch (error) {
            console.error('❌ Error mengirim pesan:', error);
            alert('❌ Gagal mengirim pesan. Coba lagi.');
        }
    }

    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ==================== ATTACH FILES ====================

    attachBtn.addEventListener('click', () => {
        attachModal.classList.add('active');
    });

    attachCancelBtn.addEventListener('click', () => {
        attachModal.classList.remove('active');
    });

    attachImageBtn.addEventListener('click', () => {
        attachModal.classList.remove('active');
        imageInput.click();
    });

    attachVideoBtn.addEventListener('click', () => {
        attachModal.classList.remove('active');
        videoInput.click();
    });

    attachFileBtn.addEventListener('click', () => {
        attachModal.classList.remove('active');
        fileInput.click();
    });

    // Image upload
    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleImageUpload(files[0]);
        }
        e.target.value = '';
    });

    // Video upload
    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleVideoUpload(file);
        }
        e.target.value = '';
    });

    // File upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        e.target.value = '';
    });

    function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('⚠️ File harus berupa gambar!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentPreviewFile = e.target.result;
            currentPreviewType = 'image';
            showPreview(e.target.result, 'image', file.name, file.size);
        };
        reader.readAsDataURL(file);
    }

    function handleVideoUpload(file) {
        if (!file.type.startsWith('video/')) {
            alert('⚠️ File harus berupa video!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentPreviewFile = e.target.result;
            currentPreviewType = 'video';
            showPreview(e.target.result, 'video', file.name, file.size);
        };
        reader.readAsDataURL(file);
    }

    function handleFileUpload(file) {
        // Show loading
        const loadingId = showLoadingMessage('file');

        const reader = new FileReader();
        reader.onload = (e) => {
            sendFileMessage(e.target.result, file.name, file.size, file.type, loadingId);
        };
        reader.readAsDataURL(file);
    }

    function showPreview(data, type, fileName, fileSize) {
        const previewContainer = document.getElementById('previewContainer');
        previewContainer.innerHTML = '';

        if (type === 'image') {
            const img = document.createElement('img');
            img.src = data;
            previewContainer.appendChild(img);
        } else if (type === 'video') {
            const video = document.createElement('video');
            video.src = data;
            video.controls = true;
            previewContainer.appendChild(video);
        }

        const captionInput = document.getElementById('captionInput');
        captionInput.value = '';
        captionInput.focus();

        previewModal.classList.add('active');
    }

    previewCloseBtn.addEventListener('click', () => {
        previewModal.classList.remove('active');
        currentPreviewFile = null;
        currentPreviewType = null;
    });

    sendPreviewBtn.addEventListener('click', () => {
        const caption = document.getElementById('captionInput').value.trim();

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('⚠️ Koneksi terputus!');
            return;
        }

        // Show loading
        const loadingId = showLoadingMessage(currentPreviewType, currentPreviewFile);

        // Close preview modal
        previewModal.classList.remove('active');

        // Send with slight delay to show loading
        setTimeout(() => {
            try {
                ws.send(JSON.stringify({
                    type: 'send_message',
                    message: caption,
                    messageType: currentPreviewType,
                    fileData: currentPreviewFile
                }));

                // Remove loading after send
                setTimeout(() => {
                    removeLoadingMessage(loadingId);
                }, 300);

                currentPreviewFile = null;
                currentPreviewType = null;
            } catch (error) {
                console.error('❌ Error mengirim media:', error);
                removeLoadingMessage(loadingId);
                alert('❌ Gagal mengirim. File terlalu besar atau koneksi bermasalah.');
            }
        }, 100);
    });

    function sendFileMessage(data, fileName, fileSize, mimeType, loadingId) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('⚠️ Koneksi terputus!');
            removeLoadingMessage(loadingId);
            return;
        }

        setTimeout(() => {
            try {
                ws.send(JSON.stringify({
                    type: 'send_message',
                    message: '',
                    messageType: 'file',
                    fileData: data,
                    fileName: fileName,
                    fileSize: fileSize,
                    mimeType: mimeType
                }));

                setTimeout(() => {
                    removeLoadingMessage(loadingId);
                }, 300);
            } catch (error) {
                console.error('❌ Error mengirim file:', error);
                removeLoadingMessage(loadingId);
                alert('❌ Gagal mengirim file. Ukuran terlalu besar atau koneksi bermasalah.');
            }
        }, 100);
    }

    // ==================== VOICE RECORDING ====================

    voiceBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startVoiceRecording(stream);
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            alert('❌ Tidak dapat mengakses mikrofon. Pastikan izin diberikan.');
        }
    });

    function startVoiceRecording(stream) {
        voiceModal.classList.add('active');

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingStartTime = Date.now();

        // Setup audio visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        visualizeAudio();

        // Update timer
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            document.getElementById('recordingTime').textContent = formatDuration(elapsed);
        }, 1000);

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = (e) => {
                const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                
                // Show loading
                const loadingId = showLoadingMessage('voice');
                
                // Send voice note
                sendVoiceMessage(e.target.result, duration, loadingId);
            };
            reader.readAsDataURL(audioBlob);

            stream.getTracks().forEach(track => track.stop());
            if (audioContext) audioContext.close();
            if (animationId) cancelAnimationFrame(animationId);
            clearInterval(recordingInterval);
        };

        mediaRecorder.start();
    }

    function visualizeAudio() {
        const canvas = document.getElementById('voiceCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        function draw() {
            animationId = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgba(13, 15, 39, 0.5)';
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / dataArray.length) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                barHeight = (dataArray[i] / 255) * height;

                ctx.fillStyle = `rgb(${dataArray[i] + 100}, 201, 232)`;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        }

        draw();
    }

    cancelVoiceBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        voiceModal.classList.remove('active');
    });

    stopVoiceBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        voiceModal.classList.remove('active');
    });

    function sendVoiceMessage(data, duration, loadingId) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert('⚠️ Koneksi terputus!');
            removeLoadingMessage(loadingId);
            return;
        }

        setTimeout(() => {
            try {
                ws.send(JSON.stringify({
                    type: 'send_message',
                    message: '',
                    messageType: 'voice',
                    fileData: data,
                    duration: duration
                }));

                setTimeout(() => {
                    removeLoadingMessage(loadingId);
                }, 300);
            } catch (error) {
                console.error('❌ Error mengirim voice note:', error);
                removeLoadingMessage(loadingId);
                alert('❌ Gagal mengirim voice note.');
            }
        }, 100);
    }

    // ==================== MEDIA VIEWER ====================

    window.viewMedia = function(src, type) {
        const container = document.getElementById('mediaViewerContainer');
        container.innerHTML = '';

        if (type === 'image') {
            const img = document.createElement('img');
            img.src = src;
            container.appendChild(img);
        } else if (type === 'video') {
            const video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            container.appendChild(video);
        }

        mediaViewerModal.classList.add('active');
    };

    mediaViewerCloseBtn.addEventListener('click', () => {
        const container = document.getElementById('mediaViewerContainer');
        const video = container.querySelector('video');
        if (video) video.pause();
        mediaViewerModal.classList.remove('active');
    });

    // ==================== VOICE PLAYBACK ====================

    window.playVoice = function(btn, src) {
        const audio = new Audio(src);
        const isPlaying = btn.textContent === '⏸️';

        if (isPlaying) {
            audio.pause();
            btn.textContent = '▶️';
        } else {
            // Stop other playing voices
            document.querySelectorAll('.voice-play-btn').forEach(b => {
                b.textContent = '▶️';
            });

            btn.textContent = '⏸️';
            audio.play();

            audio.onended = () => {
                btn.textContent = '▶️';
            };
        }
    };

    // ==================== LEAVE ROOM ====================

    leaveRoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (confirm('Yakin ingin keluar dari room?')) {
            if (ws && ws.readyState === WebSocket.OPEN) {
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

    // ==================== PAGE UNLOAD ====================

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

    // Auto focus message input
    setTimeout(() => {
        messageInput.focus();
    }, 1000);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === attachModal) {
            attachModal.classList.remove('active');
        }
        if (e.target === previewModal) {
            previewModal.classList.remove('active');
        }
        if (e.target === mediaViewerModal) {
            const container = document.getElementById('mediaViewerContainer');
            const video = container.querySelector('video');
            if (video) video.pause();
            mediaViewerModal.classList.remove('active');
        }
    });
}
