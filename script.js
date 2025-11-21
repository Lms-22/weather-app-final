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
// ❗️❗️❗️ [2단계]에서 발급받은 본인의 API Key를 여기에 임시로 입력하세요.
// ❗️❗️❗️ (7단계 배포 시 이 부분을 수정하여 숨길 것입니다)
const API_KEY = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
let currentUnit = "metric"; // metric: 섭씨(℃), imperial: 화씨(℉)
let recentCities = JSON.parse(localStorage.getItem("recentCities")) || []; // [5단계] 
let lastSearchedCity = "";

// --- [3] 이벤트 리스너 ---
// 검색 버튼 클릭 시 
searchBtn.addEventListener("click", handleSearch);

// 엔터 키 입력 시 
cityInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        handleSearch();
    }
});

// 단위 변환 버튼 클릭 시 
unitToggleBtn.addEventListener("click", toggleUnit);

// 페이지 로드 시 최근 검색어 표시 
document.addEventListener("DOMContentLoaded", () => {
    displayRecentSearches();
    // 마지막으로 검색한 도시가 있다면 자동으로 로드
    if (recentCities.length > 0) {
        getWeather(recentCities[0]);
    }
});

// --- [4] 핵심 함수 (비즈니스 로직 / 뷰 / 오류 처리) ---

/** [3단계] 검색 처리 핸들러 */
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
        cityInput.value = "";
    } else {
        handleError(new Error("도시 이름을 입력해주세요."));
    }
}

/** [3단계] API 호출 (비즈니스 로직) [cite: 23, 39] */
async function getWeather(city) {
    const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
    const serverUrl = `./api/getWeather?city=${city}&unit=${currentUnit}`;

    try {
        const res = await fetch(serverUrl); // fetch 호출이 1개로 줄어듦
        if (!res.ok) {
            throw new Error(`'${city}' 도시를 찾을 수 없거나 API 오류가 발생했습니다.`);
        }
        
        const { currentData, forecastData } = await res.json(); // 서버에서 2개 데이터를 모두 받아옴
        // [4단계] 데이터가 성공적으로 오면 UI 업데이트
        displayWeather(currentData, forecastData, unitSymbol);
        // [5단계] 성공 시 오류 메시지 숨김
        handleError(null); 
        // [5단계] 최근 검색어 저장
        saveRecentSearch(city);
        lastSearchedCity = city; // 단위 변환을 위해 마지막 도시 저장

    } catch (error) {
        // [5단계] API 호출 실패 시
        handleError(error);
    }
}

