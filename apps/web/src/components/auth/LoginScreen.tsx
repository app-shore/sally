'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { login as apiLogin } from '@/lib/api/session';
import { listDrivers } from '@/lib/api/drivers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LoginScreen() {
  const [userType, setUserType] = useState<'dispatcher' | 'driver' | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const sessionStore = useSessionStore();

  const handleUserTypeSelect = async (type: 'dispatcher' | 'driver') => {
    setUserType(type);
    setError(null);

    if (type === 'driver') {
      try {
        setIsLoading(true);
        const driversList = await listDrivers();
        setDrivers(driversList.map(d => ({ id: d.id, name: d.name })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drivers');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = async () => {
    if (!userType) {
      setError('Please select a user type');
      return;
    }

    if (userType === 'driver' && !selectedDriverId) {
      setError('Please select a driver');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userId = userType === 'dispatcher' ? 'dispatcher_1' : selectedDriverId;
      const response = await apiLogin({ user_type: userType, user_id: userId });

      sessionStore.login(userType, userId, response.session_id);

      if (userType === 'dispatcher') {
        router.push('/dispatcher');
      } else {
        router.push('/driver');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setUserType(null);
    setSelectedDriverId('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>SALLY Login</CardTitle>
          <CardDescription>
            Select your role to access the dispatch and driver coordination platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userType ? (
            <>
              <Button
                onClick={() => handleUserTypeSelect('dispatcher')}
                className="w-full"
                size="lg"
              >
                Login as Dispatcher
              </Button>
              <Button
                onClick={() => handleUserTypeSelect('driver')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Login as Driver
              </Button>
            </>
          ) : (
            <>
              {userType === 'driver' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Driver</label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a driver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleLogin}
                  className="flex-1"
                  disabled={isLoading || (userType === 'driver' && !selectedDriverId)}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
