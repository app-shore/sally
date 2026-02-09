import type { ClassifiedIntent, SallyResponse } from './types';
import { MOCK_DRIVERS, MOCK_ALERTS, MOCK_ROUTES, MOCK_FLEET } from './mock-data';

// ── Prospect Handlers ──

function handleProductInfo(): SallyResponse {
  return {
    text: "SALLY is your fleet operations assistant. I handle route planning with HOS-aware optimization, continuous monitoring with 14 trigger types, and proactive dispatcher alerts. Want to know about pricing or see a demo?",
    speakText: "SALLY is your fleet operations assistant. I handle route planning, continuous monitoring, and proactive dispatcher alerts. Want to know about pricing or see a demo?",
  };
}

function handlePricing(): SallyResponse {
  return {
    text: "SALLY pricing is based on fleet size and features. We offer flexible plans from basic route planning to full enterprise monitoring with API access. Most fleets see ROI within the first month from violation prevention alone. Want me to connect you with sales for a custom quote?",
    followUp: "What size is your fleet?",
  };
}

function handleIntegration(): SallyResponse {
  return {
    text: "Yes! SALLY integrates with major TMS platforms (McLeod, TMW), ELD systems (Samsara, KeepTruckin), and external data sources for fuel prices, weather, and traffic. We provide REST APIs and webhooks for seamless integration.",
    speakText: "Yes, SALLY integrates with major TMS platforms, ELD systems, and external data sources. We provide REST APIs and webhooks.",
  };
}

function handleDemoRequest(): SallyResponse {
  return {
    text: "I'd love to show you SALLY in action! You can explore the dispatcher dashboard right now, or I can help you schedule a personalized demo with our team. What works better for you?",
    followUp: "Would you like to try the dashboard or schedule a call?",
  };
}

function handleLeadCapture(): SallyResponse {
  return {
    text: "I'd love to send you more details! Let me get a few quick things from you.",
    card: { type: 'lead_form', data: {} },
    speakText: "I'd love to send you more details. Please fill in the form.",
  };
}

// ── Dispatcher Handlers ──

function handleAlertQuery(): SallyResponse {
  const critical = MOCK_ALERTS.filter(a => a.severity === 'critical');
  const warning = MOCK_ALERTS.filter(a => a.severity === 'warning');
  const info = MOCK_ALERTS.filter(a => a.severity === 'info');

  return {
    text: `You have ${MOCK_ALERTS.length} active alerts: ${critical.length} critical, ${warning.length} warning, ${info.length} info.`,
    card: {
      type: 'alert_list',
      data: { alerts: MOCK_ALERTS },
    },
    followUp: "Want me to acknowledge any of these?",
    speakText: `You have ${MOCK_ALERTS.length} active alerts. ${critical.length} are critical.`,
  };
}

