"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DispatcherPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to command center
    router.replace("/dispatcher/command-center");
  }, [router]);

  return null;
}
