import { PrismaClient } from '@prisma/client';

/**
 * Sample notifications for demo/testing.
 *
 * Creates in-app notifications for existing users.
 * Queries DB for users — if only super admin exists, creates notifications for them.
 */

const notificationData = [
  {
    type: 'ROUTE_PLANNED',
    category: 'OPERATIONS',
    title: 'Route Planned Successfully',
    message: 'Route RP-100 for driver Mike Johnson has been optimized with 5 stops and 2 rest breaks.',
    iconType: 'route',
    actionUrl: '/dispatcher/active-routes',
    actionLabel: 'View Route',
  },
  {
    type: 'INTEGRATION_SYNCED',
    category: 'SYSTEM',
    title: 'Samsara ELD Synced',
    message: 'Successfully synced HOS data for 12 drivers. All records up to date.',
    iconType: 'integration',
  },
  {
    type: 'USER_JOINED',
    category: 'TEAM',
    title: 'New Team Member',
    message: 'Sarah Chen has joined as a Dispatcher. They can now access the command center.',
    iconType: 'user',
    actionUrl: '/users',
    actionLabel: 'View Team',
  },
  {
    type: 'LOAD_ASSIGNED',
    category: 'OPERATIONS',
    title: 'Load Assigned to Driver',
    message: 'Load #4521 (Walmart DC) assigned to Tom Williams on route RP-102.',
    iconType: 'route',
  },
  {
    type: 'DISPATCH_MESSAGE',
    category: 'COMMUNICATIONS',
    title: 'Message from Driver',
    message: 'Lisa Park: "Arrived at dock, waiting for unloading. ETA 45 min."',
    iconType: 'message',
    actionUrl: '/driver/messages',
    actionLabel: 'Reply',
  },
  {
    type: 'INTEGRATION_FAILED',
    category: 'SYSTEM',
    title: 'Weather API Warning',
    message: 'Weather data provider returned partial data. Some route weather forecasts may be incomplete.',
    iconType: 'integration',
  },
  {
    type: 'ROUTE_UPDATED',
    category: 'OPERATIONS',
    title: 'Route Re-optimized',
    message: 'Route RP-101 was automatically re-planned due to road closure on I-81. New ETA: 4:30 PM.',
    iconType: 'route',
    actionUrl: '/dispatcher/active-routes',
    actionLabel: 'View Changes',
  },
  {
    type: 'DRIVER_ACTIVATED',
    category: 'TEAM',
    title: 'Driver Activated',
    message: 'James Rodriguez has been activated and is ready for route assignments.',
    iconType: 'user',
    actionUrl: '/drivers',
    actionLabel: 'View Drivers',
  },
  {
    type: 'SCHEDULE_CHANGED',
    category: 'OPERATIONS',
    title: 'Delivery Window Changed',
    message: 'Target DC #1022 updated their receiving window to 8:00 AM - 2:00 PM. Affected route: RP-102.',
    iconType: 'route',
  },
  {
    type: 'SETTINGS_UPDATED',
    category: 'SYSTEM',
    title: 'Alert Preferences Updated',
    message: 'Your notification preferences have been updated. Critical alerts will now trigger SMS notifications.',
    iconType: 'integration',
  },
];

export const seed = {
  name: 'Sample Notifications',
  description: 'Creates 10 sample in-app notifications for testing the notification center',

  async run(prisma: PrismaClient): Promise<{ created: number; skipped: number }> {
    // Check if notifications already exist (idempotent)
    const existingCount = await prisma.notification.count();
    if (existingCount > 0) {
      return { created: 0, skipped: existingCount };
    }

    // Find a user to receive notifications (prefer non-super-admin, fallback to any)
    const user = await prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      console.log('  No users found. Run 01-super-admin seed first.');
      return { created: 0, skipped: 0 };
    }

    // Find tenant (notifications need tenant context)
    const tenantId = user.tenantId ?? undefined;

    let created = 0;

    for (const notification of notificationData) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            tenantId: tenantId ?? null,
            type: notification.type as any,
            category: notification.category,
            title: notification.title,
            message: notification.message,
            iconType: notification.iconType,
            actionUrl: notification.actionUrl ?? null,
            actionLabel: notification.actionLabel ?? null,
            channel: 'IN_APP',
            status: 'SENT',
            recipient: '',
            sentAt: new Date(),
          },
        });
        created++;
      } catch (error: any) {
        console.log(`  Warning: Failed to create ${notification.type}: ${error.message}`);
      }
    }

    return { created, skipped: 0 };
  },
};
