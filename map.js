// Replace with your actual OpenWeather API Key
const API_KEY = "e26b22aca359183e9666ee3e386b6b36";

// Initialize the Map
var map = L.map("map", {
    center: [20, 0], // Initial center position (latitude, longitude)
    zoom: 2,         // Initial zoom level
    minZoom: 2       // Minimum zoom level allowed
});
// Centered on the world

// Base Tile Layer (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Weather Layer (Temperature)
var weatherLayer = L.tileLayer(
    `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, 
    {
        attribution: "Weather data &copy; OpenWeatherMap",
        opacity: 0.5
    }
);
weatherLayer.addTo(map);

// Layer Control
var overlayMaps = {
    "Temperature": L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.5 }),
    "Clouds": L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.5 }),
    "Wind Speed": L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.5 }),
    "Pressure": L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.5 }),
};

L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
