"use client";

import { HistoryView } from "@/components/dashboard/HistoryView";
import { useEngineStore } from "@/lib/store/engineStore";

export default function HistoryPage() {
  const { history } = useEngineStore();

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <HistoryView history={history} />
    </div>
  );
}
