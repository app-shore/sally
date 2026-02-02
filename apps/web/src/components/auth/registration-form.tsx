'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const registrationSchema = z.object({
  // Company info
  companyName: z.string().min(2, 'Company name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  dotNumber: z.string()
    .length(8, 'DOT number must be exactly 8 digits')
    .regex(/^\d+$/, 'DOT number must be numeric'),
  fleetSize: z.enum(['SIZE_1_10', 'SIZE_11_50', 'SIZE_51_100', 'SIZE_101_500', 'SIZE_500_PLUS']),

  // Admin user info
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required'),

  // Password
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const subdomain = watch('subdomain');

  // Check subdomain availability
  const checkSubdomain = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/tenants/check-subdomain/${subdomain}`);
      const data = await response.json();
      setSubdomainAvailable(data.available);
    } catch (err) {
      console.error('Error checking subdomain:', err);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create Firebase account
      const firebaseUser = await signUp(data.email, data.password);

      // 2. Register tenant in SALLY backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          subdomain: data.subdomain,
          dotNumber: data.dotNumber,
          fleetSize: data.fleetSize,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          firebaseUid: firebaseUser.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      // Success! Redirect to pending approval page
      router.push('/registration/pending-approval');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Register Your Organization</CardTitle>
        <CardDescription>
          Create an account to start managing your fleet with SALLY
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Company Information</h3>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                {...register('companyName')}
                placeholder="Acme Trucking"
                className="bg-background"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  {...register('subdomain')}
                  placeholder="acme-trucking"
                  onBlur={(e) => checkSubdomain(e.target.value)}
                  className="bg-background"
                />
                <span className="text-muted-foreground whitespace-nowrap">.sally.com</span>
              </div>
              {subdomainAvailable === false && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">Subdomain not available</p>
              )}
              {subdomainAvailable === true && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Subdomain available!</p>
              )}
              {errors.subdomain && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.subdomain.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dotNumber">DOT Number</Label>
              <Input
                id="dotNumber"
                {...register('dotNumber')}
                placeholder="12345678"
                maxLength={8}
                className="bg-background"
              />
              {errors.dotNumber && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.dotNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fleetSize">Fleet Size</Label>
              <Select onValueChange={(value) => setValue('fleetSize', value as any)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select fleet size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIZE_1_10">1-10 vehicles</SelectItem>
                  <SelectItem value="SIZE_11_50">11-50 vehicles</SelectItem>
                  <SelectItem value="SIZE_51_100">51-100 vehicles</SelectItem>
                  <SelectItem value="SIZE_101_500">101-500 vehicles</SelectItem>
                  <SelectItem value="SIZE_500_PLUS">500+ vehicles</SelectItem>
                </SelectContent>
              </Select>
              {errors.fleetSize && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.fleetSize.message}</p>
              )}
            </div>
          </div>

          {/* Admin User Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Admin User Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className="bg-background"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className="bg-background"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="bg-background"
              />
              {errors.email && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                className="bg-background"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className="bg-background"
              />
              {errors.password && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="bg-background"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