/** [4단계] DOM 업데이트 (뷰) [cite: 24, 39] */
function displayWeather(current, forecast, unitSymbol) {
    // 1. 현재 날씨 표시
    currentWeatherSection.innerHTML = `
        <h2>${current.name}</h2>
        <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" alt="${current.weather[0].description}">
        <p class="temp">${current.main.temp.toFixed(1)}${unitSymbol}</p>
        <p class="desc">${current.weather[0].description}</p>
        <div class="details">
            <span>습도: ${current.main.humidity}%</span>
            <span>풍속: ${current.wind.speed} m/s</span>
        </div>
    `;

    // 2. 5일 예보 표시 (반복문) 
    forecastCardsContainer.innerHTML = ""; // 기존 카드 초기화
    
    // API는 3시간 간격 데이터를 주므로, 24시간(8칸)씩 건너뛰어 5일치 데이터를 추출
    for (let i = 0; i < forecast.list.length; i += 8) {
        const dayData = forecast.list[i];
        const date = new Date(dayData.dt * 1000);
        
        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p>${date.toLocaleDateString("ko-KR", { weekday: 'short' })}</p>
            <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}.png" alt="${dayData.weather[0].description}">
            <p>${dayData.main.temp.toFixed(1)}${unitSymbol}</p>
        `;
        forecastCardsContainer.appendChild(card);
    }
    
    // [5단계] 시각적 변화 (날씨 기반 배경) 
    updateBackground(current.weather[0].main);
}

/** [5단계] 오류 처리 [cite: 28, 39] */
function handleError(error) {
    if (error) {
        console.error(error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = "block";
        // 오류 발생 시 기존 날씨 정보 숨김 (선택 사항)
        // currentWeatherSection.innerHTML = "";
        // forecastCardsContainer.innerHTML = "";
    } else {
        errorMessage.textContent = "";
        errorMessage.style.display = "none";
    }
}

/** [5단계] 단위 변환  */
function toggleUnit() {
    currentUnit = currentUnit === "metric" ? "imperial" : "metric";
    // 마지막으로 검색했던 도시의 날씨를 다시 불러오기
    if (lastSearchedCity) {
        getWeather(lastSearchedCity);
    }
}

/** [5단계] 최근 검색어 저장 (localStorage)  */
function saveRecentSearch(city) {
    const upperCity = city.toUpperCase();
    // 중복 제거
    recentCities = recentCities.filter(c => c.toUpperCase() !== upperCity);
    // 맨 앞에 추가
    recentCities.unshift(city);
    // 최대 5개 제한
    if (recentCities.length > 5) {
        recentCities.pop();
    }
    // localStorage에 저장
    localStorage.setItem("recentCities", JSON.stringify(recentCities));
    
    displayRecentSearches();
}

/** [5단계] 최근 검색어 버튼 표시  */
function displayRecentSearches() {
    recentSearchesContainer.innerHTML = "";
    recentCities.forEach(city => {
        const btn = document.createElement("button");
        btn.className = "recent-city-btn";
        btn.textContent = city;
        // 최근 검색어 버튼 클릭 시 해당 도시 날씨 검색
        btn.addEventListener("click", () => {
            getWeather(city);
        });
        recentSearchesContainer.appendChild(btn);
    });
}

/** [5단계] 시각적 변화 (배경)  */
function updateBackground(weatherMain) {
    // 기존 클래스 모두 제거
    appContainer.classList.remove("clear", "clouds", "rain", "snow", "mist");
    
    const weather = weatherMain.toLowerCase();
    if (weather.includes("clear")) {
        appContainer.classList.add("clear");
    } else if (weather.includes("clouds")) {
        appContainer.classList.add("clouds");
    } else if (weather.includes("rain") || weather.includes("drizzle")) {
        appContainer.classList.add("rain");
    } else if (weather.includes("snow")) {
        appContainer.classList.add("snow");
    } else if (weather.includes("mist") || weather.includes("fog")) {
        appContainer.classList.add("mist");
    }
}

// --- [3] 이벤트 리스너 섹션에 추가 ---
const currentLocationBtn = document.querySelector("#current-location-btn");

currentLocationBtn.addEventListener("click", () => {
    // Geolocation API 사용
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            getWeatherByCoords(latitude, longitude);
        },
        (error) => {
            // 위치 정보를 가져오지 못했을 때 오류 처리
            handleError(new Error("현재 위치를 가져올 수 없습니다."));
            console.error(error);
        }
    );
});


// --- [4] 핵심 함수 섹션에 추가 ---

/** [6단계] 확장 기능: 좌표로 날씨 가져오기 */
async function getWeatherByCoords(lat, lon) {
    const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
    const serverUrl = `./api/getWeather?lat=${lat}&lon=${lon}&unit=${currentUnit}`;

    try {
        const res = await fetch(serverUrl); // fetch 호출이 1개로 줄어듦
        if (!res.ok) {
            throw new Error("현재 위치의 날씨 정보를 가져오는 데 실패했습니다.");
        }

        const { currentData, forecastData } = await res.json();

        displayWeather(currentData, forecastData, unitSymbol);
        handleError(null);
        
        // 현재 위치로 찾은 도시 이름도 최근 검색어에 저장
        saveRecentSearch(currentData.name); 
        lastSearchedCity = currentData.name;

    } catch (error) {
        handleError(error);
    }
}
