'use client';

import { FloatingSallyButton } from './FloatingSallyButton';
import { SallyChatPanel } from './SallyChatPanel';
import { useChatStore } from '@/lib/store/chatStore';
import { usePathname } from 'next/navigation';

export function GlobalSallyChat() {
  const { isOpen, setIsOpen } = useChatStore();
  const pathname = usePathname();

  // Determine user type based on path
  const getUserType = (): 'customer' | 'dispatcher' | 'driver' => {
    if (pathname?.startsWith('/dispatcher')) return 'dispatcher';
    if (pathname?.startsWith('/driver')) return 'driver';
    return 'customer';
  };

  return (
    <>
      {/* Floating button - only show when chat is closed */}
      <FloatingSallyButton
        onClick={() => setIsOpen(true)}
        isOpen={isOpen}
      />

      {/* Chat Panel - Always docked to right */}
      <SallyChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userType={getUserType()}
      />
    </>
  );
}
