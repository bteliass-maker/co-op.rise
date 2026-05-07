// State
let pendingCoords = null;
let currentCategory = 'prestar'; // default
let tempMarker = null; // To show where the point will be placed
const allMarkers = []; // Track all markers for content filtering

// Initialize the map
const map = L.map('map', {
    zoomControl: false,
    minZoom: 2
}).setView([20, 0], 3);

// Minimal white map
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO'
}).addTo(map);

// Add Geocoder (Optimized Search)
const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Buscar una dirección...",
    collapsed: false,
    geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            "accept-language": "es"
        }
    })
})
.on('markgeocode', function(e) {
    const bbox = e.geocode.bbox;
    const poly = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ]);
    map.fitBounds(poly.getBounds());
})
.addTo(map);

// Move geocoder to custom container
const geocoderContainer = geocoder.getContainer();
document.getElementById('search-container').appendChild(geocoderContainer);

// DYNAMIC IMAGE ANT ICON
function getAntIcon(category) {
    // Map categories to specific CSS filter classes
    let filterClass = 'ant-img-prestar';
    if (category === 'ayudar') filterClass = 'ant-img-ayudar';
    else if (category === 'movilizacion') filterClass = 'ant-img-movilizacion';

    return L.divIcon({
        html: `<img src="hormiga.png" class="ant-marker-img ${filterClass}" alt="ant">`,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
}

// CROSSHAIR ICON FOR PLACEMENT
const crosshairIcon = L.divIcon({
    className: 'crosshair-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Create Layer Groups for filtering
const layers = {
    prestar: L.layerGroup().addTo(map),
    ayudar: L.layerGroup().addTo(map),
    movilizacion: L.layerGroup().addTo(map)
};

// Custom Filter Checkboxes (replaces Leaflet control)
document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
        const cat = e.target.value;
        if (e.target.checked) {
            map.addLayer(layers[cat]);
        } else {
            map.removeLayer(layers[cat]);
        }
    });
});

// UI Elements
const modal = document.getElementById('info-modal');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Category UI
const categoryBtns = document.querySelectorAll('.category-btn');
const fieldsPrestar = document.getElementById('fields-prestar');
const fieldsAyudar = document.getElementById('fields-ayudar');
const fieldsGeneric = document.getElementById('fields-generic');

const inputPrestarDar = document.getElementById('prestar-dar');
const inputPrestarPedir = document.getElementById('prestar-pedir');
const inputAyudarDar = document.getElementById('ayudar-dar');
const inputAyudarPedir = document.getElementById('ayudar-pedir');
const inputGeneric = document.getElementById('generic-info');

// Handle Category Selection
categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class
        categoryBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        currentCategory = e.target.dataset.category;
        
        // Toggle view
        fieldsPrestar.classList.remove('active');
        fieldsAyudar.classList.remove('active');
        fieldsGeneric.classList.remove('active');
        
        if (currentCategory === 'prestar') {
            fieldsPrestar.classList.add('active');
        } else if (currentCategory === 'ayudar') {
            fieldsAyudar.classList.add('active');
        } else {
            fieldsGeneric.classList.add('active');
        }
    });
});

// Load existing markers
function loadMarkers() {
    const saved = localStorage.getItem('cooperise-markers');
    if (saved) {
        const markers = JSON.parse(saved);
        markers.forEach(m => addMarkerToMap(m.lat, m.lng, m.category, m.data));
    }
}

// Save marker
function saveMarkerToLocal(lat, lng, category, data) {
    const saved = localStorage.getItem('cooperise-markers');
    const markers = saved ? JSON.parse(saved) : [];
    markers.push({ lat, lng, category, data });
    localStorage.setItem('cooperise-markers', JSON.stringify(markers));
}

// Add marker UI
function addMarkerToMap(lat, lng, category, data) {
    // Determine target layer, fallback to map if missing
    const targetLayer = layers[category] || map;
    
    // Get corresponding icon
    const icon = getAntIcon(category);
    
    const marker = L.marker([lat, lng], { icon: icon }).addTo(targetLayer);
    
    let popupHtml = `<div class="popup-info" style="min-width: 200px;">
        <div style="font-weight:bold;text-transform:uppercase;font-size:0.7rem;color:#666;margin-bottom:8px;">
            Categoría: ${category}
        </div>`;
    
    if (category === 'prestar') {
        popupHtml += `
            <p><strong>Puedo prestar:</strong> ${data.dar || '-'}</p>
            <p style="margin-top:5px;"><strong>Necesito:</strong> ${data.pedir || '-'}</p>
        `;
    } else if (category === 'ayudar') {
        popupHtml += `
            <p><strong>Puedo ayudar en:</strong> ${data.dar || '-'}</p>
            <p style="margin-top:5px;"><strong>Necesito ayuda en:</strong> ${data.pedir || '-'}</p>
        `;
    } else {
        popupHtml += `<p>${data.info || '-'}</p>`;
    }
    
    popupHtml += `<button class="contact-btn" data-category="${category}">Contactar</button></div>`;
    
    marker.bindPopup(popupHtml, { className: 'custom-popup' });
    
    // Track marker for content search
    allMarkers.push({ marker, category, data });
}

