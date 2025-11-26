export default async function handler(request, response) {
    const API_KEY = process.env.WEATHER_API_KEY;
    // 클라이언트에서 lang(언어) 파라미터를 추가로 받습니다.
    const { city, lat, lon, unit, lang } = request.query;
    
    // 언어 설정이 없으면 기본값 'kr' (한국어)
    const queryLang = lang || 'kr';

    if (!city && (!lat || !lon)) {
        return response.status(400).json({ error: "정보가 부족합니다." });
    }

    try {
        let latitude = lat;
        let longitude = lon;
        let locationName = "";

        if (city) {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData.length === 0) {
                return response.status(404).json({ error: "City not found" });
            }
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
            locationName = geoData[0].name;
        }

        // API 호출 시 lang 파라미터 적용
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=${queryLang}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=${queryLang}`;
        const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;

        const [weatherRes, forecastRes, airRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(airUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok || !airRes.ok) {
            throw new Error("OpenWeatherMap API Error");
        }

        const currentData = await weatherRes.json();
        const forecastData = await forecastRes.json();
        const airData = await airRes.json();

        if (locationName) currentData.name = locationName;

        response.status(200).json({ currentData, forecastData, airData });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server Error" });
    }
}