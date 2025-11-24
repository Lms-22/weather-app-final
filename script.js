// =========================================================
// [1] 설정 및 상태 관리
// =========================================================

// 👇 여기에 본인의 API Key를 넣어주세요.
const API_KEY = "내_API_KEY_를_여기에_넣으세요"; 

const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const currentUnit = "metric"; // 섭씨

// =========================================================
// [2] 이벤트 리스너
// =========================================================

if (searchBtn) {
    searchBtn.addEventListener("click", handleSearch);
}

if (cityInput) {
    cityInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") handleSearch();
    });
}

// =========================================================
// [3] 핵심 로직: 지명 검색(Geocoding) -> 날씨 조회
// =========================================================

async function handleSearch() {
    const inputCity = cityInput.value.trim();
    if (!inputCity) {
        alert("도시 이름을 입력해주세요.");
        return;
    }

    // 1단계: Geocoding API로 도시 이름(한글/영어 상관없음)을 '좌표(위도, 경도)'로 변환
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${inputCity}&limit=1&appid=${API_KEY}`;

    try {
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        // 검색 결과가 없는 경우
        if (geoData.length === 0) {
            alert(`'${inputCity}' 도시를 찾을 수 없습니다. 올바른 도시 이름을 입력해주세요.`);
            return;
        }

        // 가장 정확한 검색 결과의 위도(lat), 경도(lon), 영문 도시명(name) 가져오기
        const { lat, lon, name, country } = geoData[0];
        console.log(`위치 확인: ${name} (${country}) / 위도:${lat}, 경도:${lon}`);

        // 2단계: 찾은 좌표로 현재 날씨와 예보 가져오기
        getWeatherByCoords(lat, lon, name);

    } catch (error) {
        console.error(error);
        alert("도시 위치를 검색하는 중 오류가 발생했습니다.");
    }
}

async function getWeatherByCoords(lat, lon, cityName) {
    // 현재 날씨 API URL (좌표 기준)
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}&lang=kr`;
    // 5일 예보 API URL (좌표 기준)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}&lang=kr`;

    try {
        // 두 개의 API를 동시에 호출 (속도 향상)
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) {
            throw new Error("날씨 정보를 가져오는 데 실패했습니다.");
        }

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        // 화면 업데이트 함수 호출
        displayCurrentWeather(weatherData, cityName);
        displayForecast(forecastData);

    } catch (error) {
        console.error(error);
        alert("날씨 정보를 불러오지 못했습니다.");
    }
}

// =========================================================
// [4] 화면 표시 (뷰)
// =========================================================

function displayCurrentWeather(data, cityName) {
    const container = document.querySelector("#current-weather");
    if (!container) return;

    // data.name은 마을 이름이 나올 수 있으므로, Geocoding에서 찾은 cityName(대표 도시명) 사용 권장
    const displayName = cityName || data.name;

    container.innerHTML = `
        <h2>${displayName}, ${data.sys.country}</h2>
        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}">
        <p style="font-size: 2.5rem; font-weight: bold; margin: 10px 0;">${data.main.temp.toFixed(1)}°C</p>
        <p style="font-size: 1.2rem;">${data.weather[0].description}</p>
        <div class="details" style="margin-top: 15px; color: #555;">
            <span>💧 습도: ${data.main.humidity}%</span>
            <span style="margin-left: 15px;">💨 풍속: ${data.wind.speed} m/s</span>
        </div>
    `;
}

function displayForecast(data) {
    const container = document.querySelector("#forecast-cards"); // HTML에 이 ID가 있어야 함
    if (!container) return;

    container.innerHTML = ""; // 기존 카드 비우기

    // API는 3시간 간격(하루 8개) 데이터를 주므로, 8개씩 건너뛰며 5일치 데이터 추출
    for (let i = 0; i < data.list.length; i += 8) {
        const dayData = data.list[i];
        const date = new Date(dayData.dt * 1000);
        const dayName = date.toLocaleDateString("ko-KR", { weekday: "short" }); // 요일 (월, 화...)

        const card = document.createElement("div");
        card.className = "forecast-card"; // CSS 스타일 클래스
        // 카드 스타일은 CSS 파일에서 꾸며주세요
        card.innerHTML = `
            <p style="font-weight: bold;">${dayName}</p>
            <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}.png" alt="${dayData.weather[0].description}">
            <p>${dayData.main.temp.toFixed(1)}°C</p>
        `;
        container.appendChild(card);
    }
}