// Event: Map Click
map.on('click', (e) => {
    pendingCoords = e.latlng;
    
    // Remove existing temp marker if any
    if (tempMarker) map.removeLayer(tempMarker);
    
    // Add temp crosshair marker
    tempMarker = L.marker(pendingCoords, { icon: crosshairIcon }).addTo(map);
    
    // Reset modal
    inputPrestarDar.value = '';
    inputPrestarPedir.value = '';
    inputAyudarDar.value = '';
    inputAyudarPedir.value = '';
    inputGeneric.value = '';
    document.querySelector('[data-category="prestar"]').click(); // Reset to default
    
    modal.style.display = 'flex';
});

// Event: Save Button
saveBtn.addEventListener('click', () => {
    if (!pendingCoords) return;
    
    let isValid = false;
    let dataToSave = {};
    
    if (currentCategory === 'prestar') {
        const dar = inputPrestarDar.value.trim();
        const pedir = inputPrestarPedir.value.trim();
        if (dar || pedir) {
            dataToSave = { dar, pedir };
            isValid = true;
        }
    } else if (currentCategory === 'ayudar') {
        const dar = inputAyudarDar.value.trim();
        const pedir = inputAyudarPedir.value.trim();
        if (dar || pedir) {
            dataToSave = { dar, pedir };
            isValid = true;
        }
    } else {
        const info = inputGeneric.value.trim();
        if (info) {
            dataToSave = { info };
            isValid = true;
        }
    }
    
    if (isValid) {
        addMarkerToMap(pendingCoords.lat, pendingCoords.lng, currentCategory, dataToSave);
        saveMarkerToLocal(pendingCoords.lat, pendingCoords.lng, currentCategory, dataToSave);
        
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = null;
        
        modal.style.display = 'none';
        pendingCoords = null;
    } else {
        alert('Por favor, completa al menos un campo para continuar.');
    }
});

// Event: Cancel Button
cancelBtn.addEventListener('click', () => {
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = null;
    modal.style.display = 'none';
    pendingCoords = null;
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = null;
        modal.style.display = 'none';
        pendingCoords = null;
    }
});

// --- Chat Functionality ---
const chatSidebar = document.getElementById('chat-sidebar');
const closeChatBtn = document.getElementById('close-chat');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

let currentChatContext = "General";

// Load chat messages
function loadChatMessages() {
    chatMessagesContainer.innerHTML = '';
    const saved = localStorage.getItem('cooperise-chat');
    if (saved) {
        const messages = JSON.parse(saved);
        messages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = 'chat-message';
            msgEl.innerHTML = `<div class="meta">${msg.context} - ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                               <div>${msg.text}</div>`;
            chatMessagesContainer.appendChild(msgEl);
        });
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
}

// Save and append chat message
function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    const saved = localStorage.getItem('cooperise-chat');
    const messages = saved ? JSON.parse(saved) : [];
    
    messages.push({
        context: currentChatContext,
        text: text,
        timestamp: new Date().getTime()
    });
    
    localStorage.setItem('cooperise-chat', JSON.stringify(messages));
    chatInput.value = '';
    loadChatMessages();
}

// Chat UI Events
toggleChatBtn.addEventListener('click', () => {
    currentChatContext = "General";
    chatSidebar.classList.add('active');
    loadChatMessages();
});

closeChatBtn.addEventListener('click', () => {
    chatSidebar.classList.remove('active');
});

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// Event Delegation for "Contactar" buttons in popups
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('contact-btn')) {
        const category = e.target.getAttribute('data-category');
        currentChatContext = `Interesado en punto: ${category}`;
        chatSidebar.classList.add('active');
        loadChatMessages();
        chatInput.focus();
    }
});

// --- Content Search ---
const contentSearchInput = document.getElementById('content-search');
contentSearchInput.addEventListener('input', () => {
    const query = contentSearchInput.value.trim().toLowerCase();
    
    allMarkers.forEach(({ marker, category, data }) => {
        // Build a searchable string from all data fields
        let text = category;
        if (data.dar) text += ' ' + data.dar;
        if (data.pedir) text += ' ' + data.pedir;
        if (data.info) text += ' ' + data.info;
        text = text.toLowerCase();
        
        if (!query || text.includes(query)) {
            marker.setOpacity(1);
        } else {
            marker.setOpacity(0);
            marker.closePopup();
        }
    });
});

// Initialize
loadMarkers();
loadChatMessages();
