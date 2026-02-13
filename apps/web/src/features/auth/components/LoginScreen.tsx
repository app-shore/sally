'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Building2, Loader2, ArrowLeft } from 'lucide-react';
import { lookupUser, login as loginAPI, type UserLookupResult } from '@/features/auth';
import { useAuthStore } from '@/features/auth';
import { validateEmail } from '@/shared/lib/validation';

type LoginStep = 'email' | 'tenant-select' | 'loading';

export function LoginScreen() {
  const router = useRouter();
  const authStore = useAuthStore();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState<UserLookupResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'Invalid email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await lookupUser({ email: email.trim().toLowerCase() });
      setUsers(result.users);

      if (result.multiTenant) {
        // Multiple tenants found - show selector
        setStep('tenant-select');
        setIsLoading(false);
      } else {
        // Single tenant - auto-login
        await handleLogin(result.users[0].userId);
      }
    } catch (err: any) {
      setError(err.message || 'User not found. Please check your email.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginAPI({ user_id: userId });
      authStore.setTokens(response.accessToken, response.refreshToken || '');
      authStore.setUser(response.user);

      // Redirect based on role
      if (response.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/dispatcher/command-center');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setUsers([]);
    setSelectedUser(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {step === 'email' && (
          <EmailStep
            key="email"
            email={email}
            setEmail={setEmail}
            onSubmit={handleEmailSubmit}
            isLoading={isLoading}
            error={error}
          />
        )}
        {step === 'tenant-select' && (
          <TenantSelectStep
            key="tenant"
            users={users}
            selectedUser={selectedUser}
            onUserSelect={setSelectedUser}
            onSubmit={() => selectedUser && handleLogin(selectedUser)}
            onBack={handleBack}
            isLoading={isLoading}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface EmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
}

function EmailStep({ email, setEmail, onSubmit, isLoading, error }: EmailStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-bold tracking-tight mb-2 font-space-grotesk">SALLY</h1>
        <p className="text-xl text-muted-foreground">
          Intelligent Dispatch & Driver Coordination
        </p>
      </motion.div>

      {/* Email Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-xl
                       focus:border-foreground focus:outline-none transition-colors
                       text-lg bg-background text-foreground"
              disabled={isLoading}
              autoFocus
              autoComplete="email"
            />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200
                     dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full px-6 py-4 bg-foreground text-background rounded-xl
                   text-lg font-semibold hover:bg-foreground/90
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all hover:scale-[1.02] active:scale-[0.98]
                   flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Looking up...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Help Text */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Enter your work email to get started
      </p>
    </motion.div>
  );
}

interface TenantSelectStepProps {
  users: UserLookupResult[];
  selectedUser: string | null;
  onUserSelect: (userId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

function TenantSelectStep({
  users,
  selectedUser,
  onUserSelect,
  onSubmit,
  onBack,
  isLoading,
  error,
}: TenantSelectStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl"
    >
      <button
        onClick={onBack}
        disabled={isLoading}
        className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-4">Select Your Workspace</h1>
        <p className="text-muted-foreground">
          Your email is associated with multiple organizations
        </p>
      </div>

      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
        {users.map((user, index) => (
          <motion.button
            key={user.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onUserSelect(user.userId)}
            disabled={isLoading}
            className={`w-full border-2 rounded-xl p-6 text-left transition-all disabled:opacity-50
              ${
                selectedUser === user.userId
                  ? 'border-foreground bg-accent shadow-md'
                  : 'border-border hover:border-muted-foreground'
              }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-foreground rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-background" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">{user.tenantName}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user.firstName} {user.lastName} • {user.role}
                </p>
                {user.driverName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Driver: {user.driverName}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200
                   dark:border-red-900 rounded-lg text-red-700 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      <button
        onClick={onSubmit}
        disabled={!selectedUser || isLoading}
        className="w-full px-6 py-4 bg-foreground text-background rounded-xl
                 text-lg font-semibold hover:bg-foreground/90
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-all hover:scale-[1.02] active:scale-[0.98]
                 flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Logging in...</span>
          </>
        ) : (
          <span>Continue</span>
        )}
      </button>
    </motion.div>
  );
}

export default LoginScreen;
