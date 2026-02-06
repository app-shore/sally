# Super Admin Tenant Management & Settings - Design Document

**Date:** February 6, 2026
**Status:** Ready for Implementation
**Author:** AI Brainstorming Session

## Executive Summary

This design document outlines the comprehensive multi-tenant admin features for SALLY's super admin portal. The design includes enhanced tenant management with full lifecycle support (approve, reject, suspend, reactivate), a dedicated super admin settings page for personal preferences, and fixes for the settings navigation routing issue.

**Reading Time:** 15 minutes
**Audience:** Developers, Product Managers

---

## Problem Statement

### Current Limitations

1. **Limited Tenant Visibility**
   - Super admins can only see tenants with status `PENDING_APPROVAL`
   - No way to view active, suspended, or rejected tenants
   - No tenant lifecycle management beyond approve/reject

2. **Missing Tenant Management Actions**
   - Cannot suspend misbehaving or non-paying tenants
   - Cannot reactivate suspended tenants
   - Cannot view detailed tenant information
   - No audit trail for tenant status changes

3. **Broken Settings Navigation**
   - Super admins clicking "Settings" in header menu go to `/settings/preferences`
   - `/settings/*` routes are designed for tenant users (fleet, operations, integrations)
   - Super admins see irrelevant settings or broken pages
   - No dedicated settings page for super admin personal preferences

### User Requirements

**As a Super Admin, I need to:**
- View all tenants across all statuses (pending, active, suspended, rejected)
- Approve or reject pending tenant registrations
- Suspend active tenants (for policy violations, non-payment, etc.)
- Reactivate suspended tenants (after issues resolved)
- View detailed tenant information (users, activity metrics)
- Manage my personal profile and notification preferences
- Access settings appropriate to my role

---

## Design Decisions

### Key Choices Made

1. **Scope: Basic Management** (MVP)
   - View all tenants with status filters
   - Approve/reject pending tenants
   - Suspend/reactivate active tenants
   - View tenant details and metrics
   - ❌ Excluded: Delete tenants, edit tenant info, bulk operations (future phases)

2. **UI Pattern: Single Tabbed View**
   - One page with tabs: Pending | Active | Suspended | Rejected
   - Each tab shows relevant tenants with status-specific actions
   - Clean separation, easy navigation between statuses
   - Tab badges show counts

3. **Navigation: Separate Admin Portal**
   - Super admin has dedicated section at `/admin/*`
   - Clear separation from tenant-specific features
   - Navigation items: Dashboard, Tenants, Feature Flags, Settings

4. **Settings: Smart Role-Based Routing**
   - Super Admin → `/admin/settings` (personal profile only)
   - Other roles → `/settings/preferences` (existing behavior)
   - Clean separation of concerns

---

## Architecture Overview

### Three-Layer Enhancement

This design enhances the existing platform admin layer:

```
Frontend Layer (Next.js)
├── (super-admin)/admin/tenants     # Enhanced with tabs
├── (super-admin)/admin/settings    # NEW - Personal settings
└── UserProfileMenu                  # Enhanced with smart routing

Backend Layer (NestJS)
├── TenantsController               # Enhanced with suspend/reactivate/details
├── TenantsService                  # New business logic
└── PreferencesController           # NEW - Super admin preferences

Database Layer (PostgreSQL)
├── tenants table                   # Enhanced with suspension tracking
└── super_admin_preferences table   # NEW - Notification preferences
```

---

## Frontend Design

### Page Structure

```
apps/web/src/app/(super-admin)/admin/
├── tenants/
│   └── page.tsx                           # ENHANCED - Tabbed tenant management
├── feature-flags/
│   └── page.tsx                           # EXISTING - No changes
└── settings/
    └── page.tsx                           # NEW - Super admin personal settings
```

### Component Structure

```
apps/web/src/features/platform/admin/components/
├── tenant-list.tsx                        # DEPRECATED - Replace with new components
├── tenant-management-tabs.tsx             # NEW - Main tabbed interface
├── tenant-table.tsx                       # NEW - Reusable table for all tabs
├── reject-tenant-dialog.tsx               # NEW - Rejection dialog
├── suspend-tenant-dialog.tsx              # NEW - Suspension dialog
├── reactivate-tenant-dialog.tsx           # NEW - Reactivation confirmation
└── tenant-details-dialog.tsx              # NEW - Full tenant details modal
```

### Tenant Management Page - Tabbed Interface

**Location:** `/apps/web/src/app/(super-admin)/admin/tenants/page.tsx`

**Component Hierarchy:**

```typescript
TenantManagementPage
├── Header (title + description)
├── Tabs Component (Shadcn UI)
│   ├── Pending Tab
│   │   └── TenantTable (with Approve/Reject actions)
│   ├── Active Tab
│   │   └── TenantTable (with Suspend/View Details actions)
│   ├── Suspended Tab
│   │   └── TenantTable (with Reactivate/View Details actions)
│   └── Rejected Tab
│       └── TenantTable (with View Details action)
└── Dialogs
    ├── RejectTenantDialog (reason input)
    ├── SuspendTenantDialog (reason input)
    ├── ReactivateTenantDialog (confirmation)
    └── TenantDetailsDialog (full tenant info modal)
```

**Tab Badges:**

Each tab shows a count badge:
- `Pending (3)` - Number of pending approvals
- `Active (45)` - Number of active tenants
- `Suspended (2)` - Number of suspended tenants
- `Rejected (5)` - Number of rejected tenants

**Table Columns (Consistent across all tabs):**

