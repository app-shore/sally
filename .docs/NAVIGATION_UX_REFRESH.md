# Navigation UX Refresh

**Date:** February 2, 2026
**Purpose:** Update navigation labels to be more engaging and action-oriented
**UX Principle:** Operational software should feel active, not administrative

---

## Philosophy

SALLY is a **dispatch & driver coordination platform**, not an IT admin panel. The language should:
- ✅ Be **action-oriented** and **human**
- ✅ Focus on **what users do**, not abstract concepts
- ✅ Use **industry-standard logistics terminology**
- ✅ Avoid **generic IT/admin jargon**

---

## Changes Applied

### Navigation Labels

| Before (❌ Boring) | After (✅ Engaging) | Rationale |
|--------------------|-------------------|-----------|
| **User Management** | **Team** | More human and collaborative. Implies coordination, not bureaucracy. |
| **Driver Management** | **Drivers** | Simpler, cleaner. Context is obvious—no need to say "management." |
| **Fleet Settings** | **Fleet** | "Settings" is redundant. Fleet IS the configuration. |
| **Route Planning** | **Route Planner** | A tool you use, not an abstract concept. More actionable. |
| **Active Routes** | **Live Routes** | More dynamic and real-time feeling. "Active" is passive. |

### Page Titles & UI

| Component | Before | After |
|-----------|--------|-------|
| User List Header | "User Management" | "Team" |
| Invite Button | "Invite User" | "Invite Team Member" |
| Invite Dialog | "Invite New User" | "Invite Team Member" |
| Invite Description | "Send an invitation to a new user to join your organization" | "Send an invitation to join your team" |
| Drivers Page | "Driver Management" | "Drivers" |
| Drivers Subtitle | "Activate and manage driver accounts" | "Activate and coordinate your driver team" |

---

## Updated Navigation Structure

### OWNER/ADMIN Navigation
```
📊 Dashboard
👥 Team                    (was: User Management)
🚛 Drivers                 (was: Driver Management)
--- Operations ---
📍 Command Center
➕ Plan Route
🗺️ Live Routes             (was: Active Routes)
--- Configuration ---
⚙️ Route Planner           (was: Route Planning)
📦 Fleet                   (was: Fleet Settings)
🔌 Integrations
⚙️ Preferences
```

### DISPATCHER Navigation
```
📍 Command Center
➕ Plan Route
🗺️ Live Routes             (was: Active Routes)
--- Configuration ---
⚙️ Route Planner           (was: Route Planning)
📦 Fleet                   (was: Fleet Settings)
🔌 Integrations
⚙️ Preferences
```

### DRIVER Navigation
```
🏠 My Routes
🗺️ Today's Route
💬 Dispatch Messages
--- Configuration ---
⚙️ Preferences
```

---

## UX/Marketing Principles Applied

### 1. **Human-Centric Language**
- ❌ "User Management" → ✅ "Team"
- **Why:** People don't think "I need to manage users." They think "I need to check on my team."

### 2. **Action-Oriented**
- ❌ "Route Planning" → ✅ "Route Planner"
- **Why:** "Planning" is abstract. "Planner" is a tool you use. More concrete.

### 3. **Dynamic & Real-Time**
- ❌ "Active Routes" → ✅ "Live Routes"
- **Why:** "Live" implies real-time updates. More exciting. "Active" sounds static.

### 4. **Remove Redundancy**
- ❌ "Fleet Settings" → ✅ "Fleet"
- **Why:** Everything in Configuration is settings. No need to repeat it.

### 5. **Operational, Not Administrative**
- ❌ "Driver Management" → ✅ "Drivers"
- **Why:** Dispatchers don't "manage drivers" bureaucratically—they coordinate operations with their driver team.

---

## Tone & Voice

### ✅ SALLY's Voice
- **Professional but approachable**
- **Action-oriented, not bureaucratic**
- **Industry-standard logistics terms**
- **Operational efficiency focused**

### ❌ Avoid
- Generic IT jargon ("management," "administration," "system")
- Overly formal language ("user accounts," "personnel")
- Passive voice ("Active Routes" vs. "Live Routes")
- Redundancy ("Settings" everywhere)

---

## Placement Rationale

### Why Team/Drivers Stay at Top

**✅ Correct Position:**
1. **Admin Priority** - Managing team is a primary responsibility
2. **Frequent Access** - Inviting users, activating drivers happens regularly
3. **Mental Model** - "Who's on my team?" comes before "What are they doing?"
4. **Security Importance** - Access control is high priority
5. **Industry Standard** - Most admin panels have users/team near top

**❌ Wrong Alternative (Configuration):**
- Configuration = system settings (preferences, integrations, thresholds)
- Team/People = core resources, not "settings"
- Would diminish importance of people management
- Harder to find when you need to quickly invite someone

---

## Files Modified

### Frontend
- ✅ `src/lib/navigation.ts` - All navigation labels updated
- ✅ `src/components/users/user-list.tsx` - Page title and button text
- ✅ `src/components/users/invite-user-dialog.tsx` - Dialog title and description
- ✅ `src/app/(dashboard)/drivers/page.tsx` - Page title and subtitle

### No Backend Changes Needed
- Routes remain the same (`/users`, `/drivers`)
- Only display labels changed
- No breaking changes

---

## User Impact

### What Users Will See
1. **Cleaner Navigation** - Shorter, more scannable labels
2. **More Human Language** - "Team" instead of "User Management"
3. **Action-Oriented** - Verbs and tools, not abstract concepts
4. **Professional Tone** - Still serious, but less bureaucratic

### What Doesn't Change
- ✅ All functionality remains identical
- ✅ URLs stay the same
- ✅ Permissions unchanged
- ✅ No retraining needed—labels are intuitive

---

## A/B Testing Insights (Hypothetical)

If we were to A/B test these labels:

**Expected Results:**
- 📈 **Higher engagement** - "Team" is more inviting than "User Management"
- ⏱️ **Faster task completion** - Clearer labels reduce cognitive load
- 😊 **Better sentiment** - Users feel respected, not like they're doing IT work
- 🎯 **Lower bounce rate** - More intuitive navigation

**Industry Examples:**
- **Slack** uses "Team" not "User Management"
- **Asana** uses "Members" not "User Accounts"
- **Notion** uses "Workspace" not "Organization Settings"

---

## Future Considerations

### Other Labels to Consider Later:
- "Command Center" → "Dispatch Hub"? (More industry-specific)
- "Plan Route" → "New Route"? (Simpler)
- "Preferences" → "My Settings"? (More personal)

### Internationalization
When translating:
- Keep the human, action-oriented tone
- "Team" translates well across languages
- Avoid idioms or slang

---

## Testing Checklist

- [ ] Navigation labels display correctly
- [ ] Page titles match navigation
- [ ] Button text is consistent ("Invite Team Member")
- [ ] Dialog titles updated
- [ ] No broken links (URLs unchanged)
- [ ] Mobile navigation displays properly
- [ ] Dark mode labels readable

---

## Summary

Updated navigation and page labels to be more engaging, human, and action-oriented:

**Key Changes:**
- "User Management" → **"Team"**
- "Driver Management" → **"Drivers"**
- "Active Routes" → **"Live Routes"**
- "Route Planning" → **"Route Planner"**
- "Fleet Settings" → **"Fleet"**

**Principle:** Operational software should feel active and collaborative, not bureaucratic and administrative.

**Impact:** Cleaner, more intuitive navigation that respects users' expertise and focuses on operational efficiency.

**Status:** ✅ Complete
