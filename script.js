// --- [1] DOM 요소 ---
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const unitToggleBtn = document.querySelector("#unit-toggle");
const recentSearchesContainer = document.querySelector("#recent-searches");
const errorMessage = document.querySelector("#error-message");
const currentWeatherSection = document.querySelector("#current-weather");
const forecastCardsContainer = document.querySelector("#forecast-cards");
const appContainer = document.querySelector(".weather-app");
const fashionAdviceElement = document.querySelector("#fashion-advice");

let myChart = null; // 차트 객체 저장 변수 (중복 생성 방지)
let currentUnit = "metric";
let recentCities = JSON.parse(localStorage.getItem("recentCities")) || []; 
let lastSearchedCity = "";

// --- [2] 이벤트 리스너 ---
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keyup", (e) => { if (e.key === "Enter") handleSearch(); });
unitToggleBtn.addEventListener("click", toggleUnit);

const currentLocationBtn = document.querySelector("#current-location-btn");
if (currentLocationBtn) {
    currentLocationBtn.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => handleError(new Error("위치 정보를 가져올 수 없습니다."))
        );
    });
}

document.addEventListener("DOMContentLoaded", () => {
    displayRecentSearches();
    if (recentCities.length > 0) handleSearch(null, recentCities[0]);
});

// --- [3] 핵심 로직 ---

function handleSearch(e, manualCity = null) {
    const city = manualCity || cityInput.value.trim();
    if (!city) {
        if(!manualCity) handleError(new Error("도시 이름을 입력해주세요."));
        return;
    }
    fetchWeather({ city: city });
    if (!manualCity) cityInput.value = "";
}

async function fetchWeather(params) {
    let url = `./api/getWeather?unit=${currentUnit}`;
    if (params.city) url += `&city=${encodeURIComponent(params.city)}`;
    else url += `&lat=${params.lat}&lon=${params.lon}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "통신 오류");

        const { currentData, forecastData, airData } = data; // airData(미세먼지) 추가됨

        displayWeather(currentData, forecastData, airData);
        renderChart(forecastData); // 📊 그래프 그리기
        provideLifeTips(currentData, airData); // 👕 옷차림 추천
        
        handleError(null);
        if (currentData.name) {
            saveRecentSearch(currentData.name);
            lastSearchedCity = currentData.name;
        }
    } catch (error) {
        handleError(error);
    }
}

// --- [4] 화면 표시 ---

function displayWeather(current, forecast, air) {
    const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
    
    // 미세먼지 등급 변환 (1:좋음 ~ 5:매우나쁨)
    const aqi = air.list[0].main.aqi;
    const aqiText = ["", "🔵 좋음", "🟢 보통", "🟡 나쁨", "🟠 매우 나쁨", "🔴 최악"][aqi] || "정보 없음";

    currentWeatherSection.innerHTML = `
        <h2>${current.name}, ${current.sys.country}</h2>
        <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="날씨 아이콘" style="background: rgba(255,255,255,0.3); border-radius: 50%;">
        <p style="font-size: 3rem; font-weight: bold; margin: 10px 0;">${current.main.temp.toFixed(1)}${unitSymbol}</p>
        <p style="font-size: 1.2rem;">${current.weather[0].description}</p>
        <div class="details" style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <div>💧 습도<br><b>${current.main.humidity}%</b></div>
            <div>💨 풍속<br><b>${current.wind.speed} m/s</b></div>
            <div>😷 공기질<br><b>${aqiText}</b></div>
        </div>
    `;

    // 예보 카드 (기존 동일)
    forecastCardsContainer.innerHTML = "";
    for (let i = 0; i < forecast.list.length; i += 8) {
        const day = forecast.list[i];
        const date = new Date(day.dt * 1000);
        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p>${date.toLocaleDateString("ko-KR", { weekday: 'short' })}</p>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
            <p>${day.main.temp.toFixed(1)}${unitSymbol}</p>
        `;
        forecastCardsContainer.appendChild(card);
    }
    updateBackground(current.weather[0].main);
}