1. **Company** - Company name (bold, primary)
2. **Subdomain** - `subdomain.sally.com` (monospace badge)
3. **DOT Number** - DOT number
4. **Fleet Size** - Badge with size range (e.g., "11-50")
5. **Admin User** - Owner name + email (small text)
6. **Status Date** - Date based on tab:
   - Pending: Registration date
   - Active: Approval date
   - Suspended: Suspension date
   - Rejected: Rejection date
7. **Actions** - Status-specific action buttons

**Actions per Tab:**

**Pending Tab:**
- ✅ **Approve** (green button) - Approves tenant, activates users, sends email
- ❌ **Reject** (red outline button) - Opens RejectTenantDialog
- 👁️ **View Details** (ghost button) - Opens TenantDetailsDialog

**Active Tab:**
- ⏸️ **Suspend** (yellow outline button) - Opens SuspendTenantDialog
- 👁️ **View Details** (ghost button) - Opens TenantDetailsDialog

**Suspended Tab:**
- ▶️ **Reactivate** (green outline button) - Opens ReactivateTenantDialog
- 👁️ **View Details** (ghost button) - Opens TenantDetailsDialog

**Rejected Tab:**
- 👁️ **View Details** (ghost button) - Opens TenantDetailsDialog
- Shows rejection reason in table row

### Reusable TenantTable Component

```typescript
interface TenantTableProps {
  tenants: Tenant[];
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  onApprove?: (tenant: Tenant) => void;
  onReject?: (tenant: Tenant) => void;
  onSuspend?: (tenant: Tenant) => void;
  onReactivate?: (tenant: Tenant) => void;
  onViewDetails?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

// Usage example in Pending tab:
<TenantTable
  tenants={pendingTenants}
  status="PENDING_APPROVAL"
  onApprove={handleApprove}
  onReject={handleReject}
  onViewDetails={handleViewDetails}
  isLoading={isLoading}
/>
```

### Dialog Components

#### Dialog 1: Reject Tenant Dialog

```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Reject Tenant Registration</DialogTitle>
    <DialogDescription>
      Provide a reason for rejecting {companyName}
    </DialogDescription>
  </DialogHeader>
  <DialogContent>
    <div className="space-y-2">
      <Label htmlFor="reason">Rejection Reason *</Label>
      <Textarea
        id="reason"
        value={rejectionReason}
        onChange={(e) => setRejectionReason(e.target.value)}
        placeholder="e.g., Invalid DOT number, duplicate registration..."
        rows={4}
        className="bg-background"
      />
    </div>
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={onCancel}>Cancel</Button>
    <Button
      variant="destructive"
      onClick={onConfirm}
      disabled={!rejectionReason.trim()}
    >
      Reject Tenant
    </Button>
  </DialogFooter>
</Dialog>
```

#### Dialog 2: Suspend Tenant Dialog

```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Suspend Tenant</DialogTitle>
    <DialogDescription>
      Suspending {companyName} will disable access for all users
    </DialogDescription>
  </DialogHeader>
  <DialogContent className="space-y-4">
    <Alert>
      <AlertDescription>
        ⚠️ All users will be logged out and unable to access the system
      </AlertDescription>
    </Alert>
    <div className="space-y-2">
      <Label htmlFor="reason">Suspension Reason *</Label>
      <Textarea
        id="reason"
        value={suspensionReason}
        onChange={(e) => setSuspensionReason(e.target.value)}
        placeholder="e.g., Payment overdue, policy violation..."
        rows={4}
        className="bg-background"
      />
    </div>
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={onCancel}>Cancel</Button>
    <Button
      variant="destructive"
      onClick={onConfirm}
      disabled={!suspensionReason.trim()}
    >
      Suspend Tenant
    </Button>
  </DialogFooter>
</Dialog>
```

#### Dialog 3: Reactivate Tenant Dialog

```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Reactivate Tenant</DialogTitle>
    <DialogDescription>
      Reactivating {companyName} will restore access for all users
    </DialogDescription>
  </DialogHeader>
  <DialogContent className="space-y-4">
    <Alert>
      <AlertDescription>
        ✅ Users will be able to log in and access the system again
      </AlertDescription>
    </Alert>
    <div className="text-sm text-muted-foreground">
      <p className="font-medium">Previous suspension reason:</p>
      <p className="mt-1 italic">{suspensionReason}</p>
    </div>
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={onCancel}>Cancel</Button>
    <Button onClick={onConfirm}>Reactivate Tenant</Button>
  </DialogFooter>
</Dialog>
```

#### Dialog 4: Tenant Details Dialog

