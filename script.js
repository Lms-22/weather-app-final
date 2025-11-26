// --- [1] DOM 요소 ---
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const unitToggleBtn = document.querySelector("#unit-toggle");
const langSelect = document.querySelector("#lang-select"); // 버튼 대신 셀렉트 박스
const recentSearchesContainer = document.querySelector("#recent-searches");
const errorMessage = document.querySelector("#error-message");
const currentWeatherSection = document.querySelector("#current-weather");
const forecastCardsContainer = document.querySelector("#forecast-cards");
const appContainer = document.querySelector(".weather-app");
const fashionAdviceElement = document.querySelector("#fashion-advice");

let myChart = null;
let currentUnit = "metric";
let currentLang = "kr"; // 기본 언어
let recentCities = JSON.parse(localStorage.getItem("recentCities")) || []; 
let lastSearchedCity = "";

// 🌐 다국어 번역 데이터 (사전)
const translations = {
    kr: {
        code: "kr", // OpenWeatherMap API용 언어 코드
        title: "☁️ 날씨 예보",
        placeholder: "도시 이름 검색 (예: 서울, Tokyo)",
        currentLoc: "📍 현재 위치로 찾기",
        tipsTitle: "💡 오늘의 팁",
        chartTitle: "📉 24시간 기온 변화",
        forecastTitle: "5일간의 예보",
        humidity: "습도",
        wind: "풍속",
        airQuality: "공기질",
        errorEmpty: "도시 이름을 입력해주세요.",
        errorLoc: "위치 정보를 가져올 수 없습니다.",
        loading: "데이터 로딩 중...",
        airLevels: ["", "🔵 좋음", "🟢 보통", "🟡 나쁨", "🟠 매우 나쁨", "🔴 최악"]
    },
    en: {
        code: "en",
        title: "☁️ Weather Forecast",
        placeholder: "Search City (e.g., Seoul, Tokyo)",
        currentLoc: "📍 Use Current Location",
        tipsTitle: "💡 Daily Tips",
        chartTitle: "📉 24h Temperature",
        forecastTitle: "5-Day Forecast",
        humidity: "Humidity",
        wind: "Wind",
        airQuality: "Air Quality",
        errorEmpty: "Please enter a city name.",
        errorLoc: "Cannot retrieve location.",
        loading: "Loading data...",
        airLevels: ["", "🔵 Good", "🟢 Fair", "🟡 Moderate", "🟠 Poor", "🔴 Very Poor"]
    },
    jp: {
        code: "ja", // API 코드는 'ja'
        title: "☁️ 天気予報",
        placeholder: "都市名を入力 (例: Tokyo, Seoul)",
        currentLoc: "📍 現在地を使用",
        tipsTitle: "💡 今日のアドバイス",
        chartTitle: "📉 24時間気温変化",
        forecastTitle: "5日間の予報",
        humidity: "湿度",
        wind: "風速",
        airQuality: "大気質",
        errorEmpty: "都市名を入力してください。",
        errorLoc: "位置情報を取得できません。",
        loading: "読み込み中...",
        airLevels: ["", "🔵 良い", "🟢 普通", "🟡 悪い", "🟠 非常に悪い", "🔴 危険"]
    },
    cn: {
        code: "zh_cn", // API 코드는 'zh_cn'
        title: "☁️ 天气预报",
        placeholder: "输入城市名 (如: Beijing, Seoul)",
        currentLoc: "📍 使用当前位置",
        tipsTitle: "💡 今日贴士",
        chartTitle: "📉 24小时气温变化",
        forecastTitle: "未来5天预报",
        humidity: "湿度",
        wind: "风速",
        airQuality: "空气质量",
        errorEmpty: "请输入城市名称。",
        errorLoc: "无法获取位置信息。",
        loading: "加载中...",
        airLevels: ["", "🔵 优", "🟢 良", "🟡 轻度污染", "🟠 中度污染", "🔴 重度污染"]
    }
};

// --- [2] 이벤트 리스너 ---
searchBtn.addEventListener("click", () => handleSearch());
cityInput.addEventListener("keyup", (e) => { if (e.key === "Enter") handleSearch(); });
unitToggleBtn.addEventListener("click", toggleUnit);

// 언어 선택 변경 이벤트
langSelect.addEventListener("change", (e) => {
    currentLang = e.target.value; // 선택된 언어 값 (kr, en, jp, cn)
    updateUIText();
    if (lastSearchedCity) fetchWeather({ city: lastSearchedCity });
});

