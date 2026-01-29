'use client';

import { useSessionStore } from "@/lib/store/sessionStore";
import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  const { isAuthenticated } = useSessionStore();

  // Show landing page for all users
  // Authenticated users can view landing page and click "Home" to get here
  // They can navigate back to dashboard via header links or sidebar
  return <LandingPage />;
}
