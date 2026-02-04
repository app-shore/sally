export enum DataSource {
  DISTANCE_STATIC = 'distance_static',
  DISTANCE_LIVE = 'distance_live',
  TRAFFIC_NONE = 'traffic_none',
  TRAFFIC_LIVE = 'traffic_live',
  DOCK_TIME_ESTIMATE = 'dock_time_estimate',
  DOCK_TIME_HISTORICAL = 'dock_time_historical',
  DOCK_TIME_MANUAL = 'dock_time_manual',
  HOS_MANUAL = 'hos_manual',
  HOS_ELD_API = 'hos_eld_api',
  FUEL_MANUAL = 'fuel_manual',
  FUEL_TELEMATICS = 'fuel_telematics',
  FUEL_PRICE_MANUAL = 'fuel_price_manual',
  FUEL_PRICE_API = 'fuel_price_api',
  WEATHER_NONE = 'weather_none',
  WEATHER_API = 'weather_api',
  STOP_MANUAL = 'stop_manual',
  STOP_TMS = 'stop_tms',
}

const DATA_SOURCE_LABELS: Record<
  string,
  { current: string; future: string | null; badge_color: string }
> = {
  [DataSource.DISTANCE_STATIC]: {
    current: 'Static Haversine Distance',
    future: 'Google Maps Directions API',
    badge_color: 'gray',
  },
  [DataSource.DISTANCE_LIVE]: {
    current: 'Google Maps Directions API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.TRAFFIC_NONE]: {
    current: 'No Traffic Data',
    future: 'Google Maps Traffic API',
    badge_color: 'gray',
  },
  [DataSource.TRAFFIC_LIVE]: {
    current: 'Live Traffic API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.DOCK_TIME_ESTIMATE]: {
    current: 'Default Estimate',
    future: 'TMS Historical Data',
    badge_color: 'gray',
  },
  [DataSource.DOCK_TIME_HISTORICAL]: {
    current: 'TMS Historical Data',
    future: null,
    badge_color: 'green',
  },
  [DataSource.DOCK_TIME_MANUAL]: {
    current: 'Manual Entry',
    future: 'TMS Integration',
    badge_color: 'gray',
  },
  [DataSource.HOS_MANUAL]: {
    current: 'Manual Entry',
    future: 'ELD API (Samsara, KeepTruckin)',
    badge_color: 'gray',
  },
  [DataSource.HOS_ELD_API]: {
    current: 'ELD API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.FUEL_MANUAL]: {
    current: 'Manual Entry',
    future: 'Telematics API',
    badge_color: 'gray',
  },
  [DataSource.FUEL_TELEMATICS]: {
    current: 'Telematics API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.FUEL_PRICE_MANUAL]: {
    current: 'Manual Entry (Updated Weekly)',
    future: 'GasBuddy API',
    badge_color: 'gray',
  },
  [DataSource.FUEL_PRICE_API]: {
    current: 'GasBuddy API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.WEATHER_NONE]: {
    current: 'No Weather Data',
    future: 'OpenWeatherMap API',
    badge_color: 'gray',
  },
  [DataSource.WEATHER_API]: {
    current: 'OpenWeatherMap API',
    future: null,
    badge_color: 'green',
  },
  [DataSource.STOP_MANUAL]: {
    current: 'Manual Entry',
    future: 'TMS API',
    badge_color: 'gray',
  },
  [DataSource.STOP_TMS]: {
    current: 'TMS API',
    future: null,
    badge_color: 'green',
  },
};

export function getDataSourceInfo(source: DataSource): {
  current: string;
  future: string | null;
  badge_color: string;
} {
  return (
    DATA_SOURCE_LABELS[source] || {
      current: 'Unknown',
      future: null,
      badge_color: 'gray',
    }
  );
}

export function formatDataSourceBadge(source: DataSource): {
  label: string;
  color: string;
  tooltip: string;
} {
  const info = getDataSourceInfo(source);
  return {
    label: info.current,
    color: info.badge_color,
    tooltip: info.future ? `Future: ${info.future}` : 'Live data source',
  };
}

export const DEFAULT_MVP_SOURCES: Record<string, DataSource> = {
  distance: DataSource.DISTANCE_STATIC,
  traffic: DataSource.TRAFFIC_NONE,
  dock_time: DataSource.DOCK_TIME_ESTIMATE,
  hos: DataSource.HOS_MANUAL,
  fuel_level: DataSource.FUEL_MANUAL,
  fuel_price: DataSource.FUEL_PRICE_MANUAL,
  weather: DataSource.WEATHER_NONE,
  stops: DataSource.STOP_MANUAL,
};