const currentLocationBtn = document.querySelector("#current-location-btn");
if (currentLocationBtn) {
    currentLocationBtn.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => handleError(new Error(translations[currentLang].errorLoc))
        );
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateUIText();
    displayRecentSearches();
    if (recentCities.length > 0) handleSearch(null, recentCities[0]);
});

// --- [3] 핵심 로직 ---

function handleSearch(e, manualCity = null) {
    const city = manualCity || cityInput.value.trim();
    if (!city) {
        if(!manualCity) handleError(new Error(translations[currentLang].errorEmpty));
        return;
    }
    fetchWeather({ city: city });
    if (!manualCity) cityInput.value = "";
}

async function fetchWeather(params) {
    // API에 보낼 때는 해당 언어의 'code'를 사용 (예: jp -> ja)
    const apiLangCode = translations[currentLang].code;
    let url = `./api/getWeather?unit=${currentUnit}&lang=${apiLangCode}`;
    
    if (params.city) url += `&city=${encodeURIComponent(params.city)}`;
    else url += `&lat=${params.lat}&lon=${params.lon}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error");

        const { currentData, forecastData, airData } = data;

        displayWeather(currentData, forecastData, airData);
        renderChart(forecastData);
        provideLifeTips(currentData, airData);
        
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
    const t = translations[currentLang];
    const unitSymbol = currentUnit === "metric" ? "°C" : "°F";
    
    const aqi = air.list[0].main.aqi;
    const aqiText = t.airLevels[aqi] || "-";

    currentWeatherSection.innerHTML = `
        <h2>${current.name}, ${current.sys.country}</h2>
        <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="icon" style="background: rgba(255,255,255,0.3); border-radius: 50%;">
        <p style="font-size: 3rem; font-weight: bold; margin: 10px 0;">${current.main.temp.toFixed(1)}${unitSymbol}</p>
        <p style="font-size: 1.2rem;">${current.weather[0].description}</p>
        <div class="details" style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <div>💧 ${t.humidity}<br><b>${current.main.humidity}%</b></div>
            <div>💨 ${t.wind}<br><b>${current.wind.speed} m/s</b></div>
            <div>😷 ${t.airQuality}<br><b>${aqiText}</b></div>
        </div>
    `;

    forecastCardsContainer.innerHTML = "";
    for (let i = 0; i < forecast.list.length; i += 8) {
        const day = forecast.list[i];
        const date = new Date(day.dt * 1000);
        
        // 날짜 로케일 설정
        let locale = 'ko-KR';
        if(currentLang === 'en') locale = 'en-US';
        if(currentLang === 'jp') locale = 'ja-JP';
        if(currentLang === 'cn') locale = 'zh-CN';

        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p>${date.toLocaleDateString(locale, { weekday: 'short' })}</p>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
            <p>${day.main.temp.toFixed(1)}${unitSymbol}</p>
        `;
        forecastCardsContainer.appendChild(card);
    }
    updateBackground(current.weather[0].main);
}

