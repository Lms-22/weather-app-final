// [파일: api/getWeather.js]
export default async function handler(request, response) {
    const API_KEY = process.env.WEATHER_API_KEY;
    const { city, lat, lon, unit } = request.query;
    
    // 유효성 검사
    if (!city && (!lat || !lon)) {
        return response.status(400).json({ error: "도시 이름 또는 좌표가 필요합니다." });
    }

    try {
        let latitude = lat;
        let longitude = lon;
        let locationName = "";

        // 1. 도시 이름으로 요청이 온 경우 -> Geocoding API로 좌표 찾기 (서버에서 수행)
        if (city) {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData.length === 0) {
                return response.status(404).json({ error: `'${city}' 도시를 찾을 수 없습니다.` });
            }

            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
            locationName = geoData[0].name; // 공식 영문명 (예: Seoul)
        }

        // 2. 좌표로 날씨 & 예보 가져오기
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=kr`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}&lang=kr`;

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) {
            throw new Error("OpenWeatherMap API 오류");
        }

        const currentData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        // (선택) Geocoding으로 찾은 정확한 도시 이름을 덮어씌워 줌
        if (locationName) {
            currentData.name = locationName;
        }

        // 3. 결과 응답
        response.status(200).json({ currentData, forecastData });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
    }
}