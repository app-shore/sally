'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  phone: z.string()
    .min(10, 'Phone number is required')
    .regex(/^\(\d{3}\)\s\d{3}-\d{4}$/, 'Invalid phone format'),

  // Password
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

type Step = 1 | 2 | 3;

export function RegistrationForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
  });

  const subdomain = watch('subdomain');
  const watchAllFields = watch();

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

  // Validate current step fields
  const validateStep = async (step: Step): Promise<boolean> => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ['companyName', 'subdomain', 'dotNumber', 'fleetSize'];
    } else if (step === 2) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'phone'];
    } else if (step === 3) {
      fieldsToValidate = ['password', 'confirmPassword'];
    }

    const result = await trigger(fieldsToValidate);
    return result && (step !== 1 || subdomainAvailable === true);
  };

  // Check if current step is valid
  const isStepValid = (): boolean => {
    if (currentStep === 1) {
      return !!(
        watchAllFields.companyName &&
        watchAllFields.subdomain &&
        watchAllFields.dotNumber?.length === 8 &&
        watchAllFields.fleetSize &&
        subdomainAvailable === true &&
        !errors.companyName &&
        !errors.subdomain &&
        !errors.dotNumber
      );
    } else if (currentStep === 2) {
      return !!(
        watchAllFields.firstName &&
        watchAllFields.lastName &&
        watchAllFields.email &&
        watchAllFields.phone &&
        !errors.firstName &&
        !errors.lastName &&
        !errors.email &&
        !errors.phone
      );
    } else if (currentStep === 3) {
      return !!(
        watchAllFields.password &&
        watchAllFields.confirmPassword &&
        !errors.password &&
        !errors.confirmPassword
      );
    }
    return false;
  };

  // Navigate to next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setDirection('forward');
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(watchAllFields.password || '');

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[RegistrationForm] Starting registration...');
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

      console.log('[RegistrationForm] Registration successful, redirecting...');
      // Success! Redirect to pending approval page
      router.push('/registration/pending-approval');
    } catch (err: any) {
      console.error('[RegistrationForm] Registration error:', err);

      // User-friendly error messages (hide Firebase implementation details)
      let userMessage = 'Registration failed. Please try again.';

      if (err.code === 'auth/email-already-in-use') {
        userMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        userMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        userMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/network-request-failed') {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message && !err.message.includes('Firebase')) {
        userMessage = err.message;
      }

      setError(userMessage);
      setIsLoading(false);
    }
  };

  // Slide animation variants
  const slideVariants = {
    enter: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full max-w-[600px] mx-auto relative isolate">
      {/* SALLY Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-3 text-gradient font-space-grotesk">
          SALLY
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          Register Your Organization
        </h2>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                step === currentStep
                  ? 'bg-foreground scale-125'
                  : step < currentStep
                  ? 'bg-foreground/50'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Step {currentStep} of 3</p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        {/* Step Content with Slide Animation */}
        <div className="relative overflow-visible min-h-[450px]">
          <AnimatePresence mode="wait" custom={direction}>
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-x-0 space-y-5"
              >
                <h3 className="text-xl font-bold text-foreground mb-6">Company Information</h3>

                {/* Company Name */}
                <div>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="Company Name"
                    disabled={isLoading}
                    autoComplete="off"
                    className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                  />
                  <AnimatePresence mode="wait">
                    {errors.companyName && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.companyName.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Subdomain */}
                <div>
                  <div className="relative">
                    <Input
                      id="subdomain"
                      {...register('subdomain')}
                      placeholder="acme-trucking"
                      onBlur={(e) => checkSubdomain(e.target.value)}
                      disabled={isLoading}
                      autoComplete="off"
                      className="relative w-full text-lg py-5 px-6 pr-[140px] border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none">
                      .sally.com
                    </span>
                  </div>

                  {/* Helper text - always visible */}
                  {!errors.subdomain && !subdomainAvailable && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-muted-foreground mt-2 ml-2"
                    >
                      Your unique URL (e.g., acme-trucking.sally.com)
                    </motion.p>
                  )}

                  <AnimatePresence mode="wait">
                    {subdomainAvailable === false && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        Subdomain not available - try another
                      </motion.p>
                    )}
                    {subdomainAvailable === true && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-green-600 dark:text-green-400 mt-2 ml-2"
                      >
                        ✓ Available! Your team will access SALLY at {subdomain}.sally.com
                      </motion.p>
                    )}
                    {errors.subdomain && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.subdomain.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* DOT Number */}
                <div>
                  <Input
                    id="dotNumber"
                    {...register('dotNumber')}
                    placeholder="12345678"
                    maxLength={8}
                    disabled={isLoading}
                    autoComplete="off"
                    className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                  />

                  {/* Helper text - always visible when no error */}
                  {!errors.dotNumber && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-muted-foreground mt-2 ml-2"
                    >
                      US DOT Number (8 digits)
                    </motion.p>
                  )}

                  <AnimatePresence mode="wait">
                    {errors.dotNumber && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.dotNumber.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fleet Size */}
                <div>
                  <Select onValueChange={(value) => setValue('fleetSize', value as any)} disabled={isLoading}>
                    <SelectTrigger className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground h-auto">
                      <SelectValue placeholder="Select Fleet Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIZE_1_10">1-10 vehicles</SelectItem>
                      <SelectItem value="SIZE_11_50">11-50 vehicles</SelectItem>
                      <SelectItem value="SIZE_51_100">51-100 vehicles</SelectItem>
                      <SelectItem value="SIZE_101_500">101-500 vehicles</SelectItem>
                      <SelectItem value="SIZE_500_PLUS">500+ vehicles</SelectItem>
                    </SelectContent>
                  </Select>
                  <AnimatePresence mode="wait">
                    {errors.fleetSize && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.fleetSize.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-x-0 space-y-5"
              >
                <h3 className="text-xl font-bold text-foreground mb-6">Admin User Information</h3>

                {/* First Name + Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      placeholder="First Name"
                      disabled={isLoading}
                      autoComplete="given-name"
                      className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                    />
                    <AnimatePresence mode="wait">
                      {errors.firstName && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                        >
                          {errors.firstName.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      placeholder="Last Name"
                      disabled={isLoading}
                      autoComplete="family-name"
                      className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                    />
                    <AnimatePresence mode="wait">
                      {errors.lastName && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                        >
                          {errors.lastName.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Email Address"
                    disabled={isLoading}
                    autoComplete="email"
                    className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                  />
                  <AnimatePresence mode="wait">
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.email.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Phone */}
                <div>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none flex items-center gap-2 z-10">
                      <span className="text-lg">🇺🇸</span>
                      <span>+1</span>
                      <span className="text-border">|</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      placeholder="(555) 123-4567"
                      disabled={isLoading}
                      maxLength={14}
                      autoComplete="tel"
                      onChange={(e) => {
                        // Format phone number as user types
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 6) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                        } else if (value.length >= 3) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        }
                        e.target.value = value;
                        register('phone').onChange(e);
                      }}
                      className="relative w-full text-lg py-5 pl-28 pr-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    {errors.phone && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.phone.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-x-0 space-y-5"
              >
                <h3 className="text-xl font-bold text-foreground mb-6">Security</h3>

                {/* Password */}
                <div>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="Password (min 8 characters)"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                  />

                  {/* Password Strength Indicator */}
                  {watchAllFields.password && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength.strength}%` }}
                            transition={{ duration: 0.3 }}
                            className={`h-full ${passwordStrength.color}`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground min-w-[60px]">
                          {passwordStrength.label}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence mode="wait">
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.password.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm Password */}
                <div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="Confirm Password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="relative w-full text-lg py-5 px-6 border-2 transition-all duration-200 bg-background rounded-lg focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-border focus:border-foreground"
                  />
                  <AnimatePresence mode="wait">
                    {errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-2 ml-2"
                      >
                        {errors.confirmPassword.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4">
          {/* Back Button */}
          {currentStep > 1 && (
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              disabled={isLoading}
              className="px-8 py-5 text-lg border-2 hover:scale-[1.02] transition-all"
            >
              Back
            </Button>
          )}

          {/* Spacer for alignment when no back button */}
          {currentStep === 1 && <div />}

          {/* Continue / Submit Button */}
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid() || isLoading}
              className="px-8 py-5 text-lg bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl ml-auto"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!isStepValid() || isLoading}
              className="px-8 py-5 text-lg bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl ml-auto"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          )}
        </div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8 pt-8 border-t border-border"
        >
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground font-semibold hover:underline transition-colors">
              Sign in here
            </Link>
          </p>
        </motion.div>
      </form>
    </div>
  );
}

export default RegistrationForm;