// 👕 4개 국어 지원 옷차림 팁
function provideLifeTips(current, air) {
    const temp = current.main.temp;
    const weather = current.weather[0].main.toLowerCase();
    const aqi = air.list[0].main.aqi;
    let advice = "";

    // 1. 한국어
    if (currentLang === 'kr') {
        if (currentUnit === "metric") {
            if (temp >= 28) advice = "매우 더워요! 🎽 민소매, 반바지 필수!";
            else if (temp >= 23) advice = "조금 덥네요. 👕 얇은 셔츠나 반팔 추천.";
            else if (temp >= 20) advice = "활동하기 좋아요! 👚 긴팔 티나 가디건.";
            else if (temp >= 17) advice = "약간 서늘해요. 🧥 니트나 얇은 재킷.";
            else if (temp >= 12) advice = "쌀쌀합니다. 🧥 자켓, 야상 챙기세요.";
            else if (temp >= 9) advice = "춥습니다. 🧥 코트 입으세요.";
            else if (temp >= 5) advice = "겨울 날씨! 🧣 두꺼운 코트, 히트텍.";
            else advice = "너무 추워요! 🧤 롱패딩으로 완전 무장하세요!";
        } else advice = "오늘 날씨에 맞는 옷을 입으세요!";
        if (weather.includes("rain")) advice += " ☔ 우산 잊지 마세요!";
        if (weather.includes("snow")) advice += " ☃️ 눈길 조심하세요!";
        if (aqi >= 4) advice += " 😷 미세먼지가 심해요. 마스크 필수!";
    } 
    // 2. 영어 (English)
    else if (currentLang === 'en') {
        if (currentUnit === "metric") {
            if (temp >= 28) advice = "It's hot! 🎽 Wear shorts.";
            else if (temp >= 23) advice = "Warm. 👕 T-shirt recommended.";
            else if (temp >= 20) advice = "Nice weather! 👚 Long sleeve.";
            else if (temp >= 17) advice = "Bit chilly. 🧥 Light jacket.";
            else if (temp >= 12) advice = "Chilly. 🧥 Wear a jacket.";
            else if (temp >= 9) advice = "Cold. 🧥 Wear a coat.";
            else if (temp >= 5) advice = "Winter! 🧣 Heavy coat.";
            else advice = "Freezing! 🧤 Padded jacket needed!";
        } else advice = "Dress comfortably!";
        if (weather.includes("rain")) advice += " ☔ Take an umbrella!";
        if (weather.includes("snow")) advice += " ☃️ Watch for snow!";
        if (aqi >= 4) advice += " 😷 Poor air quality. Wear a mask!";
    }
    // 3. 일본어 (Japanese)
    else if (currentLang === 'jp') {
        if (currentUnit === "metric") {
            if (temp >= 28) advice = "とても暑いです！🎽 半袖や短パンが必須です。";
            else if (temp >= 23) advice = "少し暑いですね。👕 薄手のシャツがおすすめ。";
            else if (temp >= 20) advice = "過ごしやすい天気！👚 長袖シャツやカーディガンを。";
            else if (temp >= 17) advice = "少し肌寒いです。🧥 ジャケットを羽織りましょう。";
            else if (temp >= 12) advice = "寒いです。🧥 コートやジャンパーが必要です。";
            else if (temp >= 9) advice = "寒いです。🧥 厚手のコートを着ましょう。";
            else if (temp >= 5) advice = "冬の寒さ！🧣 マフラーや手袋を。";
            else advice = "極寒です！🧤 ダウンジャケットで完全防備を！";
        } else advice = "天気に合わせた服装を！";
        if (weather.includes("rain")) advice += " ☔ 傘を忘れずに！";
        if (weather.includes("snow")) advice += " ☃️ 雪道に注意してください！";
        if (aqi >= 4) advice += " 😷 空気が悪いです。マスクを着用してください！";
    }
    // 4. 중국어 (Chinese)
    else if (currentLang === 'cn') {
        if (currentUnit === "metric") {
            if (temp >= 28) advice = "非常热！🎽 建议穿短袖或短裤。";
            else if (temp >= 23) advice = "有点热。👕 建议穿薄衬衫。";
            else if (temp >= 20) advice = "天气不错！👚 长袖T恤或开衫。";
            else if (temp >= 17) advice = "有点凉。🧥 带件薄外套。";
            else if (temp >= 12) advice = "天冷了。🧥 需要穿夹克。";
            else if (temp >= 9) advice = "很冷。🧥 请穿大衣。";
            else if (temp >= 5) advice = "冬天来了！🧣 厚外套和围巾。";
            else advice = "太冷了！🧤 请穿羽绒服保暖！";
        } else advice = "请根据天气穿衣！";
        if (weather.includes("rain")) advice += " ☔ 别忘了带伞！";
        if (weather.includes("snow")) advice += " ☃️哪怕雪路滑！";
        if (aqi >= 4) advice += " 😷 空气质量差，请戴口罩！";
    }

    fashionAdviceElement.textContent = advice;
}

function renderChart(forecast) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    if (myChart) myChart.destroy();

    const labels = [];
    const temps = [];
    
    for (let i = 0; i < 8; i++) {
        const item = forecast.list[i];
        const date = new Date(item.dt * 1000);
        labels.push(`${date.getHours()}:00`);
        temps.push(item.main.temp);
    }

    const t = translations[currentLang];

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temp (${currentUnit === 'metric' ? '°C' : '°F'})`,
                data: temps,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                title: { display: true, text: t.chartTitle }
            },
            scales: { y: { beginAtZero: false } }
        }
    });
}

// --- [5] 유틸리티 ---

function updateUIText() {
    const t = translations[currentLang];
    document.querySelector("header h1").textContent = t.title;
    cityInput.placeholder = t.placeholder;
    currentLocationBtn.textContent = t.currentLoc;
    document.querySelector("#lifestyle-tips h3").textContent = t.tipsTitle;
    document.querySelector("#charts h3").textContent = t.chartTitle;
    document.querySelector("#forecast h2").textContent = t.forecastTitle;
}

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