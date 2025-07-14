const API_KEY = "e26b22aca359183e9666ee3e386b6b36"; // OpenWeatherMap API Key

document.addEventListener("DOMContentLoaded", () => {
    const cityInput = document.getElementById("city-input");
    const searchBtn = document.getElementById("search-btn");
    const currentLocationBtn = document.getElementById("current-location-btn");
    const predictTempBtn = document.getElementById("predict-temp-btn");

    searchBtn.addEventListener("click", () => {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherByCity(city);
        } else {
            displayError("Please enter a city name!");
        }
    });

    currentLocationBtn.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    getWeatherByCoords(latitude, longitude);
                },
                () => {
                    displayError("Unable to retrieve location. Please enable location services.");
                }
            );
        } else {
            displayError("Geolocation is not supported by this browser.");
        }
    });

    predictTempBtn.addEventListener("click", () => {
        const city = document.getElementById("location").textContent;
        const lat = predictTempBtn.getAttribute("data-lat");
        const lon = predictTempBtn.getAttribute("data-lon");

        if (city !== "Loading..." || (lat && lon)) {
            fetchPrediction(city, lat, lon);
        } else {
            displayError("Please search for a city first.");
        }
    });
});

/* Fetch weather by city name */
function getWeatherByCity(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
    fetchWeather(url);
}

/* Fetch weather by coordinates */
function getWeatherByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    fetchWeather(url, lat, lon);
}

/* Fetch weather data and update UI */
function fetchWeather(url, lat = null, lon = null) {
    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            if (data.cod !== 200) {
                displayError("City not found! Please enter a valid city name.");
                return;
            }
            updateWeatherUI(data, lat, lon);
        })
        .catch(() => displayError("Error fetching weather data. Please try again."));
}

/* Update UI with weather data */
function updateWeatherUI(data, lat, lon) {
    document.querySelector(".weather-info").innerHTML = `
        <h2 id="location">${data.name}, ${data.sys.country}</h2>
        <h1 class="temp">
            <span class="material-symbols-outlined">thermometer</span> ${Math.round(data.main.temp)}°C
        </h1>
        <p class="description">${data.weather[0].description}</p>

        <p class="feels-like">
            <span class="material-symbols-outlined">thermometer</span> Feels Like: ${Math.round(data.main.feels_like)}°C
        </p>
        <p class="temp-min">
            <span class="material-symbols-outlined">thermometer_add</span> Min Temp: ${Math.round(data.main.temp_min)}°C
        </p>
        <p class="temp-max">
            <span class="material-symbols-outlined">thermometer_minus</span> Max Temp: ${Math.round(data.main.temp_max)}°C
        </p>

        <p class="humidity">
            <span class="material-symbols-outlined">humidity_mid</span> Humidity: ${data.main.humidity}%
        </p>
        <p class="wind">
            <span class="material-symbols-outlined">air</span> Wind Speed: ${data.wind.speed} m/s
        </p>
        <p class="sea-level">
            <span class="material-symbols-outlined">tsunami</span> Sea Level: ${data.main.sea_level ? data.main.sea_level + " hPa" : "N/A"}
        </p>
        <p class="clouds">
            <span class="material-symbols-outlined">foggy</span> Clouds: ${data.clouds.all}%
        </p>

        <p class="sunrise">
            <span class="material-symbols-outlined">wb_sunny</span> Sunrise: ${convertTimestamp(data.sys.sunrise)}
        </p>
        <p class="sunset">
            <span class="material-symbols-outlined">wb_twilight</span> Sunset: ${convertTimestamp(data.sys.sunset)}
        </p>
    `;

    document.getElementById("predict-temp-btn").style.display = "block";
    document.getElementById("predict-temp-btn").setAttribute("data-lat", lat || data.coord.lat);
    document.getElementById("predict-temp-btn").setAttribute("data-lon", lon || data.coord.lon);
}

/* Fetch temperature prediction from the backend */
function fetchPrediction(city, lat, lon) {
    document.getElementById("prediction-results").innerHTML = "Fetching predictions...";

    fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, lat, lon })  // Send either city OR lat/lon
    })
    .then(response => response.json())
    .then(data => {
        let output = "<h3>Future Temperature Predictions:</h3>";
        data.predictions.forEach(pred => {
            output += `<p>${pred.date}: ${pred.temp}°C</p>`;
        });
        document.getElementById("prediction-results").innerHTML = output;
    })
    .catch(() => {
        document.getElementById("prediction-results").innerHTML = "Error fetching predictions.";
    });
}

/* Convert UNIX timestamp to readable time */
function convertTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* Display an error message */
function displayError(message) {
    document.querySelector(".weather-info").innerHTML = `
        <h1 style="font-size: 6rem; margin-top:20px; text-align: center;">(>_<)</h1>
        <p style="text-align: center;margin-top:5px; font-size: 2rem; color: white;">${message}</p>
    `;
}
