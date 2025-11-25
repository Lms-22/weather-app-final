export default async function handler(request, response) {
    const API_KEY = process.env.WEATHER_API_KEY; // Vercel 환경 변수
    const { city, lat, lon, unit } = request.query;
    
    if (!city && (!lat || !lon)) {
        return response.status(400).json({ error: "정보가 부족합니다." });
    }

    try {
        let latitude = lat;
        let longitude = lon;
        let locationName = "";

        // 1. 도시 이름 검색 (Geocoding)
        if (city) {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData.length === 0) {
                return response.status(404).json({ error: `'${city}' 도시를 찾을 수 없습니다.` });
            }
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
            locationName = geoData[0].name;
        }

        // 2. 날씨(Weather), 예보(Forecast), 미세먼지(Air Pollution) 동시 호출
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=kr`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=kr`;
        const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;

        const [weatherRes, forecastRes, airRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(airUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok || !airRes.ok) {
            throw new Error("OpenWeatherMap API 오류");
        }

        const currentData = await weatherRes.json();
        const forecastData = await forecastRes.json();
        const airData = await airRes.json(); // 미세먼지 데이터

        if (locationName) currentData.name = locationName;

        // 3개 데이터를 모두 응답
        response.status(200).json({ currentData, forecastData, airData });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "서버 오류 발생" });
    }
}