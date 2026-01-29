'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'DRIVER') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'DRIVER') {
    return null;
  }

  // Mock messages data
  const mockMessages = [
    {
      id: '1',
      type: 'alert',
      priority: 'high',
      title: 'Route Update',
      message: 'Your next stop has been updated due to traffic conditions.',
      timestamp: '10 minutes ago',
      read: false,
    },
    {
      id: '2',
      type: 'info',
      priority: 'medium',
      title: 'Rest Stop Reminder',
      message: 'Scheduled rest stop approaching in 30 minutes at Indio Rest Area.',
      timestamp: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      type: 'message',
      priority: 'low',
      title: 'Dispatch Message',
      message: 'Please confirm receipt of this message. Contact dispatch if you need assistance.',
      timestamp: '2 hours ago',
      read: true,
    },
  ];

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-gray-500 mt-1">View messages and alerts from dispatch</p>
      </div>

      {/* Message list */}
      <div className="space-y-4">
        {mockMessages.map((message) => (
          <Card
            key={message.id}
            className={message.read ? 'opacity-75' : 'border-l-4 border-l-black'}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getMessageIcon(message.type)}
                  <div>
                    <CardTitle className="text-lg">{message.title}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                  </div>
                </div>
                {getPriorityBadge(message.priority)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{message.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockMessages.length === 0 && (
        <Card>
          <CardContent className="py-20 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No Messages</p>
            <p className="text-sm mt-2">You're all caught up!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
