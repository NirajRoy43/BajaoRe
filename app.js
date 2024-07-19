const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const results = document.getElementById('results');
const player = document.getElementById('player');

let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const signalingServer = new WebSocket('wss://your-signaling-server-url');

signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    switch (data.type) {
        case 'offer':
            await handleOffer(data.offer);
            break;
        case 'answer':
            await handleAnswer(data.answer);
            break;
        case 'candidate':
            await handleCandidate(data.candidate);
            break;
        case 'play':
            playVideo(data.videoId, data.timestamp);
            break;
    }
};

searchBtn.addEventListener('click', () => {
    const query = searchInput.value;
    searchYouTube(query);
});

function searchYouTube(query) {
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${query}&key=YOUR_API_KEY`)
        .then(response => response.json())
        .then(data => {
            results.innerHTML = '';
            data.items.forEach(item => {
                const videoId = item.id.videoId;
                const title = item.snippet.title;
                const thumbnail = item.snippet.thumbnails.default.url;
                const resultItem = document.createElement('div');
                resultItem.innerHTML = `
                    <img src="${thumbnail}" alt="${title}">
                    <p>${title}</p>
                    <button onclick="playVideo('${videoId}', ${Date.now()})">Play</button>
                `;
                results.appendChild(resultItem);
            });
        });
}

function playVideo(videoId, timestamp) {
    player.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=${(Date.now() - timestamp) / 1000}`;
    player.style.display = 'block';
    sendMessage({ type: 'play', videoId, timestamp });
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            sendMessage({ type: 'candidate', candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendMessage({ type: 'offer', offer });
}

async function handleOffer(offer) {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            sendMessage({ type: 'candidate', candidate });
        }
    };
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendMessage({ type: 'answer', answer });
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function sendMessage(message) {
    signalingServer.send(JSON.stringify(message));
}

createPeerConnection();