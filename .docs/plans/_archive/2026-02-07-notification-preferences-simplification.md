# Notification Preferences Simplification Plan

> Research-backed redesign to make SALLY's preferences feel like an enterprise product

---

## Research Summary

### Enterprise Product Patterns Studied

**PagerDuty** — Groups notification rules by urgency (high vs low), not by individual alert type. Users configure "When X happens, notify me via Y after Z minutes." Simple, role-based.

**Linear** — Uses 4 channels (Desktop, Mobile, Email, Slack) with green/gray dots. Notifications are *grouped* — you can't toggle every sub-type, only categories. Email digests have smart timing (urgent = immediate, low = batched to work hours).

**GitHub** — Categories: Participating, Watching, Dependabot, Actions. For each, choose Email vs Web. Simple 2-column layout.

**Samsara** — 34 alert types across 7 categories (compliance, device health, driver behavior, equipment, location, maintenance, safety). Users pick channels per category, not per alert.

**Datadog** — Notification Rules: conditional routing ("if critical → page on-call, if warning → Slack"). Mobile app: just High Urgency / Low Urgency toggle.

**Smashing Magazine (UX Research)** — Recommends "notification modes" (Calm / Regular / Power-user) over granular toggles. Summary/digest mode. Snooze controls. Avoid overwhelming users.

### Key Takeaways

1. **Group by urgency, not by type** — PagerDuty, Datadog, Linear all do this
2. **One save button, one form** — Never split a preferences page into two separate save actions
3. **Defaults that work** — Critical = always on (locked). Low = off by default.
4. **Categories, not individual toggles** — Samsara groups 34 alerts into 7 categories
5. **Simple channel selection** — In-app + email is the common pattern; SMS/push are opt-in extras

---

## Current Problems (From Screenshot)

1. **Two save buttons** — "Save Notification Preferences" AND "Save Preferences" on the same page. Two separate API calls, two separate state objects. Confusing.
2. **Fragmented sections** — "Alert Preferences" card has min priority + desktop notifs + sound enabled. Then a separate "Sound Notifications" card has per-priority sound toggles. Then "Browser & Display" has browser notifs + flash tab + snooze. These overlap and repeat concepts.
3. **Two separate data models** — `UserPreferences` (Zustand store) vs `NotificationPrefs` (direct API call). They manage overlapping concerns.
4. **No clear hierarchy** — Sound, browser notifications, and alert priority are scattered across 3 cards with no logical grouping.

---

## Proposed Redesign: Single Unified Section

### Design Principle
Merge all alert/notification preferences into **one clean section** with **one save button**. Follow PagerDuty's urgency-based model and Linear's simplicity.

### New Layout

```
┌─────────────────────────────────────────────────┐
│ ⚙️ Display Preferences                          │
│ Distance, Time, Temperature, Currency            │
│ Auto Refresh, Default View, Compact, Contrast    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔔 Notifications                                 │
│                                                  │
│ Minimum Alert Priority     [Medium ▼]            │
│ Only show alerts at or above this priority       │
│                                                  │
│ ─────────────────────────────────────            │
│                                                  │
│ Sound                                            │
│ Critical    🔒                          [====]   │
│ High                                    [====]   │
│ Medium                                  [    ]   │
│ Low                                     [    ]   │
│                                                  │
│ ─────────────────────────────────────            │
│                                                  │
│ Browser Notifications                   [====]   │
│ Show desktop push notifications                  │
│                                                  │
│ Flash Tab on Critical                   [====]   │
│ Flash browser tab title for critical alerts      │
│                                                  │
│ Default Snooze Duration    [15 min ▼]            │
│                                                  │
└─────────────────────────────────────────────────┘

          [↻ Reset to Defaults]    [💾 Save Preferences]
```

### What Changes

1. **Remove "Alert Preferences" card** — merge `minAlertPriority`, `desktopNotifications`, `soundEnabled` into the unified Notifications card
2. **Remove "Sound Notifications" card** — fold per-priority sound toggles into the Notifications card under a "Sound" sub-section
3. **Remove "Browser & Display" card** — fold `browserNotifications`, `flashTabOnCritical`, `defaultSnoozeDuration` into the Notifications card
4. **Remove separate "Save Notification Preferences" button** — everything saves with one button
5. **Merge data models** — Notification prefs save alongside user prefs in one API call (or at minimum, one button triggers both saves transparently)

### What Stays the Same

- Display Preferences card (distance, time, temp, currency) — unchanged
- Dashboard Preferences card (refresh, view, compact, contrast) — unchanged
- Reset to Defaults button — unchanged
- The backend models can stay separate; we just unify the frontend save

---

## Implementation Approach

### Option A: Merge into UserPreferences (Recommended)
Add notification fields to the `UserPreferences` type and save everything through the existing Zustand store. Remove the separate `apiClient('/preferences/notifications')` call.

### Option B: Keep separate APIs, unified button
Keep both API endpoints but trigger both saves from one button click. Simpler backend change, slightly messier frontend.

**Recommendation: Option A** — cleaner, single source of truth.

---

## Sources
- [PagerDuty Notification Rules](https://support.pagerduty.com/main/docs/notification-rules)
- [Linear Notifications Docs](https://linear.app/docs/notifications)
- [GitHub Notification Settings](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications)
- [Samsara Configurable Fleet Settings](https://kb.samsara.com/hc/en-us/articles/360045924671-Configurable-Fleet-Settings)
- [Datadog Notification Rules](https://docs.datadoghq.com/monitors/notify/notification_rules/)
- [Smashing Magazine: Design Guidelines For Better Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- [NicelyDone: Notification Settings Examples](https://nicelydone.club/pages/notification-settings)
- [Toptal: Notification Design Guide](https://www.toptal.com/designers/ux/notification-design)
