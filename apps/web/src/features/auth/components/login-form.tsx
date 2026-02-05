'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useAuth } from '@/features/auth';

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
  const [emailValid, setEmailValid] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  // Validate email on blur
  const handleEmailBlur = async () => {
    const isValid = await trigger('email');
    setEmailValid(isValid && !!emailValue);
  };

  // Validate email on Enter key
  const handleEmailKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isValid = await trigger('email');
      if (isValid && !!emailValue) {
        setEmailValid(true);
        // Focus password field after a short delay for animation
        setTimeout(() => {
          document.getElementById('password')?.focus();
        }, 100);
      }
    }
  };

  // Submit form on Enter key in password field
  const handlePasswordKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && passwordValue) {
      e.preventDefault();
      await handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[LoginForm] Starting sign in...');
      const user = await signIn(data.email, data.password);
      console.log('[LoginForm] Sign in complete, user:', user);

      if (!user) {
        throw new Error('Sign in failed - no user returned');
      }

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

      const redirectUrl = redirectMap[user.role as keyof typeof redirectMap] || '/onboarding';
      console.log('[LoginForm] Redirecting to:', redirectUrl, 'for role:', user.role);

      // Use Next.js router for client-side navigation
      router.push(redirectUrl);
    } catch (err: any) {
      console.error('[LoginForm] Error during sign in:', err);

      // User-friendly error messages (hide Firebase implementation details)
      let userMessage = 'Login failed. Please try again.';

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        userMessage = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        userMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        userMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (err.code === 'auth/invalid-credential') {
        userMessage = 'Invalid email or password. Please try again.';
      } else if (err.message?.includes('pending approval')) {
        userMessage = 'Your account is pending approval. Please check back later.';
      } else if (err.message && !err.message.includes('Firebase') && !err.message.includes('auth/')) {
        userMessage = err.message;
      }

      setError(userMessage);
      setIsLoading(false);
    }
  };

  const showPasswordField = emailValid;
  const showSubmitButton = emailValid && passwordValue;

  return (
    <div className="w-full max-w-[500px] mx-auto relative isolate">
      {/* SALLY Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-4 text-gradient font-space-grotesk">
          SALLY
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Sign In
        </h2>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Global Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Input */}
        <div>
          <Input
            id="email"
            type="email"
            {...register('email')}
            onBlur={handleEmailBlur}
            onKeyDown={handleEmailKeyDown}
            placeholder="Enter your email"
            disabled={isLoading}
            className={`
              relative w-full text-xl md:text-2xl py-6 px-8
              border-2 transition-all duration-200
              bg-background rounded-lg
              focus:scale-[1.01]
              focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
              ${errors.email ? 'border-red-500 dark:border-red-400' : 'border-border focus:border-foreground'}
            `}
          />
          <AnimatePresence mode="wait">
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
              >
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password Input (reveals when email is valid) */}
        <AnimatePresence mode="wait">
          {showPasswordField && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Input
                id="password"
                type="password"
                {...register('password')}
                onKeyDown={handlePasswordKeyDown}
                placeholder="Enter your password"
                disabled={isLoading}
                className={`
                  relative w-full text-xl md:text-2xl py-6 px-8
                  border-2 transition-all duration-200
                  bg-background rounded-lg
                  focus:scale-[1.01]
                  focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
                  ${errors.password ? 'border-red-500 dark:border-red-400' : 'border-border focus:border-foreground'}
                `}
              />
              <AnimatePresence mode="wait">
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button (appears when both fields have values) */}
        <AnimatePresence mode="wait">
          {showSubmitButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-xl bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Register Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8 pt-8 border-t border-border"
        >
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-foreground font-semibold hover:underline transition-colors">
              Register here
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </div>
  );
}

export default LoginForm;
