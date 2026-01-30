import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const {
    user,
    firebaseUser,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  } = useAuthStore();

  return {
    user,
    firebaseUser,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    // Convenience checks
    isAdmin: user?.role === 'ADMIN',
    isDispatcher: user?.role === 'DISPATCHER',
    isDriver: user?.role === 'DRIVER',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  };
};
