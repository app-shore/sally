# Resend Email Service Setup Guide

**Service:** Resend (https://resend.com)
**Purpose:** Send integration failure alert emails
**Updated:** January 31, 2026

---

## Why Resend?

Resend provides a modern, developer-friendly email API with:
- ✅ **Simple API** - Clean, intuitive interface
- ✅ **SMTP Support** - Works with nodemailer (already installed)
- ✅ **Better Deliverability** - High email delivery rates
- ✅ **Generous Free Tier** - 3,000 emails/month free
- ✅ **Excellent Logs** - View delivery status in real-time
- ✅ **Easy Domain Verification** - Simple DNS setup

---

## Setup Steps

### 1. Create Resend Account

Visit: https://resend.com/onboarding

1. Sign up with your email
2. Verify your email address
3. Complete onboarding

### 2. Get API Key

Visit: https://resend.com/api-keys

1. Click **"Create API Key"**
2. Name: "SALLY Production Alerts"
3. Permission: **Full Access** (for sending emails)
4. Copy the API key (starts with `re_`)
5. Store securely - you won't see it again!

### 3. Verify Domain

**Required for production!** You must verify your domain to send emails from `alerts@sally.app`

1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter: `sally.app`
4. Add the DNS records shown to your domain provider:
   ```
   Type: TXT
   Name: @
   Value: resend-verify-<token>

   Type: MX
   Name: @
   Priority: 10
   Value: mx.resend.com
   ```
5. Wait for verification (usually < 5 minutes)
6. ✅ Domain status should show "Verified"

### 4. Configure Environment Variables

Add to `apps/backend/.env`:

```bash
# Email Configuration (using Resend - https://resend.com)
# Resend API (recommended - simpler and more reliable)
RESEND_API_KEY="re_123456789_YourActualResendAPIKey"
EMAIL_FROM="alerts@sally.app"

# Alternative: SMTP fallback (only if Resend API not available)
# SMTP_HOST="smtp.resend.com"
# SMTP_PORT="465"
# SMTP_USER="resend"
# SMTP_PASSWORD="re_123456789_YourActualResendAPIKey"
```

**Important:**
- **Use RESEND_API_KEY** (recommended) - simpler configuration
- `EMAIL_FROM` must use your verified domain
- SMTP fallback available if needed
- EmailService automatically chooses best method (Resend API > SMTP > Console)

---

## Testing Email Delivery

### Manual Test (via EmailService)

**Option 1: Test via API endpoint** (recommended)

Create a test endpoint or use existing health check to send test email.

**Option 2: Test via Node.js script**

Create a test script: `apps/backend/test-email.js`

```javascript
// Using Resend SDK directly (matches EmailService)
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  try {
    const data = await resend.emails.send({
      from: 'alerts@sally.app',
      to: 'your-email@example.com', // Replace with your email
      subject: 'Test Alert from SALLY',
      html: `
        <h2>Test Alert</h2>
        <p>This is a test email from SALLY's integration alert system.</p>
        <p>If you received this, Resend is configured correctly! ✅</p>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data.id);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

sendTestEmail();
```

Run test:
```bash
cd apps/backend
npm install resend  # if not already installed
RESEND_API_KEY="your-resend-api-key" node test-email.js
```

### Check Delivery in Resend Dashboard

1. Visit: https://resend.com/emails
2. View sent emails in real-time
3. Check delivery status
4. View email content
5. Debug any issues

---

## Integration Alert Flow

### When Alerts Are Sent

Alerts are automatically sent when:
- **3+ sync failures** occur within 60 minutes
- **Integration connection test fails** repeatedly
- **Critical errors** in integration processing

### Alert Email Format

**Subject:** `[ERROR] Integration Sync Failing`

**Body:**
```
Integration Sync Failing

Severity: ERROR

HOS sync has failed 3 times in the last hour. Please check your integration configuration.

Context:
{
  "tenantId": 1,
  "driverId": "DRV-001",
  "failureCount": 3,
  "error": "Connection timeout",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

### Recipients

Emails are sent to:
- All **ADMIN** users in the tenant
- All **SUPER_ADMIN** users in the tenant
- Only **active** users (isActive = true)

Queried from database:
```typescript
const admins = await prisma.user.findMany({
  where: {
    tenantId,
    role: { in: ['ADMIN', 'SUPER_ADMIN'] },
    isActive: true,
  },
  select: { email: true },
});
```

---

## Troubleshooting

### Email Not Sending

**1. Check API Key**
```bash
# Verify API key is set correctly
echo $SMTP_PASS
# Should start with "re_"
```

**2. Check Domain Verification**
- Visit: https://resend.com/domains
- Status should be "Verified" ✅
- If not, check DNS records

**3. Check Logs**
```bash
# Backend logs show email attempts
grep "Alert sent" apps/backend/logs/*.log
grep "Failed to send alert" apps/backend/logs/*.log
```

**4. Check Resend Dashboard**
- Visit: https://resend.com/emails
- View recent sends
- Check for errors or bounces

### Email in Spam

**Solutions:**
1. **Domain Verification** - Must have verified domain
2. **SPF Record** - Add SPF record (Resend provides this)
3. **DKIM** - Resend configures automatically when domain verified
4. **Content** - Avoid spam trigger words in alerts
5. **Volume** - Don't send too many emails too quickly

### Rate Limits

**Resend Free Tier:**
- 3,000 emails/month
- 10 emails/second

**If Exceeded:**
- Upgrade to paid plan ($20/month for 50k emails)
- Or reduce alert frequency

---

## Production Checklist

Before going live:

- [ ] Resend account created
- [ ] API key generated and stored securely
- [ ] Domain `sally.app` verified in Resend
- [ ] DNS records added (TXT, MX)
- [ ] Environment variables configured
- [ ] Test email sent successfully
- [ ] Test email received (not in spam)
- [ ] Delivery logs checked in Resend dashboard
- [ ] Alert recipients verified in database
- [ ] Rate limits understood and acceptable

---

## Migration from SendGrid (If Applicable)

If previously using SendGrid:

1. **Keep SendGrid temporarily** (during transition)
2. **Run both in parallel** (test Resend first)
3. **Verify Resend delivery** (1 week minimum)
4. **Switch fully to Resend** (update all configs)
5. **Cancel SendGrid** (after full cutover)

No code changes needed - both use SMTP!

---

## Cost Comparison

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| **Resend** | 3,000/month | $20/month (50k emails) |
| **SendGrid** | 100/day | $15/month (40k emails) |

**Recommendation:** Start with Resend free tier, monitor usage, upgrade if needed.

---

## Support & Resources

**Resend Documentation:**
- API Reference: https://resend.com/docs
- SMTP Guide: https://resend.com/docs/send-with-smtp
- Troubleshooting: https://resend.com/docs/troubleshooting

**SALLY Implementation:**
- Alert Service: `apps/backend/src/services/alerts/alert.service.ts`
- Email Templates: Inline HTML in alert service
- Test Script: `apps/backend/test-email.js` (create if needed)

**Support:**
- Resend Support: support@resend.com
- Resend Discord: https://resend.com/discord

---

## Future Enhancements

Consider adding:
- [ ] Email templates in React (using Resend's React Email)
- [ ] Unsubscribe links for non-critical alerts
- [ ] Alert preferences per user
- [ ] Slack/Discord integration (in addition to email)
- [ ] SMS alerts for critical issues (Twilio integration)

---

**Setup complete! Your integration alerts will now be sent via Resend.** 📧
