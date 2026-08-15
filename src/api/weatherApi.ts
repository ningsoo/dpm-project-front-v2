import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export interface WeatherResponse {
  resultCode: string;
  category: string;
  obsrValue: number;
  humidityMsg: string;
}

// 도시명(한글) -> Region(백엔드 대문자 enum) 매핑
export const REGION_MAP: Record<string, string> = {
  서울: 'SEOUL',
  인천: 'INCHEON',
  '경기북부': 'GYEONGGI_NORTH',
  '경기남부': 'GYEONGGI_SOUTH',
  대전: 'DAEJEON',
  대구: 'DAEGU',
  부산: 'BUSAN',
  광주: 'GWANGJU',
  강원: 'GANGWON',
  제주: 'JEJU',
};

export const weatherApi = {
  /** 기상청 습도 안내 조회 - GET /api/weather/info?Region=... (로그인 없이 호출 가능) */
  getWeatherInfo: (cityName: keyof typeof REGION_MAP) =>
    fetchClient.get<ApiResponse<WeatherResponse>>('/api/weather/info', {
      params: {
        Region: REGION_MAP[cityName],
      },
    }),
};

