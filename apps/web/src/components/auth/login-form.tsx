'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[LoginForm] Starting sign in...');
      const user = await signIn(data.email, data.password);
      console.log('[LoginForm] Sign in complete, user:', user);

      // Wait a tick to ensure Zustand persist has written to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify token is in storage
      const storage = localStorage.getItem('auth-storage');
      console.log('[LoginForm] Storage after sign in:', storage);

      if (!storage || !JSON.parse(storage).state?.accessToken) {
        console.error('[LoginForm] Token not in storage!');
        throw new Error('Authentication state not properly saved');
      }

      const storedState = JSON.parse(storage).state;
      console.log('[LoginForm] Token verified in storage:', {
        hasAccessToken: !!storedState.accessToken,
        tokenLength: storedState.accessToken?.length,
        isAuthenticated: storedState.isAuthenticated,
        isInitialized: storedState.isInitialized,
      });

      // Redirect based on role using client-side navigation
      const redirectMap = {
        SUPER_ADMIN: '/admin/tenants',
        OWNER: '/admin/dashboard',
        ADMIN: '/admin/dashboard',
        DISPATCHER: '/dispatcher/overview',
        DRIVER: '/driver/dashboard',
      };

      const redirectUrl = redirectMap[user?.role as keyof typeof redirectMap] || '/onboarding';
      console.log('[LoginForm] Redirecting to:', redirectUrl);
      router.push(redirectUrl); // Client-side navigation preserves state
    } catch (err: any) {
      // Handle errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.message?.includes('pending approval')) {
        setError('Your account is pending approval. Please check back later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In to SALLY</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@company.com"
              className="bg-background"
            />
            {errors.email && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.email.message}</p>
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

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register here
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
