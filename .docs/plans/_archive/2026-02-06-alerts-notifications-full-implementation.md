# Alerts & Notifications Full Implementation Plan

**Date:** February 6, 2026
**Feature Branch:** `feature/alerts-notifications`
**Status:** In Progress

## Overview

Implement a comprehensive Alerts Center page for dispatchers and a Notifications system for all users, building on the existing alert infrastructure (types, API, hooks, slide-out panel).

## Current State

### What Exists
- Alert types (`AlertPriority`, `AlertStatus`, `AlertCategory`, `Alert`)
- Alert API client (`alertsApi.list`, `getById`, `acknowledge`, `resolve`)
- React Query hooks (`useAlerts`, `useAlertById`, `useAcknowledgeAlert`, `useResolveAlert`)
- AlertsPanel slide-out component (right panel with basic alert list)
- AppHeader bell icon with alert count badge
- AppSidebar alerts button
- Backend: Alert model (Prisma), AlertsController, AlertService
- Backend: Notification model (Prisma), NotificationType/Channel/Status enums

### What's Missing
1. **Dedicated Alerts Center page** for dispatchers (full-page management)
2. **Notifications feature module** (types, API, hooks, store)
3. **Notifications page** for all users
4. **Alert detail dialog** with timeline and actions
5. **Navigation updates** to include Alerts Center and Notifications
6. **Enhanced alert types** (recommended_action field, driver_name)

## Implementation Steps

### Step 1: Enhanced Types
- Add `recommended_action`, `driver_name` to Alert interface
- Create Notification types (NotificationType, NotificationChannel, Notification interface)

### Step 2: Notifications Feature Module
- Create `features/operations/notifications/` with types, API, hooks, index
- Zustand store for notification UI state (unread count)

### Step 3: Alerts Center Page (`/dispatcher/alerts`)
- Full-page alert management with table view
- Status/priority/category filters
- Search functionality
- Bulk acknowledge/resolve
- Click to open alert detail dialog

### Step 4: Alert Detail Dialog
- Full alert details with metadata
- Timeline (created → acknowledged → resolved)
- Action buttons (acknowledge, resolve)
- Driver and route context

### Step 5: Notifications Page (`/notifications`)
- Notification list with read/unread states
- Mark as read/unread actions
- Filter by type
- Link to related alerts

### Step 6: Navigation & Layout Updates
- Add "Alerts Center" to dispatcher navigation
- Update header bell behavior
- Add "Notifications" to all role navigation configs

### Step 7: Compilation Verification
- Type-check all new code
- Build verification
- Fix any compilation issues
