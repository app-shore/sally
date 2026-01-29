'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Fuel, Moon } from 'lucide-react';

export default function CurrentRoutePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'DRIVER') {
    return null;
  }

  // Mock route data
  const mockRoute = {
    id: 'RT-1234',
    origin: 'Los Angeles, CA',
    destination: 'Phoenix, AZ',
    status: 'in_progress',
    progress: 45,
    currentStop: 2,
    totalStops: 5,
    stops: [
      { type: 'pickup', location: 'Los Angeles, CA', time: '8:30 AM', status: 'completed' },
      { type: 'rest', location: 'Indio, CA (Rest Area)', time: '12:00 PM', status: 'completed' },
      { type: 'fuel', location: 'Blythe, CA (Fuel Stop)', time: '2:30 PM', status: 'in_progress' },
      { type: 'delivery', location: 'Phoenix, AZ', time: '5:00 PM', status: 'upcoming' },
      { type: 'rest', location: 'Phoenix, AZ (Rest Stop)', time: '8:00 PM', status: 'upcoming' },
    ],
  };

  const getStopIcon = (type: string) => {
    switch (type) {
      case 'pickup':
      case 'delivery':
        return <MapPin className="h-5 w-5" />;
      case 'fuel':
        return <Fuel className="h-5 w-5" />;
      case 'rest':
        return <Moon className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStopBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default">Current</Badge>;
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Current Route</h1>
        <p className="text-muted-foreground mt-1">Track your route progress and upcoming stops</p>
      </div>

      {/* Route overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Route {mockRoute.id}</CardTitle>
            <Badge variant="default">{mockRoute.status.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Origin</p>
                <p className="font-medium">{mockRoute.origin}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{mockRoute.destination}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{mockRoute.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                <div
                  className="bg-black dark:bg-white h-3 rounded-full transition-all"
                  style={{ width: `${mockRoute.progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stop Progress</span>
              <span className="font-medium">
                {mockRoute.currentStop} of {mockRoute.totalStops} stops
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stop timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Route Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockRoute.stops.map((stop, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-2 ${
                    stop.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' :
                    stop.status === 'in_progress' ? 'bg-black text-white dark:bg-white dark:text-black' :
                    'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    {getStopIcon(stop.type)}
                  </div>
                  {index < mockRoute.stops.length - 1 && (
                    <div className={`w-0.5 h-12 ${
                      stop.status === 'completed' ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium capitalize">{stop.type} Stop</p>
                      <p className="text-sm text-muted-foreground">{stop.location}</p>
                    </div>
                    {getStopBadge(stop.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {stop.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Interactive Map</p>
              <p className="text-sm mt-1">Real-time route visualization coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