// 👕 [확장 기능] 옷차림 & 여행 팁 추천 로직
function provideLifeTips(current, air) {
    const temp = current.main.temp; // 온도
    const weather = current.weather[0].main.toLowerCase(); // 날씨 상태
    const aqi = air.list[0].main.aqi; // 미세먼지 (1~5)

    let advice = "";

    // 1. 기온별 옷차림 (metric 기준)
    if (currentUnit === "metric") {
        if (temp >= 28) advice = "매우 더워요! 🎽 민소매나 반팔, 반바지가 필수입니다.";
        else if (temp >= 23) advice = "조금 덥네요. 👕 얇은 셔츠나 반팔, 면바지를 추천해요.";
        else if (temp >= 20) advice = "활동하기 좋은 날씨! 👚 긴팔 티나 얇은 가디건이 좋겠어요.";
        else if (temp >= 17) advice = "약간 서늘해요. 🧥 니트나 얇은 재킷을 챙기세요.";
        else if (temp >= 12) advice = "쌀쌀합니다. 🧥 자켓, 야상, 스타킹이 필요해요.";
        else if (temp >= 9) advice = "춥습니다. 🧥 코트나 가죽 자켓을 입으세요.";
        else if (temp >= 5) advice = "겨울 날씨! 🧣 두꺼운 코트와 히트텍을 추천합니다.";
        else advice = "너무 추워요! 🧤 롱패딩, 목도리, 장갑으로 완전 무장하세요!";
    } else {
        advice = "오늘 날씨에 맞는 편안한 옷차림을 추천합니다!";
    }

    // 2. 날씨 상태별 팁 (비/눈)
    if (weather.includes("rain")) advice += " ☔ 우산 챙기는 것 잊지 마세요!";
    if (weather.includes("snow")) advice += " ☃️ 눈길 조심하세요!";

    // 3. 미세먼지 경고
    if (aqi >= 4) advice += " 😷 미세먼지가 심해요. 마스크를 꼭 쓰세요!";

    fashionAdviceElement.textContent = advice;
}

// 📊 [확장 기능] Chart.js 그래프 그리기
function renderChart(forecast) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    
    // 기존 차트가 있으면 삭제 (안 하면 겹쳐서 보임)
    if (myChart) myChart.destroy();

    // 24시간(8개) 데이터만 추출
    const labels = [];
    const temps = [];
    
    for (let i = 0; i < 8; i++) {
        const item = forecast.list[i];
        const date = new Date(item.dt * 1000);
        labels.push(`${date.getHours()}시`);
        temps.push(item.main.temp);
    }

    myChart = new Chart(ctx, {
        type: 'line', // 꺾은선 그래프
        data: {
            labels: labels,
            datasets: [{
                label: `온도 (${currentUnit === 'metric' ? '°C' : '°F'})`,
                data: temps,
                borderColor: '#007bff', // 선 색상
                backgroundColor: 'rgba(0, 123, 255, 0.1)', // 채우기 색상
                borderWidth: 2,
                tension: 0.3, // 곡선 부드럽게
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }, // 범례 숨김
            scales: { y: { beginAtZero: false } } // 온도 변화 폭을 잘 보여주기 위해
        }
    });
}

// --- [5] 유틸리티 ---
function handleError(error) {
    errorMessage.textContent = error ? error.message : "";
    errorMessage.style.display = error ? "block" : "none";
}
function toggleUnit() {
    currentUnit = currentUnit === "metric" ? "imperial" : "metric";
    if (lastSearchedCity) fetchWeather({ city: lastSearchedCity });
}
function saveRecentSearch(city) {
    recentCities = recentCities.filter(c => c.toUpperCase() !== city.toUpperCase());
    recentCities.unshift(city);
    if (recentCities.length > 5) recentCities.pop();
    localStorage.setItem("recentCities", JSON.stringify(recentCities));
    displayRecentSearches();
}
function displayRecentSearches() {
    recentSearchesContainer.innerHTML = "";
    recentCities.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "recent-city-btn";
        btn.textContent = c;
        btn.onclick = () => fetchWeather({ city: c });
        recentSearchesContainer.appendChild(btn);
    });
}
function updateBackground(main) {
    appContainer.classList.remove("clear", "clouds", "rain", "snow", "mist");
    const w = main.toLowerCase();
    if (w.includes("clear")) appContainer.classList.add("clear");
    else if (w.includes("clouds")) appContainer.classList.add("clouds");
    else if (w.includes("rain") || w.includes("drizzle")) appContainer.classList.add("rain");
    else if (w.includes("snow")) appContainer.classList.add("snow");
    else if (w.includes("mist")) appContainer.classList.add("mist");
}