```typescript
<Dialog size="large">
  <DialogHeader>
    <DialogTitle>{companyName} - Details</DialogTitle>
  </DialogHeader>
  <DialogContent>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="users">Users ({userCount})</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {/* Company Information */}
        <div>
          <h4 className="font-semibold mb-2">Company Information</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Company Name:</dt>
            <dd className="font-medium">{companyName}</dd>

            <dt className="text-muted-foreground">Subdomain:</dt>
            <dd><code className="bg-muted px-1 py-0.5 rounded">{subdomain}.sally.com</code></dd>

            <dt className="text-muted-foreground">DOT Number:</dt>
            <dd>{dotNumber}</dd>

            <dt className="text-muted-foreground">Fleet Size:</dt>
            <dd><Badge variant="muted">{fleetSize}</Badge></dd>
          </dl>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="font-semibold mb-2">Contact Information</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Email:</dt>
            <dd>{contactEmail}</dd>

            <dt className="text-muted-foreground">Phone:</dt>
            <dd>{contactPhone}</dd>
          </dl>
        </div>

        {/* Status History */}
        <div>
          <h4 className="font-semibold mb-2">Status History</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge>{currentStatus}</Badge>
              <span className="text-muted-foreground">Current Status</span>
            </div>
            {approvedAt && (
              <div className="text-muted-foreground">
                Approved on {formatDate(approvedAt)} by {approvedBy}
              </div>
            )}
            {suspendedAt && (
              <div className="text-muted-foreground">
                Suspended on {formatDate(suspendedAt)} by {suspendedBy}
                <p className="italic mt-1">Reason: {suspensionReason}</p>
              </div>
            )}
            {rejectedAt && (
              <div className="text-muted-foreground">
                Rejected on {formatDate(rejectedAt)}
                <p className="italic mt-1">Reason: {rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="users">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.userId}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell><Badge variant="muted">{user.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="activity" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDrivers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalVehicles}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Route Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalRoutePlans}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Account Timeline</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Account Created:</dt>
              <dd>{formatDate(createdAt)}</dd>
            </div>
            {approvedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved:</dt>
                <dd>{formatDate(approvedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

### Super Admin Settings Page

**Location:** `/apps/web/src/app/(super-admin)/admin/settings/page.tsx`

**Layout:**

```typescript
<div className="space-y-6">
  {/* Header */}
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-foreground">
      Settings
    </h1>
    <p className="text-muted-foreground mt-1">
      Manage your personal profile and notification preferences
    </p>
  </div>

  {/* Profile Card */}
  <Card>
    <CardHeader>
      <CardTitle>Personal Profile</CardTitle>
      <CardDescription>
        Your account information and preferences
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">

      {/* Profile Info */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-black dark:bg-white text-white dark:text-black text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-lg">{firstName} {lastName}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <Badge variant="default" className="mt-1">Super Admin</Badge>
        </div>
      </div>

      <Separator />

      {/* Password Section */}
      <div>
        <Label className="text-base">Password</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Manage your password through Firebase Authentication
        </p>
        <Button variant="outline" onClick={handleChangePassword}>
          Change Password
        </Button>
      </div>

      <Separator />

      {/* Notification Preferences */}
      <div className="space-y-4">
        <div>
          <Label className="text-base">Notification Preferences</Label>
          <p className="text-sm text-muted-foreground">
            Choose how you want to be notified about platform events
          </p>
        </div>

        {/* Toggle: New Tenant Registrations */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label>New Tenant Registrations</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when new tenants register
            </p>
          </div>
          <Switch
            checked={notifyNewTenants}
            onCheckedChange={setNotifyNewTenants}
          />
        </div>

        {/* Toggle: Tenant Status Changes */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label>Tenant Status Changes</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when tenants are suspended or reactivated
            </p>
          </div>
          <Switch
            checked={notifyStatusChanges}
            onCheckedChange={setNotifyStatusChanges}
          />
        </div>

        {/* Select: Notification Frequency */}
        <div className="space-y-2">
          <Label>Notification Frequency</Label>
          <Select
            value={notificationFrequency}
            onValueChange={setNotificationFrequency}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="daily">Daily Digest</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose how often you receive notification emails
          </p>
        </div>

        <Button onClick={handleSavePreferences}>
          Save Preferences
        </Button>
      </div>
    </CardContent>
  </Card>
</div>
```

### Navigation Updates

**File:** `/apps/web/src/shared/lib/navigation.ts`

**Changes:**

```typescript
import { Settings } from 'lucide-react'; // Add Settings icon import

// Update super_admin navigation
super_admin: [
  { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
  { label: 'Settings', href: '/admin/settings', icon: Settings }, // NEW
],
```

### UserProfileMenu Smart Routing

**File:** `/apps/web/src/shared/components/layout/UserProfileMenu.tsx`

**Changes:**

```typescript
// Update the settings onClick handler
<DropdownMenuItem onClick={() => {
  if (user?.role === 'SUPER_ADMIN') {
    router.push('/admin/settings');
  } else {
    router.push('/settings/preferences');
  }
}}>
  <Settings className="mr-2 h-4 w-4" />
  <span>Settings</span>
</DropdownMenuItem>
```

### UI/UX Standards Compliance

All components MUST follow these standards:

**Dark Theme Support:**
- ✅ Use semantic color tokens: `bg-background`, `text-foreground`, `border-border`
- ✅ Avoid hardcoded colors like `bg-white`, `text-gray-900` without dark variants
- ✅ Test in both light and dark themes

**Responsive Design:**
- ✅ Mobile-first approach
- ✅ Test at: 375px (mobile), 768px (tablet), 1440px (desktop)
- ✅ Responsive spacing: `px-4 md:px-6 lg:px-8`
- ✅ Responsive typography: `text-sm md:text-base lg:text-lg`

**Shadcn UI Components:**
- ✅ Use `<Button>` instead of `<button>`
- ✅ Use `<Input>`, `<Textarea>` instead of plain HTML
- ✅ Use `<Card>`, `<Table>`, `<Dialog>`, `<Tabs>` from Shadcn
- ✅ Use `<Badge>`, `<Alert>`, `<Avatar>` from Shadcn

---

## Backend Design

### API Endpoints

#### 1. Enhanced Existing Endpoint

```typescript
GET /api/v1/tenants?status={status}
Headers: Authorization: Bearer {token}
Query Params:
  - status (optional): PENDING_APPROVAL | ACTIVE | SUSPENDED | REJECTED

Response: Tenant[]
[
  {
    id: number;
    tenantId: string;
    companyName: string;
    subdomain: string;
    contactEmail: string;
    contactPhone: string;
    status: TenantStatus;
    dotNumber: string;
    fleetSize: string;
    isActive: boolean;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    suspendedAt?: string;
    suspendedBy?: string;
    suspensionReason?: string;
    users: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
    }[];
    _count: {
      users: number;
      drivers: number;
    };
  }
]

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
```

#### 2. Suspend Tenant

```typescript
POST /api/v1/tenants/:tenantId/suspend
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body: {
  reason: string;  // Required, min 10 chars
}

Response: {
  tenantId: string;
  status: "SUSPENDED";
  suspendedAt: string;
  suspendedBy: string;
  suspensionReason: string;
}

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 400: Tenant not found or not ACTIVE
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
```

#### 3. Reactivate Tenant

```typescript
POST /api/v1/tenants/:tenantId/reactivate
Headers: Authorization: Bearer {token}

Response: {
  tenantId: string;
  status: "ACTIVE";
  reactivatedAt: string;
  reactivatedBy: string;
}

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 400: Tenant not found or not SUSPENDED
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
```

#### 4. Get Tenant Details

```typescript
GET /api/v1/tenants/:tenantId/details
Headers: Authorization: Bearer {token}

Response: {
  tenant: {
    tenantId: string;
    companyName: string;
    subdomain: string;
    status: TenantStatus;
    dotNumber: string;
    fleetSize: string;
    contactEmail: string;
    contactPhone: string;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    suspendedAt?: string;
    suspendedBy?: string;
    suspensionReason?: string;
    reactivatedAt?: string;
    reactivatedBy?: string;
  };
  users: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: string;
  }[];
  metrics: {
    totalUsers: number;
    totalDrivers: number;
    totalVehicles: number;
    totalRoutePlans: number;
  };
}

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 404: Tenant not found
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
```

#### 5. Get Super Admin Preferences

```typescript
GET /api/v1/users/me/preferences
Headers: Authorization: Bearer {token}

Response: {
  notifyNewTenants: boolean;
  notifyStatusChanges: boolean;
  notificationFrequency: "immediate" | "daily";
}

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
  - 404: Preferences not found (creates default)
```

#### 6. Update Super Admin Preferences

```typescript
PUT /api/v1/users/me/preferences
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body: {
  notifyNewTenants?: boolean;
  notifyStatusChanges?: boolean;
  notificationFrequency?: "immediate" | "daily";
}

Response: {
  notifyNewTenants: boolean;
  notifyStatusChanges: boolean;
  notificationFrequency: "immediate" | "daily";
}

Authorization: SUPER_ADMIN role required
Status Codes:
  - 200: Success
  - 400: Invalid request body
  - 401: Unauthorized
  - 403: Forbidden (not SUPER_ADMIN)
```

### Backend Service Logic

#### Suspend Tenant Business Logic

```typescript
async suspendTenant(
  tenantId: string,
  reason: string,
  suspendedBy: string
): Promise<Tenant> {
  // 1. Validate tenant exists and is ACTIVE
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: { users: { where: { role: 'OWNER' } } }
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  if (tenant.status !== 'ACTIVE') {
    throw new BadRequestException('Can only suspend ACTIVE tenants');
  }

  // 2. Validate suspension reason
  if (!reason || reason.trim().length < 10) {
    throw new BadRequestException('Suspension reason must be at least 10 characters');
  }

  // 3. Update tenant and deactivate all users in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    // Update tenant status
    const updatedTenant = await tx.tenant.update({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
        isActive: false,
        suspendedAt: new Date(),
        suspendedBy,
        suspensionReason: reason,
      },
    });

    // Deactivate all tenant users (logs them out)
    await tx.user.updateMany({
      where: { tenantId: tenant.id },
      data: { isActive: false },
    });

    return updatedTenant;
  });

  // 4. Send suspension notification email
  const ownerUser = tenant.users.find(u => u.role === 'OWNER');
  if (ownerUser) {
    await this.notificationService.sendTenantSuspensionNotification(
      tenantId,
      ownerUser.email,
      ownerUser.firstName,
      tenant.companyName,
      reason,
    );
  }

  // 5. Log admin action
  this.logger.log(
    `Tenant ${tenantId} (${tenant.companyName}) suspended by ${suspendedBy}. Reason: ${reason}`
  );

  return result;
}
```

#### Reactivate Tenant Business Logic

```typescript
async reactivateTenant(
  tenantId: string,
  reactivatedBy: string
): Promise<Tenant> {
  // 1. Validate tenant exists and is SUSPENDED
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: { users: { where: { role: 'OWNER' } } }
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  if (tenant.status !== 'SUSPENDED') {
    throw new BadRequestException('Can only reactivate SUSPENDED tenants');
  }

  // 2. Update tenant and reactivate all users in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    // Update tenant status
    const updatedTenant = await tx.tenant.update({
      where: { tenantId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy,
      },
    });

    // Reactivate all tenant users
    await tx.user.updateMany({
      where: { tenantId: tenant.id },
      data: { isActive: true },
    });

    return updatedTenant;
  });

  // 3. Send reactivation notification email
  const ownerUser = tenant.users.find(u => u.role === 'OWNER');
  if (ownerUser) {
    await this.notificationService.sendTenantReactivationNotification(
      tenantId,
      ownerUser.email,
      ownerUser.firstName,
      tenant.companyName,
    );
  }

  // 4. Log admin action
  this.logger.log(
    `Tenant ${tenantId} (${tenant.companyName}) reactivated by ${reactivatedBy}`
  );

  return result;
}
```

#### Get Tenant Details Business Logic

```typescript
async getTenantDetails(tenantId: string): Promise<TenantDetailsResponse> {
  // 1. Fetch tenant with all related data
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: {
      users: {
        select: {
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
        orderBy: [
          { role: 'asc' }, // OWNER, ADMIN, DISPATCHER, DRIVER
          { firstName: 'asc' },
        ],
      },
      _count: {
        select: {
          users: true,
          drivers: true,
          vehicles: true,
          routePlans: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  // 2. Format response
  return {
    tenant: {
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      subdomain: tenant.subdomain,
      status: tenant.status,
      dotNumber: tenant.dotNumber,
      fleetSize: tenant.fleetSize,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      createdAt: tenant.createdAt.toISOString(),
      approvedAt: tenant.approvedAt?.toISOString(),
      approvedBy: tenant.approvedBy,
      rejectedAt: tenant.rejectedAt?.toISOString(),
      rejectionReason: tenant.rejectionReason,
      suspendedAt: tenant.suspendedAt?.toISOString(),
      suspendedBy: tenant.suspendedBy,
      suspensionReason: tenant.suspensionReason,
      reactivatedAt: tenant.reactivatedAt?.toISOString(),
      reactivatedBy: tenant.reactivatedBy,
    },
    users: tenant.users,
    metrics: {
      totalUsers: tenant._count.users,
      totalDrivers: tenant._count.drivers,
      totalVehicles: tenant._count.vehicles,
      totalRoutePlans: tenant._count.routePlans,
    },
  };
}
```

### File Structure

```
apps/backend/src/domains/platform/
├── tenants/
│   ├── tenants.controller.ts              # ENHANCED
│   ├── tenants.service.ts                 # ENHANCED
│   └── dto/
│       ├── register-tenant.dto.ts         # EXISTING
│       ├── suspend-tenant.dto.ts          # NEW
│       └── reactivate-tenant.dto.ts       # NEW (optional, no body needed)
│
└── preferences/
    ├── preferences.module.ts              # NEW
    ├── preferences.controller.ts          # NEW
    ├── preferences.service.ts             # NEW
    └── dto/
        └── update-preferences.dto.ts      # NEW
```

### DTOs

#### SuspendTenantDto

```typescript
import { IsString, MinLength } from 'class-validator';

export class SuspendTenantDto {
  @IsString()
  @MinLength(10, { message: 'Suspension reason must be at least 10 characters' })
  reason: string;
}
```

#### UpdatePreferencesDto

```typescript
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  notifyNewTenants?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyStatusChanges?: boolean;

  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;
}
```

---

## Database Schema

### Schema Updates

#### Tenant Table Enhancements

```prisma
model Tenant {
  id                    Int          @id @default(autoincrement())
  tenantId              String       @unique @map("tenant_id") @db.VarChar(50)
  companyName           String       @map("company_name") @db.VarChar(255)
  subdomain             String?      @unique @db.VarChar(100)
  contactEmail          String?      @map("contact_email") @db.VarChar(255)
  contactPhone          String?      @map("contact_phone") @db.VarChar(50)

  // Registration fields
  status                TenantStatus @default(PENDING_APPROVAL)
  dotNumber             String?      @map("dot_number") @db.VarChar(8)
  fleetSize             FleetSize?   @map("fleet_size")

  // Approval tracking
  approvedAt            DateTime?    @map("approved_at") @db.Timestamptz
  approvedBy            String?      @map("approved_by") @db.VarChar(100)
  rejectedAt            DateTime?    @map("rejected_at") @db.Timestamptz
  rejectionReason       String?      @map("rejection_reason")

  // Suspension tracking (NEW)
  suspendedAt           DateTime?    @map("suspended_at") @db.Timestamptz
  suspendedBy           String?      @map("suspended_by") @db.VarChar(100)
  suspensionReason      String?      @map("suspension_reason")

  // Reactivation tracking (NEW)
  reactivatedAt         DateTime?    @map("reactivated_at") @db.Timestamptz
  reactivatedBy         String?      @map("reactivated_by") @db.VarChar(100)

  // Onboarding tracking
  onboardingCompletedAt DateTime?    @map("onboarding_completed_at") @db.Timestamptz
  onboardingProgress    Json?        @map("onboarding_progress")

  isActive              Boolean      @default(false) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  users                 User[]
  drivers               Driver[]
  vehicles              Vehicle[]
  routePlans            RoutePlan[]
  alerts                Alert[]
  integrationConfigs    IntegrationConfig[]
  fleetOperationsSettings FleetOperationsSettings?
  invitations           UserInvitation[]
  notifications         Notification[]

  @@index([tenantId])
  @@index([subdomain])
  @@index([status])
  @@index([dotNumber])
  @@map("tenants")
}
```

#### Super Admin Preferences Table (NEW)

```prisma
model SuperAdminPreferences {
  id                      Int      @id @default(autoincrement())
  userId                  Int      @unique @map("user_id")
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  notifyNewTenants        Boolean  @default(true) @map("notify_new_tenants")
  notifyStatusChanges     Boolean  @default(true) @map("notify_status_changes")
  notificationFrequency   String   @default("immediate") @map("notification_frequency") @db.VarChar(20)

  createdAt               DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt               DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@index([userId])
  @@map("super_admin_preferences")
}
```

**User Model Update:**

```prisma
model User {
  // ... existing fields ...

  superAdminPreferences SuperAdminPreferences? // NEW relation

  // ... existing relations ...
}
```

### Database Migrations

#### Migration 1: Add Suspension Tracking to Tenants

**File:** `apps/backend/prisma/migrations/YYYYMMDDHHMMSS_add_tenant_suspension_tracking/migration.sql`

```sql
-- Add suspension and reactivation tracking columns to tenants table
ALTER TABLE tenants
ADD COLUMN suspended_at TIMESTAMPTZ,
ADD COLUMN suspended_by VARCHAR(100),
ADD COLUMN suspension_reason TEXT,
ADD COLUMN reactivated_at TIMESTAMPTZ,
ADD COLUMN reactivated_by VARCHAR(100);

-- Add indexes for performance
CREATE INDEX idx_tenants_suspended_at ON tenants(suspended_at);

-- Add comment for documentation
COMMENT ON COLUMN tenants.suspended_at IS 'Timestamp when tenant was suspended';
COMMENT ON COLUMN tenants.suspended_by IS 'Email of super admin who suspended the tenant';
COMMENT ON COLUMN tenants.suspension_reason IS 'Reason for tenant suspension';
COMMENT ON COLUMN tenants.reactivated_at IS 'Timestamp when tenant was reactivated';
COMMENT ON COLUMN tenants.reactivated_by IS 'Email of super admin who reactivated the tenant';
```

#### Migration 2: Create Super Admin Preferences Table

**File:** `apps/backend/prisma/migrations/YYYYMMDDHHMMSS_create_super_admin_preferences/migration.sql`

```sql
-- Create super_admin_preferences table
CREATE TABLE super_admin_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  notify_new_tenants BOOLEAN DEFAULT TRUE,
  notify_status_changes BOOLEAN DEFAULT TRUE,
  notification_frequency VARCHAR(20) DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_super_admin_preferences_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_super_admin_preferences_user_id ON super_admin_preferences(user_id);

-- Add check constraint for notification frequency
ALTER TABLE super_admin_preferences
ADD CONSTRAINT chk_notification_frequency
CHECK (notification_frequency IN ('immediate', 'daily'));

-- Add comments
COMMENT ON TABLE super_admin_preferences IS 'Stores notification preferences for super admin users';
COMMENT ON COLUMN super_admin_preferences.notify_new_tenants IS 'Email notification for new tenant registrations';
COMMENT ON COLUMN super_admin_preferences.notify_status_changes IS 'Email notification for tenant status changes';
COMMENT ON COLUMN super_admin_preferences.notification_frequency IS 'Email frequency: immediate or daily digest';
```

---

## Testing Strategy

### Frontend Testing

#### Unit Tests

**Component:** `TenantTable`
- ✅ Renders correct columns based on status
- ✅ Shows correct actions based on status
- ✅ Handles empty state correctly
- ✅ Loading state displays spinner
- ✅ Date formatting works correctly

**Component:** `RejectTenantDialog`
- ✅ Opens and closes correctly
- ✅ Validates required reason field
- ✅ Disables submit button when reason is empty
- ✅ Calls onConfirm with correct data
- ✅ Clears form on cancel

**Component:** `SuspendTenantDialog`
- ✅ Shows warning alert
- ✅ Validates required reason field
- ✅ Calls onConfirm with correct data

**Component:** `TenantDetailsDialog`
- ✅ Renders all three tabs
- ✅ Displays tenant information correctly
- ✅ Shows user list with correct data
- ✅ Displays metrics cards

#### Integration Tests

**Page:** `TenantManagementPage`
- ✅ Fetches tenants on mount
- ✅ Tab switching updates query params
- ✅ Tab badges show correct counts
- ✅ Approve action succeeds and refreshes data
- ✅ Reject dialog opens and submits
- ✅ Suspend dialog opens and submits
- ✅ Reactivate dialog opens and submits
- ✅ Details dialog opens with correct data
- ✅ Error states display correctly
- ✅ Loading states display correctly

**Page:** `SuperAdminSettingsPage`
- ✅ Loads preferences on mount
- ✅ Toggles update state correctly
- ✅ Select updates state correctly
- ✅ Save button calls API
- ✅ Success/error toasts display

#### E2E Tests

**Flow:** Tenant Approval
1. Login as super admin
2. Navigate to Tenant Management
3. Switch to Pending tab
4. Click Approve on a tenant
5. Verify tenant moves to Active tab
6. Verify success toast displays

**Flow:** Tenant Suspension
1. Login as super admin
2. Navigate to Tenant Management
3. Switch to Active tab
4. Click Suspend on a tenant
5. Fill in suspension reason
6. Submit dialog
7. Verify tenant moves to Suspended tab
8. Verify success toast displays

**Flow:** Settings Update
1. Login as super admin
2. Click Settings in header
3. Verify routes to `/admin/settings`
4. Toggle notification preferences
5. Change frequency dropdown
6. Click Save
7. Verify success toast
8. Reload page
9. Verify preferences persisted

#### Responsive Testing

Test all pages at breakpoints:
- ✅ 375px (mobile) - iPhone SE
- ✅ 768px (tablet) - iPad Mini
- ✅ 1440px (desktop) - Standard desktop

Verify:
- ✅ Tables scroll horizontally on mobile
- ✅ Dialogs are full-screen on mobile
- ✅ Buttons stack vertically on mobile
- ✅ No horizontal overflow
- ✅ Touch targets are 44x44px minimum

#### Dark Mode Testing

Test all pages in both themes:
- ✅ Light theme
- ✅ Dark theme

Verify:
- ✅ All text is readable
- ✅ All backgrounds contrast correctly
- ✅ All borders are visible
- ✅ All interactive states work (hover, focus, active)

### Backend Testing

#### Unit Tests

**Service:** `TenantsService.suspendTenant`
- ✅ Throws NotFoundException if tenant not found
- ✅ Throws BadRequestException if tenant not ACTIVE
- ✅ Throws BadRequestException if reason too short
- ✅ Updates tenant status to SUSPENDED
- ✅ Sets suspendedAt, suspendedBy, suspensionReason
- ✅ Deactivates all tenant users
- ✅ Sends notification email
- ✅ Logs admin action
- ✅ Rolls back on error

**Service:** `TenantsService.reactivateTenant`
- ✅ Throws NotFoundException if tenant not found
- ✅ Throws BadRequestException if tenant not SUSPENDED
- ✅ Updates tenant status to ACTIVE
- ✅ Sets reactivatedAt, reactivatedBy
- ✅ Reactivates all tenant users
- ✅ Sends notification email
- ✅ Logs admin action
- ✅ Rolls back on error

**Service:** `TenantsService.getTenantDetails`
- ✅ Throws NotFoundException if tenant not found
- ✅ Returns complete tenant data
- ✅ Returns users sorted by role and name
- ✅ Returns correct metrics counts

**Service:** `PreferencesService.getPreferences`
- ✅ Returns existing preferences
- ✅ Creates default preferences if not found
- ✅ Throws NotFoundException if user not found

**Service:** `PreferencesService.updatePreferences`
- ✅ Updates only provided fields
- ✅ Creates preferences if not found
- ✅ Validates notification frequency enum
- ✅ Returns updated preferences

#### Integration Tests

**Controller:** `TenantsController`
- ✅ GET /tenants?status=PENDING returns only pending
- ✅ GET /tenants?status=ACTIVE returns only active
- ✅ GET /tenants?status=SUSPENDED returns only suspended
- ✅ GET /tenants?status=REJECTED returns only rejected
- ✅ GET /tenants returns all tenants
- ✅ POST /tenants/:id/suspend requires SUPER_ADMIN
- ✅ POST /tenants/:id/suspend validates request body
- ✅ POST /tenants/:id/suspend returns 200 on success
- ✅ POST /tenants/:id/reactivate requires SUPER_ADMIN
- ✅ POST /tenants/:id/reactivate returns 200 on success
- ✅ GET /tenants/:id/details requires SUPER_ADMIN
- ✅ GET /tenants/:id/details returns complete data

**Controller:** `PreferencesController`
- ✅ GET /users/me/preferences requires SUPER_ADMIN
- ✅ GET /users/me/preferences returns preferences
- ✅ PUT /users/me/preferences requires SUPER_ADMIN
- ✅ PUT /users/me/preferences validates request body
- ✅ PUT /users/me/preferences returns updated data

#### E2E Tests

**Flow:** Complete Tenant Lifecycle
1. Create tenant (PENDING_APPROVAL)
2. Approve tenant → status = ACTIVE
3. Suspend tenant → status = SUSPENDED, users inactive
4. Reactivate tenant → status = ACTIVE, users active
5. Verify all status changes persisted
6. Verify all timestamps recorded

**Flow:** Super Admin Preferences
1. Login as super admin
2. GET preferences (creates default if missing)
3. Update preferences
4. GET preferences again
5. Verify changes persisted

---

## Implementation Plan

### Phase 1: Database & Backend (Priority 1)

**Tasks:**
1. ✅ Run database migrations
   - Add suspension tracking columns to tenants
   - Create super_admin_preferences table
2. ✅ Update Prisma schema
3. ✅ Generate Prisma client
4. ✅ Create DTOs (SuspendTenantDto, UpdatePreferencesDto)
5. ✅ Implement TenantsService enhancements
   - suspendTenant method
   - reactivateTenant method
   - getTenantDetails method
6. ✅ Implement TenantsController endpoints
   - POST /tenants/:id/suspend
   - POST /tenants/:id/reactivate
   - GET /tenants/:id/details
7. ✅ Create PreferencesModule
8. ✅ Implement PreferencesService
   - getPreferences method
   - updatePreferences method
9. ✅ Implement PreferencesController
   - GET /users/me/preferences
   - PUT /users/me/preferences
10. ✅ Add email notification templates
    - Tenant suspension notification
    - Tenant reactivation notification
11. ✅ Write unit tests for services
12. ✅ Write integration tests for controllers

**Estimated Time:** 2-3 days

### Phase 2: Frontend Components (Priority 2)

**Tasks:**
1. ✅ Create reusable components
   - TenantTable component
   - RejectTenantDialog component
   - SuspendTenantDialog component
   - ReactivateTenantDialog component
   - TenantDetailsDialog component
2. ✅ Create TenantManagementTabs component
3. ✅ Write unit tests for components
4. ✅ Test dark mode support
5. ✅ Test responsive design

**Estimated Time:** 2-3 days

### Phase 3: Pages & Navigation (Priority 3)

**Tasks:**
1. ✅ Update navigation config
   - Add Settings to super_admin nav
2. ✅ Update UserProfileMenu
   - Add smart settings routing
3. ✅ Enhance TenantManagementPage
   - Replace TenantList with TenantManagementTabs
4. ✅ Create SuperAdminSettingsPage
   - Profile section
   - Password section
   - Notification preferences section
5. ✅ Write integration tests for pages
6. ✅ Write E2E tests

**Estimated Time:** 2 days

### Phase 4: Testing & Polish (Priority 4)

**Tasks:**
1. ✅ Manual testing
   - Test all tenant actions (approve, reject, suspend, reactivate)
   - Test settings updates
   - Test navigation routing
2. ✅ Accessibility testing
   - Keyboard navigation
   - Screen reader compatibility
   - Focus management in dialogs
3. ✅ Performance testing
   - Large tenant lists (100+ tenants)
   - Multiple concurrent tab switches
4. ✅ Browser testing
   - Chrome, Firefox, Safari, Edge
5. ✅ Bug fixes and refinements

**Estimated Time:** 1-2 days

---

## Success Metrics

### Functional Requirements Met

- ✅ Super admin can view all tenants across all statuses
- ✅ Super admin can filter tenants by status using tabs
- ✅ Super admin can approve/reject pending tenants
- ✅ Super admin can suspend active tenants with reason
- ✅ Super admin can reactivate suspended tenants
- ✅ Super admin can view detailed tenant information
- ✅ Super admin can manage personal notification preferences
- ✅ Settings navigation routes correctly based on user role
- ✅ All tenant users are deactivated when tenant is suspended
- ✅ All tenant users are reactivated when tenant is reactivated
- ✅ Email notifications sent for all status changes
- ✅ Audit trail maintained for all admin actions

### Non-Functional Requirements Met

- ✅ All UI components support dark theme
- ✅ All pages are responsive (mobile, tablet, desktop)
- ✅ All forms validate input correctly
- ✅ All API calls handle errors gracefully
- ✅ All actions show loading states
- ✅ All actions show success/error feedback
- ✅ All dialogs follow UX best practices
- ✅ All components use Shadcn UI

### Performance Targets

- ✅ Page load time < 2 seconds
- ✅ API response time < 500ms
- ✅ Tab switching < 300ms
- ✅ Dialog open/close < 200ms

---

## Future Enhancements (Out of Scope)

These features are intentionally excluded from this design but may be considered in future iterations:

### Phase 2 Features
- Delete tenants (with data cleanup options)
- Edit tenant information (company name, contact details, fleet size)
- Manually override tenant settings
- Bulk tenant operations (bulk suspend, bulk activate, etc.)

### Phase 3 Features
- Tenant usage analytics and billing metrics
- Custom tenant feature flags
- Audit log viewer for all admin actions
- Advanced tenant search and filtering
- Export tenant data (CSV, Excel)

### Admin User Management
- Invite additional super admins
- Manage super admin permissions
- Super admin activity logs

---

## Risk Assessment

### Technical Risks

**Risk:** Suspending a tenant could fail mid-transaction
- **Mitigation:** Use database transactions to ensure atomicity
- **Rollback:** Transaction automatically rolls back on error
- **Impact:** Low (handled by implementation)

**Risk:** Email notifications could fail
- **Mitigation:** Log notification failures, retry logic
- **Fallback:** Admin can manually notify tenant owner
- **Impact:** Medium (notifications are secondary)

**Risk:** Large tenant lists could slow down UI
- **Mitigation:** Implement pagination (future enhancement)
- **Current:** Tab-based filtering reduces visible records
- **Impact:** Low for MVP (most platforms have < 100 tenants)

### Business Risks

**Risk:** Super admin accidentally suspends wrong tenant
- **Mitigation:** Confirmation dialog with tenant name display
- **Additional:** Clear suspension reason required
- **Impact:** Medium (reversible via reactivate)

**Risk:** Suspended tenant loses critical data access
- **Mitigation:** Clear communication in suspension email
- **Additional:** Tenant owner can contact support
- **Impact:** High (by design - suspension is intentional)

### Security Risks

**Risk:** Unauthorized access to super admin endpoints
- **Mitigation:** SUPER_ADMIN role guard on all endpoints
- **Additional:** JWT token validation
- **Impact:** Low (proper authorization implemented)

**Risk:** Sensitive tenant data exposed in details view
- **Mitigation:** SUPER_ADMIN authorization required
- **Additional:** No sensitive data (passwords, tokens) exposed
- **Impact:** Low (proper data filtering)

---

## Appendix

### Related Documents

- **CLAUDE.md** - Project AI context and instructions
- **DOCUMENTATION.md** - Complete documentation navigation
- **.docs/specs/blueprint.md** - Product vision and roadmap
- **.docs/technical/DARK_THEME_IMPLEMENTATION.md** - Dark theme guidelines
- **.docs/technical/setup/QUICK_START.md** - Development setup

### Code References

- **Frontend Navigation:** `apps/web/src/shared/lib/navigation.ts`
- **Backend Tenants Module:** `apps/backend/src/domains/platform/tenants/`
- **Prisma Schema:** `apps/backend/prisma/schema.prisma`
- **Existing Tenant List:** `apps/web/src/features/platform/admin/components/tenant-list.tsx`

### API Testing Examples

#### cURL: Suspend Tenant

```bash
curl -X POST http://localhost:8000/api/v1/tenants/tenant_abc123/suspend \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Non-payment of subscription fees for 60 days"
  }'
```

#### cURL: Reactivate Tenant

```bash
curl -X POST http://localhost:8000/api/v1/tenants/tenant_abc123/reactivate \
  -H "Authorization: Bearer <super_admin_token>"
```

#### cURL: Get Tenant Details

```bash
curl -X GET http://localhost:8000/api/v1/tenants/tenant_abc123/details \
  -H "Authorization: Bearer <super_admin_token>"
```

#### cURL: Update Preferences

```bash
curl -X PUT http://localhost:8000/api/v1/users/me/preferences \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notifyNewTenants": true,
    "notifyStatusChanges": false,
    "notificationFrequency": "daily"
  }'
```

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial design document | AI Brainstorming Session |

---

**Design Status:** ✅ Complete and Ready for Implementation

**Next Steps:**
1. Review and approve design document
2. Create implementation plan using `superpowers:writing-plans`
3. Set up git worktree for isolated development using `superpowers:using-git-worktrees`
4. Begin Phase 1 implementation (Database & Backend)
