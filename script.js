// --- [1] DOM 요소 연결 ---
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const unitToggleBtn = document.querySelector("#unit-toggle");
const recentSearchesContainer = document.querySelector("#recent-searches");
const errorMessage = document.querySelector("#error-message");
const currentWeatherSection = document.querySelector("#current-weather");
const forecastCardsContainer = document.querySelector("#forecast-cards");
const appContainer = document.querySelector(".weather-app");

// --- [2] 상태 관리 ---
// ✨ 이제 여기에 API Key가 없습니다! (보안 완벽)
let currentUnit = "metric";
let recentCities = JSON.parse(localStorage.getItem("recentCities")) || []; 
let lastSearchedCity = "";

// --- [3] 이벤트 리스너 ---
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSearch();
});
unitToggleBtn.addEventListener("click", toggleUnit);

// 현재 위치 버튼
const currentLocationBtn = document.querySelector("#current-location-btn");
if (currentLocationBtn) {
    currentLocationBtn.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // 좌표를 보내면 서버가 알아서 처리
                fetchWeather({ lat: latitude, lon: longitude });
            },
            (error) => {
                handleError(new Error("현재 위치를 가져올 수 없습니다."));
            }
        );
    });
}

// 초기 로드
document.addEventListener("DOMContentLoaded", () => {
    displayRecentSearches();
    if (recentCities.length > 0) {
        handleSearch(null, recentCities[0]);
    }
});

// --- [4] 핵심 함수 ---

/** 통합 검색 핸들러 */
function handleSearch(e, manualCity = null) {
    const city = manualCity || cityInput.value.trim();
    if (!city) {
        if(!manualCity) handleError(new Error("도시 이름을 입력해주세요."));
        return;
    }
    // 도시 이름을 보내면 서버가 Geocoding까지 다 해서 줌
    fetchWeather({ city: city });
    if (!manualCity) cityInput.value = "";
}

/** 서버에 날씨 데이터 요청 (키 없이 호출!) */
async function fetchWeather(params) {
    const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
    let url = `./api/getWeather?unit=${currentUnit}`;
    
    // 파라미터 조립 (도시 이름 또는 좌표)
    if (params.city) url += `&city=${encodeURIComponent(params.city)}`;
    else if (params.lat && params.lon) url += `&lat=${params.lat}&lon=${params.lon}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "날씨 정보를 가져오는 데 실패했습니다.");
        }

        const { currentData, forecastData } = data;

        // 화면 표시
        displayWeather(currentData, forecastData, unitSymbol);
        handleError(null);
        
        // 최근 검색어 저장
        if (currentData.name) {
            saveRecentSearch(currentData.name);
            lastSearchedCity = currentData.name;
        }

    } catch (error) {
        handleError(error);
    }
}

// --- [5] 화면 표시 및 유틸리티 (기존과 동일) ---

function displayWeather(current, forecast, unitSymbol) {
    currentWeatherSection.innerHTML = `
        <h2>${current.name}, ${current.sys.country}</h2>
        <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="${current.weather[0].description}">
        <p class="temp" style="font-size: 2.5rem; font-weight: bold;">${current.main.temp.toFixed(1)}${unitSymbol}</p>
        <p class="desc">${current.weather[0].description}</p>
        <div class="details">
            <span>습도: ${current.main.humidity}%</span>
            <span>풍속: ${current.wind.speed} m/s</span>
        </div>
    `;

    forecastCardsContainer.innerHTML = "";
    for (let i = 0; i < forecast.list.length; i += 8) {
        const dayData = forecast.list[i];
        const date = new Date(dayData.dt * 1000);
        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p>${date.toLocaleDateString("ko-KR", { weekday: 'short' })}</p>
            <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@4x.png" alt="${dayData.weather[0].description}">
            <p>${dayData.main.temp.toFixed(1)}${unitSymbol}</p>
        `;
        forecastCardsContainer.appendChild(card);
    }
    updateBackground(current.weather[0].main);
}

function handleError(error) {
    if (error) {
        console.error(error);
        if(errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = "block";
        }
    } else {
        if(errorMessage) errorMessage.style.display = "none";
    }
}

function toggleUnit() {
    currentUnit = currentUnit === "metric" ? "imperial" : "metric";
    if (lastSearchedCity) {
        // 마지막 검색어로 다시 서버 요청
        fetchWeather({ city: lastSearchedCity });
    }
}

function saveRecentSearch(city) {
    const upperCity = city.toUpperCase();
    recentCities = recentCities.filter(c => c.toUpperCase() !== upperCity);
    recentCities.unshift(city);
    if (recentCities.length > 5) recentCities.pop();
    localStorage.setItem("recentCities", JSON.stringify(recentCities));
    displayRecentSearches();
}

function displayRecentSearches() {
    recentSearchesContainer.innerHTML = "";
    recentCities.forEach(city => {
        const btn = document.createElement("button");
        btn.className = "recent-city-btn";
        btn.textContent = city;
        btn.addEventListener("click", () => fetchWeather({ city: city }));
        recentSearchesContainer.appendChild(btn);
    });
}

function updateBackground(weatherMain) {
    appContainer.classList.remove("clear", "clouds", "rain", "snow", "mist");
    const weather = weatherMain.toLowerCase();
    if (weather.includes("clear")) appContainer.classList.add("clear");
    else if (weather.includes("clouds")) appContainer.classList.add("clouds");
    else if (weather.includes("rain") || weather.includes("drizzle")) appContainer.classList.add("rain");
    else if (weather.includes("snow")) appContainer.classList.add("snow");
    else if (weather.includes("mist") || weather.includes("fog")) appContainer.classList.add("mist");
}