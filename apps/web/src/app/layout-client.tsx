'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { GlobalSallyChat } from '@/components/chat/GlobalSallyChat';
import { useChatStore } from '@/lib/store/chatStore';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDocked } = useChatStore();

  // Use new AppLayout for authenticated pages and tools
  const isAuthenticatedPage = pathname?.startsWith('/dispatcher') ||
                              pathname?.startsWith('/driver') ||
                              pathname?.startsWith('/settings') ||
                              pathname?.startsWith('/route-planner') ||
                              pathname?.startsWith('/rest-optimizer');

  if (isAuthenticatedPage) {
    return (
      <>
        <div className={`sally-chat-container ${isDocked ? 'docked' : ''}`}>
          <AppLayout>{children}</AppLayout>
        </div>
        <GlobalSallyChat />
      </>
    );
  }

  // Use old layout for landing page and other public pages
  return (
    <>
      <div className={`sally-chat-container ${isDocked ? 'docked' : ''}`}>
        <div className="flex h-screen flex-col bg-gray-50">
          <TopNavigation />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <GlobalSallyChat />
    </>
  );
}