function handleAlertAck(entities: Record<string, string>): SallyResponse {
  const alertId = entities.alert_id;
  if (!alertId) {
    return {
      text: "Which alert would you like me to acknowledge? Give me the alert ID (e.g., A-101).",
    };
  }
  const alert = MOCK_ALERTS.find(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (!alert) {
    return { text: `I couldn't find alert ${alertId}. Current alerts: ${MOCK_ALERTS.map(a => a.id).join(', ')}.` };
  }
  return {
    text: `Done. Alert ${alert.id} ("${alert.message}") has been acknowledged.`,
    action: { type: 'alert_ack', success: true, message: `Acknowledged ${alert.id}` },
    card: { type: 'alert', data: { ...alert, acknowledged: true } },
    speakText: `Alert ${alert.id} acknowledged.`,
  };
}

function handleDriverLookup(entities: Record<string, string>): SallyResponse {
  const name = entities.driver_name;
  let driver;

  if (name) {
    driver = MOCK_DRIVERS.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (!driver && name) {
    return { text: `I couldn't find a driver named "${name}". Available drivers: ${MOCK_DRIVERS.map(d => d.name).join(', ')}.` };
  }

  if (!driver) {
    return {
      text: `Here are all ${MOCK_DRIVERS.length} drivers on file.`,
      card: { type: 'driver', data: { drivers: MOCK_DRIVERS } },
    };
  }

  const routeInfo = driver.current_route
    ? ` on route ${driver.current_route}`
    : ', currently unassigned';

  return {
    text: `${driver.name} is currently ${driver.status.replace('_', ' ')}${routeInfo}. ${driver.hos_remaining > 0 ? `${driver.hos_remaining} hours remaining on drive window.` : 'Off duty / resting.'}`,
    card: { type: 'driver', data: driver },
    speakText: `${driver.name} is ${driver.status.replace('_', ' ')} with ${driver.hos_remaining} hours remaining.`,
  };
}

function handleRouteQuery(entities: Record<string, string>): SallyResponse {
  const routeId = entities.route_id;

  if (routeId) {
    const route = MOCK_ROUTES.find(r => r.id.toLowerCase() === routeId.toLowerCase());
    if (!route) {
      return { text: `Route ${routeId} not found. Active routes: ${MOCK_ROUTES.map(r => r.id).join(', ')}.` };
    }
    return {
      text: `Route ${route.id}: ${route.origin} \u2192 ${route.destination}. ${route.stops} stops, ETA ${route.eta}. Status: ${route.status.replace('_', ' ')}. Driver: ${route.driver || 'unassigned'}.`,
      card: { type: 'route', data: route },
      speakText: `Route ${route.id} from ${route.origin} to ${route.destination}. ETA ${route.eta}. Status ${route.status.replace('_', ' ')}.`,
    };
  }

  return {
    text: `${MOCK_ROUTES.length} active routes. ${MOCK_ROUTES.filter(r => r.status === 'in_progress').length} in progress, ${MOCK_ROUTES.filter(r => r.status === 'planned').length} planned.`,
    card: { type: 'route', data: { routes: MOCK_ROUTES } },
    speakText: `${MOCK_ROUTES.length} routes total. ${MOCK_ROUTES.filter(r => r.status === 'in_progress').length} currently in progress.`,
  };
}

function handleHosCheck(): SallyResponse {
  const driving = MOCK_DRIVERS.filter(d => d.status === 'driving');
  const lowHos = driving.filter(d => d.hos_remaining < 3);

  let text = `${driving.length} drivers currently driving.`;
  if (lowHos.length > 0) {
    text += ` ${lowHos.length} approaching HOS limits: ${lowHos.map(d => `${d.name} (${d.hos_remaining}h)`).join(', ')}.`;
  } else {
    text += ' All within safe HOS margins.';
  }

  return {
    text,
    card: { type: 'hos', data: { drivers: driving } },
    speakText: `${driving.length} drivers driving. ${lowHos.length} approaching HOS limits.`,
  };
}

function handleFleetStatus(): SallyResponse {
  return {
    text: `Fleet overview: ${MOCK_FLEET.active_vehicles} active vehicles, ${MOCK_FLEET.active_routes} active routes, ${MOCK_FLEET.pending_alerts} pending alerts. Drivers: ${MOCK_FLEET.drivers_driving} driving, ${MOCK_FLEET.drivers_available} available, ${MOCK_FLEET.drivers_resting} resting.`,
    card: { type: 'fleet', data: MOCK_FLEET },
    speakText: `${MOCK_FLEET.active_vehicles} vehicles active. ${MOCK_FLEET.pending_alerts} pending alerts. ${MOCK_FLEET.drivers_driving} drivers on the road.`,
  };
}

// ── Driver Handlers ──

function handleRouteStatus(): SallyResponse {
  const driver = MOCK_DRIVERS[0];
  const route = MOCK_ROUTES.find(r => r.id === driver.current_route);

  if (!route) {
    return { text: "You don't have an active route right now." };
  }

  return {
    text: `You're on route ${route.id}: ${route.origin} \u2192 ${route.destination}. ${route.stops} stops remaining. ETA: ${route.eta}. Status: on track.`,
    card: { type: 'route', data: route },
    speakText: `Route ${route.id}. ${route.stops} stops remaining. ETA ${route.eta}.`,
  };
}

function handleHosStatus(): SallyResponse {
  const driver = MOCK_DRIVERS[0];
  const nextBreakHours = Math.min(driver.hos_remaining, 8);

  return {
    text: `You have ${driver.hos_remaining} hours remaining on your drive window. Next mandatory break in ${nextBreakHours.toFixed(1)} hours (around ${getTimeFromNow(nextBreakHours)}).`,
    card: { type: 'hos', data: { driver, nextBreak: getTimeFromNow(nextBreakHours) } },
    speakText: `${driver.hos_remaining} hours remaining. Next break around ${getTimeFromNow(nextBreakHours)}.`,
  };
}

function handleEtaQuery(): SallyResponse {
  const route = MOCK_ROUTES[0];
  return {
    text: `Your ETA to the next stop is approximately 1 hour 15 minutes. Final destination (${route.destination}) ETA: ${route.eta}.`,
    speakText: `Next stop in about 1 hour 15 minutes. Final destination ETA ${route.eta}.`,
  };
}

function handleDelayReport(entities: Record<string, string>): SallyResponse {
  const duration = entities.duration || 'unknown';
  return {
    text: `Got it. I've logged a ${duration}-minute delay at your current stop. Dispatch has been notified and your route timing has been updated.`,
    action: { type: 'status_updated', success: true, message: `Delay of ${duration} minutes reported` },
    speakText: `Delay of ${duration} minutes logged. Dispatch has been notified.`,
  };
}

function handleArrivalReport(): SallyResponse {
  return {
    text: "Arrival confirmed! I've updated your route status. Take your time \u2014 your next segment departs based on the planned schedule.",
    action: { type: 'status_updated', success: true, message: 'Arrival confirmed' },
    speakText: 'Arrival confirmed. Route status updated.',
  };
}

function handleFuelStopReport(): SallyResponse {
  return {
    text: "Fuel stop logged. Your range has been updated. Safe travels on the next segment!",
    action: { type: 'status_updated', success: true, message: 'Fuel stop completed' },
    speakText: 'Fuel stop logged. Range updated.',
  };
}

function handleWeatherQuery(): SallyResponse {
  return {
    text: "Current weather along your route: Clear skies until Memphis. Thunderstorm warning on I-40 near Little Rock starting at 6 PM. Consider adjusting your schedule if passing through that area.",
    speakText: "Clear skies ahead. Thunderstorm warning near Little Rock after 6 PM.",
  };
}

// ── General Handler ──

function handleGeneral(mode: string): SallyResponse {
  switch (mode) {
    case 'prospect':
      return {
        text: "I can help you learn about SALLY's fleet operations platform. Ask me about route planning, HOS compliance, monitoring, integrations, pricing, or request a demo!",
      };
    case 'dispatcher':
      return {
        text: "I can help with alerts, fleet status, driver lookups, route queries, HOS checks, and more. Try asking: 'Show me active alerts' or 'Find driver John'.",
      };
    case 'driver':
      return {
        text: "I can help with your route status, HOS, ETA, delays, fuel stops, and weather. Try: 'When is my next break?' or 'What's my ETA?'",
      };
    default:
      return { text: "How can I help you today?" };
  }
}

// ── Greeting Generator ──

export function getGreeting(mode: string): string {
  switch (mode) {
    case 'prospect':
      return "Hi! I'm SALLY. I can tell you about our fleet operations platform, pricing, integrations, or set up a demo. What would you like to know?";
    case 'dispatcher':
      return "Hi! I'm SALLY. I can check alerts, look up drivers, query routes, and manage your fleet. What do you need?";
    case 'driver':
      return "Hey! I'm SALLY. I can show your route, check HOS, report delays, or find fuel. What's up?";
    default:
      return "Hi! I'm SALLY. How can I help you today?";
  }
}

// ── Main Router ──

export function generateResponse(classified: ClassifiedIntent, mode: string): SallyResponse {
  const { intent, entities } = classified;

  switch (intent) {
    // Prospect
    case 'product_info': return handleProductInfo();
    case 'pricing': return handlePricing();
    case 'integration': return handleIntegration();
    case 'demo_request': return handleDemoRequest();
    case 'lead_capture': return handleLeadCapture();

    // Dispatcher
    case 'alert_query': return handleAlertQuery();
    case 'alert_ack': return handleAlertAck(entities);
    case 'driver_lookup': return handleDriverLookup(entities);
    case 'route_query': return handleRouteQuery(entities);
    case 'hos_check': return handleHosCheck();
    case 'fleet_status': return handleFleetStatus();
    case 'add_note': return { text: "Note added. I'll attach it to the relevant record.", action: { type: 'note_added', success: true, message: 'Note added' } };
    case 'flag_driver': return { text: "Driver flagged for follow-up. It'll appear in your action items.", action: { type: 'driver_flagged', success: true, message: 'Driver flagged' } };

    // Driver
    case 'route_status': return handleRouteStatus();
    case 'hos_status': return handleHosStatus();
    case 'eta_query': return handleEtaQuery();
    case 'delay_report': return handleDelayReport(entities);
    case 'arrival_report': return handleArrivalReport();
    case 'fuel_stop_report': return handleFuelStopReport();
    case 'weather_query': return handleWeatherQuery();

    // Fallback
    case 'general':
    default:
      return handleGeneral(mode);
  }
}

// ── Helpers ──

function getTimeFromNow(hours: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + hours * 60);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
