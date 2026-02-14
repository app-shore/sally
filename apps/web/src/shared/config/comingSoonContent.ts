import type { ComingSoonBannerProps } from '@/features/platform/feature-flags';

/**
 * Marketing content for coming soon banners
 * Based on product vision and feature specifications
 */
export const comingSoonContent: Record<string, Omit<ComingSoonBannerProps, 'category'>> = {
  route_planning_enabled: {
    title: 'Intelligent Route Planning',
    description:
      'AI-powered route optimization that automatically ensures HOS compliance, inserts rest stops where needed, and finds the best fuel stops along your route.',
    features: [
      'Automatic stop sequence optimization using advanced TSP/VRP algorithms',
      'Smart rest stop insertion based on HOS regulations - never violate again',
      'Intelligent fuel stop recommendations based on range and real-time pricing',
      'Zero-violation guarantee with segment-by-segment HOS simulation',
      'One-click route generation with full compliance validation',
    ],
  },

  command_center_enabled: {
    title: 'Dispatcher Command Center',
    description:
      'Your mission control dashboard providing a complete fleet overview, quick actions, and an activity feed of everything happening across your operations.',
    features: [
      'Fleet-wide overview with driver status, active routes, and alerts',
      'Quick actions for common dispatcher tasks - plan routes, assign loads, send messages',
      'Real-time activity feed showing route updates, HOS changes, and system events',
      'Critical alerts dashboard for issues requiring immediate attention',
      'At-a-glance metrics: active drivers, routes in progress, compliance status',
    ],
  },

  driver_dashboard_enabled: {
    title: 'Driver Dashboard',
    description:
      'A clean, focused driver portal showing current route information, HOS compliance status, and upcoming stops.',
    features: [
      'Current route overview with next stop and estimated arrival time',
      'Real-time HOS status with remaining drive time and next break required',
      'Simple, distraction-free interface optimized for in-cab use',
      'Push notifications for route changes and dispatcher messages',
      'Quick access to route timeline and delivery instructions',
    ],
  },

  driver_current_route_enabled: {
    title: 'Driver Route Timeline',
    description:
      'A detailed, step-by-step view of your current route with stop-by-stop guidance, rest stop notifications, and HOS compliance tracking.',
    features: [
      'Interactive timeline showing all stops in sequence',
      'Automatic rest stop alerts with countdown to required break',
      'Fuel stop recommendations with pricing and distance information',
      'Real-time ETA updates based on your actual progress',
      'Clear indicators for pickup, delivery, rest, and fuel stops',
    ],
  },

  driver_messages_enabled: {
    title: 'Driver Messages',
    description:
      'Direct communication channel between dispatchers and drivers for route updates, instructions, and urgent notifications.',
    features: [
      'Real-time message delivery with read receipts',
      'Route-specific messages automatically linked to active deliveries',
      'Priority flagging for urgent communications',
      'Message history organized by route and date',
      'Push notifications for new messages even when app is closed',
    ],
  },

  alerts_system_enabled: {
    title: 'Automated Alert System',
    description:
      'Proactive dispatcher notifications for HOS violations, route delays, and critical events - so you can intervene before problems escalate.',
    features: [
      'HOS violation alerts: approaching limits, rest required, available hours low',
      'Route delay notifications: driver not moving, stuck at dock, traffic delays',
      'Critical event alerts: weather warnings, route deviations, missed stops',
      'Customizable alert thresholds and notification preferences',
      'Alert acknowledgment and resolution tracking',
    ],
  },

  continuous_monitoring_enabled: {
    title: 'Continuous Route Monitoring',
    description:
      'Background service running 24/7, monitoring all active routes and triggering automatic updates or alerts when conditions change.',
    features: [
      '14 trigger types across 5 categories monitored every 60 seconds',
      'Automatic route re-planning when conditions require changes',
      'Proactive HOS monitoring to prevent violations before they happen',
      'Weather, traffic, and dock delay integration',
      'Zero-click monitoring - the system watches everything for you',
    ],
  },

  external_integrations_enabled: {
    title: 'External Integrations',
    description:
      'Connect to your existing systems: TMS, ELD/HOS providers, fuel price APIs, and weather services for seamless data flow.',
    features: [
      'ELD/HOS integration: Samsara, KeepTruckin, Motive - real-time duty status',
      'TMS integration: McLeod, TMW - automatic load import and status sync',
      'Fuel price APIs: real-time pricing for optimal fuel stop selection',
      'Weather APIs: route-aware weather warnings and delay predictions',
      'Two-way sync: updates flow automatically between all systems',
    ],
  },

  fleet_management_enabled: {
    title: 'Fleet Management',
    description:
      'Comprehensive CRUD interface for managing your drivers, vehicles, and fleet settings all in one place.',
    features: [
      'Driver management: profiles, credentials, HOS preferences, status tracking',
      'Vehicle management: truck details, capacity, fuel range, maintenance schedules',
      'Fleet settings: default preferences, compliance rules, operational parameters',
      'Bulk import/export capabilities for large fleets',
      'Activity logs and audit trails for all changes',
    ],
  },

  billing_enabled: {
    title: 'Billing',
    description:
      'Create, send, and track invoices for completed loads. Automatically calculate rates from load data and get paid faster with professional invoices.',
    features: [
      'One-click invoice generation from completed loads with automatic rate calculation',
      'Line item management with accessorials, detention, and lumper charges',
      'Invoice status tracking: draft, sent, paid, overdue with aging reports',
      'Bulk invoicing for multiple loads to the same customer',
      'QuickBooks sync to eliminate double-entry and keep your books current',
    ],
  },

  driver_pay_enabled: {
    title: 'Driver Pay',
    description:
      'Calculate and manage driver pay with support for per-mile, percentage, flat rate, and hybrid structures. Generate settlement statements and sync to accounting.',
    features: [
      'Flexible pay structures: per-mile, percentage of load, flat rate, or hybrid',
      'Automatic settlement calculation from completed routes and loads',
      'Deduction management: advances, fuel cards, insurance, equipment leases',
      'Settlement statement generation with detailed pay breakdown',
      'QuickBooks sync for seamless payroll and expense tracking',
    ],
  },

  quickbooks_integration_enabled: {
    title: 'QuickBooks Integration',
    description:
      'Connect SALLY to QuickBooks Online for seamless two-way sync of invoices, settlements, and financial data. Eliminate double-entry and keep your books accurate.',
    features: [
      'One-click QuickBooks Online connection with OAuth authentication',
      'Automatic invoice sync: SALLY invoices appear in QuickBooks as they are created',
      'Settlement sync: driver pay and deductions flow directly to QuickBooks payroll',
      'Customer and vendor mapping between SALLY and QuickBooks',
      'Reconciliation dashboard showing sync status and any discrepancies',
    ],
  },
  analytics_enabled: {
    title: 'Business Analytics',
    description:
      'Comprehensive business intelligence dashboard giving you full visibility into revenue, fleet utilization, on-time performance, and operational costs across your entire operation.',
    features: [
      'Revenue analytics: revenue per mile, per load, and per driver with trend tracking',
      'Fleet utilization: truck idle time, deadhead percentage, and capacity optimization',
      'On-time delivery performance with breakdown by lane, customer, and driver',
      'Cost analysis: fuel cost per mile, cost per load, and expense trending',
      'Customizable date ranges with daily, weekly, and monthly roll-ups',
    ],
  },
};
