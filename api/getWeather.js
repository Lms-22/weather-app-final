// 이 파일은 Vercel 서버에서만 실행됩니다. (Node.js 환경)

export default async function handler(request, response) {
    // 1. Vercel 환경 변수에서 API Key를 안전하게 가져옵니다. 
    // (process.env.WEATHER_API_KEY 이름은 3단계에서 Vercel에 설정할 이름)
    const API_KEY = process.env.WEATHER_API_KEY;
    
    // 2. 클라이언트(script.js)에서 보낸 쿼리 파라미터를 받습니다.
    const { city, lat, lon, unit } = request.query;
    const lang = "kr";

    let currentUrl = "";
    let forecastUrl = "";

    // 3. 쿼리 타입(도시이름/좌표)에 따라 API URL을 구성합니다.
    if (city) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}&lang=${lang}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${unit}&lang=${lang}`;
    } else if (lat && lon) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}&lang=${lang}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}&lang=${lang}`;
    } else {
        return response.status(400).json({ error: "도시 이름 또는 좌표가 필요합니다." });
    }

    try {
        // 4. Vercel 서버가 OpenWeatherMap에 대신 요청을 보냅니다.
        const [currentRes, forecastRes] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error("OpenWeatherMap API 호출 실패");
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        // 5. 두 개의 데이터를 합쳐 클라이언트(script.js)에 응답합니다.
        response.status(200).json({ currentData, forecastData });

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "서버에서 날씨 정보를 가져오는 데 실패했습니다." });
    }
}