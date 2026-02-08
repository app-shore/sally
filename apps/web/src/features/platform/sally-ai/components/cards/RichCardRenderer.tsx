'use client';

import type { RichCard } from '../../engine/types';
import { AlertCard } from './AlertCard';
import { DriverCard } from './DriverCard';
import { RouteCard } from './RouteCard';
import { HOSCard } from './HOSCard';
import { FleetCard } from './FleetCard';
import { LeadFormCard } from './LeadFormCard';

export function RichCardRenderer({ card }: { card: RichCard }) {
  switch (card.type) {
    case 'alert':
    case 'alert_list':
      return <AlertCard data={card.data} />;
    case 'driver':
      return <DriverCard data={card.data} />;
    case 'route':
      return <RouteCard data={card.data} />;
    case 'hos':
      return <HOSCard data={card.data} />;
    case 'fleet':
      return <FleetCard data={card.data} />;
    case 'lead_form':
      return <LeadFormCard />;
    default:
      return null;
  }
}
