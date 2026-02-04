"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DriverPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard page
    router.replace("/driver/dashboard");
  }, [router]);

  return null;
}
