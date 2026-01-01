// -------------------------------
// 1. Map Initialization at Oroquieta City
// -------------------------------
const oroquietaCoords = [8.5920, 123.8420];

var map = L.map('map', { zoomControl: false }).setView(oroquietaCoords, 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// -------------------------------
// 2. User Marker
// -------------------------------
var userMarker = L.marker(oroquietaCoords)
    .addTo(map)
    .bindTooltip("You are here", { permanent: true, direction: "top" })
    .openTooltip();

// Update marker if geolocation is available
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            userMarker.setLatLng([lat, lng]);
            map.setView([lat, lng], 15); // zoom closer to user
        },
        function(err) {
            console.warn("Geolocation not available or denied:", err);
        },
        { enableHighAccuracy: true }
    );
}

// -------------------------------
// 3. Dropdown Toggle (Burger Menu)
// -------------------------------
const burger = document.getElementById('burger');
const dropdown = document.getElementById('dropdown');

burger.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
});

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// -------------------------------
// 4. Example Notifications
// -------------------------------
const notifications = [
    { title: "Fire Alert", message: "A fire was reported near Oroquieta City." },
    { title: "Safety Tip", message: "Always keep a fire extinguisher at home." }
];

const container = document.getElementById('notification-container');

notifications.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'notification';
    div.innerHTML = `<h4>${note.title}</h4><p>${note.message}</p>`;
    container.appendChild(div);

    // Auto-remove after delay
    setTimeout(() => div.remove(), 5000 + index * 1000);
});
