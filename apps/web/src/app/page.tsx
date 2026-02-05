"use client";

import { useAuthStore } from "@/features/auth";
import { LandingPage } from "@/shared/components/common/landing/LandingPage";

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  // Show landing page for all users
  // Authenticated users can view landing page and click "Home" to get here
  // They can navigate back to dashboard via header links or sidebar
  return <LandingPage />;
}
