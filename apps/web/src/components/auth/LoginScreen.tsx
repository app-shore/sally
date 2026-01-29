'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Truck, Users, Settings, ArrowLeft } from 'lucide-react';
import { listTenants, listUsersForTenant, login } from '@/lib/api/auth';
import { useSessionStore } from '@/lib/store/sessionStore';

interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain?: string;
  isActive: boolean;
}

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  driverId?: string;
  driverName?: string;
}

type LoginStep = 'tenant' | 'role' | 'user';

export function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('tenant');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant && selectedRole) {
      fetchUsers();
    }
  }, [selectedTenant, selectedRole]);

  const fetchTenants = async () => {
    try {
      const data = await listTenants();
      setTenants(data);
    } catch (err) {
      setError('Failed to load tenants');
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await listUsersForTenant(selectedTenant, selectedRole);
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const handleTenantSelect = (tenantId: string, tenantName: string) => {
    setSelectedTenant(tenantId);
    setSelectedTenantName(tenantName);
    setStep('role');
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setStep('user');
  };

  const handleLogin = async () => {
    if (!selectedTenant || !selectedUser) {
      setError('Please select a user');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await login({
        tenant_id: selectedTenant,
        user_id: selectedUser,
      });

      // Store session in Zustand store
      useSessionStore.getState().login(data.accessToken, {
        ...data.user,
        role: data.user.role as 'DISPATCHER' | 'DRIVER' | 'ADMIN',
      });

      // Redirect based on role
      if (data.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/dispatcher/overview');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'user') {
      setStep('role');
      setSelectedUser('');
    } else if (step === 'role') {
      setStep('tenant');
      setSelectedRole('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {step === 'tenant' && (
          <TenantSelectionStep key="tenant" tenants={tenants} onTenantSelect={handleTenantSelect} />
        )}
        {step === 'role' && (
          <RoleSelectionStep key="role" tenantName={selectedTenantName} onRoleSelect={handleRoleSelect} onBack={handleBack} />
        )}
        {step === 'user' && (
          <UserSelectionStep
            key="user"
            users={users}
            selectedUser={selectedUser}
            onUserSelect={setSelectedUser}
            onSubmit={handleLogin}
            onBack={handleBack}
            isLoading={isLoading}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TenantSelectionStep({ tenants, onTenantSelect }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-center mb-8">Select Your Fleet Company</h2>
        <div className="space-y-4">
          {tenants.map((tenant: Tenant, index: number) => (
            <motion.button
              key={tenant.tenantId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTenantSelect(tenant.tenantId, tenant.companyName)}
              className="w-full bg-card border-2 border-border rounded-xl p-6 text-left hover:border-foreground hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-foreground rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold truncate">{tenant.companyName}</h3>
                  <p className="text-sm text-muted-foreground truncate">{tenant.subdomain ? `${tenant.subdomain}.sally.app` : tenant.tenantId}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RoleSelectionStep({ tenantName, onRoleSelect, onBack }: any) {
  const roles = [
    { id: 'DISPATCHER', title: "I'm a Dispatcher", description: 'Manage routes & monitor fleet', icon: <Users className="w-8 h-8" /> },
    { id: 'DRIVER', title: "I'm a Driver", description: 'View routes & receive updates', icon: <Truck className="w-8 h-8" /> },
    { id: 'ADMIN', title: "I'm an Admin", description: 'Manage users & settings', icon: <Settings className="w-8 h-8" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl">
      <button onClick={onBack} className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" />Back
      </button>
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold tracking-tight mb-2">{tenantName}</h1>
      </div>
      <h2 className="text-2xl font-semibold text-center mb-8">Select Your Role</h2>
      <div className="space-y-4">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRoleSelect(role.id)}
            className="w-full bg-card border-2 border-border rounded-xl p-6 text-left hover:border-foreground hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-foreground text-background p-4 rounded-xl">{role.icon}</div>
              <div>
                <h3 className="text-xl font-semibold mb-1">{role.title}</h3>
                <p className="text-muted-foreground">{role.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function UserSelectionStep({ users, selectedUser, onUserSelect, onSubmit, onBack, isLoading, error }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl">
      <button onClick={onBack} className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" />Back
      </button>
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-4">Select User</h1>
        <p className="text-muted-foreground">Choose your account to continue</p>
      </div>
      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
        {users.map((user: User, index: number) => (
          <motion.button
            key={user.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onUserSelect(user.userId)}
            className={`w-full border-2 rounded-xl p-4 text-left transition-all ${selectedUser === user.userId ? 'border-foreground bg-accent shadow-md' : 'border-border hover:border-muted-foreground'}`}
          >
            <div className="font-semibold">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            {user.driverName && <div className="text-xs text-muted-foreground mt-1">Driver: {user.driverName} ({user.driverId})</div>}
          </motion.button>
        ))}
      </div>
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </motion.div>
      )}
      <button
        onClick={onSubmit}
        disabled={!selectedUser || isLoading}
        className="w-full px-6 py-4 bg-foreground text-background rounded-xl text-lg font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </motion.div>
  );
}
