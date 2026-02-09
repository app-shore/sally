import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Configuration } from '../../../../config/configuration';
import { LatLon } from '../routing/routing-provider.interface';
import { WeatherAlert, WeatherProvider } from './weather-provider.interface';

@Injectable()
export class OpenWeatherMapProvider implements WeatherProvider {
  private readonly logger = new Logger(OpenWeatherMapProvider.name);
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private readonly configService: ConfigService<Configuration>) {}

  async getWeatherAlongRoute(
    waypoints: LatLon[],
    departureTime: Date,
  ): Promise<WeatherAlert[]> {
    const apiKey = this.configService.get<string>('openWeatherApiKey');
    if (!apiKey) {
      this.logger.warn(
        'OpenWeather API key not configured; skipping weather lookup',
      );
      return [];
    }

    const sampled = this.sampleWaypoints(waypoints, 5);
    const alerts: WeatherAlert[] = [];

    for (const wp of sampled) {
      try {
        const alert = await this.fetchWeather(wp, apiKey);
        if (alert && alert.severity !== 'low') {
          alerts.push(alert);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch weather for (${wp.lat}, ${wp.lon}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return alerts;
  }

  private sampleWaypoints(waypoints: LatLon[], maxCount: number): LatLon[] {
    if (waypoints.length <= maxCount) {
      return waypoints;
    }

    const sampled: LatLon[] = [];
    const step = (waypoints.length - 1) / (maxCount - 1);

    for (let i = 0; i < maxCount; i++) {
      const index = Math.round(i * step);
      sampled.push(waypoints[index]);
    }

    return sampled;
  }

  private async fetchWeather(
    wp: LatLon,
    apiKey: string,
  ): Promise<WeatherAlert | null> {
    const url = `${this.baseUrl}/weather?lat=${wp.lat}&lon=${wp.lon}&appid=${apiKey}&units=imperial`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    const mainCondition: string = data.weather?.[0]?.main ?? '';
    const description: string = data.weather?.[0]?.description ?? '';
    const tempF: number = data.main?.temp ?? 70;
    const windMph: number = data.wind?.speed ?? 0;

    const { condition, severity, driveTimeMultiplier } = this.classifyWeather(
      mainCondition,
      tempF,
      windMph,
    );

    return {
      lat: wp.lat,
      lon: wp.lon,
      condition,
      severity,
      description,
      temperatureF: tempF,
      windSpeedMph: windMph,
      driveTimeMultiplier,
    };
  }

  private classifyWeather(
    mainCondition: string,
    tempF: number,
    windMph: number,
  ): {
    condition: string;
    severity: 'low' | 'moderate' | 'severe';
    driveTimeMultiplier: number;
  } {
    const lower = mainCondition.toLowerCase();

    let condition = 'clear';
    let severity: 'low' | 'moderate' | 'severe' = 'low';
    let driveTimeMultiplier = 1.0;

    // Snow conditions
    if (lower === 'snow') {
      condition = 'snow';
      severity = 'moderate';
      // Colder temperatures make snow worse
      driveTimeMultiplier = tempF < 20 ? 1.4 : 1.2;
      if (tempF < 20) {
        severity = 'severe';
      }
    }
    // Ice: rain with near-freezing temperatures
    else if ((lower === 'rain' || lower === 'drizzle') && tempF < 35) {
      condition = 'ice';
      severity = 'severe';
      driveTimeMultiplier = 1.5;
    }
    // Thunderstorm
    else if (lower === 'thunderstorm') {
      condition = 'thunderstorm';
      severity = 'moderate';
      driveTimeMultiplier = 1.2;
    }
    // Rain / drizzle (above freezing)
    else if (lower === 'rain' || lower === 'drizzle') {
      condition = 'rain';
      severity = 'low';
      driveTimeMultiplier = 1.1;
    }
    // Fog / mist
    else if (lower === 'mist' || lower === 'fog' || lower === 'haze') {
      condition = 'fog';
      severity = 'low';
      driveTimeMultiplier = 1.15;
    }

    // High wind override -- escalate severity and multiplier
    if (windMph > 40) {
      severity = 'severe';
      if (driveTimeMultiplier < 1.3) {
        driveTimeMultiplier = 1.3;
      }
    }

    return { condition, severity, driveTimeMultiplier };
  }
}
