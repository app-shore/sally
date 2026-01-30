# Phase 2 Deployment Checklist

**Feature:** Real API Integrations (Samsara, Truckbase, Fuel Finder, OpenWeather)
**Version:** Phase 2 Complete
**Target Environment:** Production
**Date Prepared:** January 31, 2026

---

## Pre-Deployment Checklist

### Code Quality & Testing

- [x] All Phase 2 implementation tasks completed (Tasks 1-13)
- [x] E2E test suite created and reviewed
- [x] Integration adapter services implemented
- [x] Retry logic with exponential backoff implemented
- [x] Alert system for repeated failures implemented
- [x] Sync history endpoints implemented
- [x] Frontend sync history component implemented
- [ ] All unit tests passing (`npm test`)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Code review completed by team
- [ ] Security review completed

### API Credentials

- [ ] **Samsara API key** obtained and validated
  - Environment variable: `SAMSARA_API_KEY`
  - Test endpoint: https://api.samsara.com/fleet/drivers
  - Validated with test account: ___________

- [ ] **Truckbase API key** obtained and validated
  - Environment variable: `TRUCKBASE_API_KEY`
  - Test endpoint: https://sandbox.truckbase.com/api/drivers
  - Validated with test account: ___________

- [ ] **Fuel Finder API key** obtained and validated
  - Environment variable: `FUEL_FINDER_API_KEY`
  - Test endpoint: https://api.fuelfinder.com/v1/prices
  - Validated with test account: ___________

- [ ] **OpenWeather API key** obtained and validated
  - Environment variable: `OPENWEATHER_API_KEY`
  - Test endpoint: https://api.openweathermap.org/data/2.5/weather
  - Validated with test account: ___________

### Security Configuration

- [ ] **Credentials encryption key** generated (64-char hex string)
  - Environment variable: `CREDENTIALS_ENCRYPTION_KEY`
  - Generated using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Stored securely in: ___________
  - NEVER commit to code repository

- [ ] **JWT secrets** configured
  - `JWT_SECRET` set (production value, not dev default)
  - `JWT_REFRESH_SECRET` set (production value, not dev default)
  - Secrets stored securely (password manager, AWS Secrets Manager, etc.)

### Email Alert Configuration

- [ ] **SMTP credentials** obtained and tested
  - `SMTP_HOST`: ___________
  - `SMTP_PORT`: ___________
  - `SMTP_SECURE`: true/false
  - `SMTP_USER`: ___________
  - `SMTP_PASSWORD`: ___________ (use app password for Gmail)
  - `SMTP_FROM`: "SALLY Alerts <noreply@sally.com>"

- [ ] **Test email sent successfully**
  - Send test alert email
  - Verify delivery to: ___________
  - Check spam folder if not received
  - Verify email formatting and links work

### Database Preparation

- [ ] **Database migrations ready**
  - Review migration files in `apps/backend/prisma/migrations/`
  - Confirm IntegrationConfig table migration present
  - Confirm IntegrationSyncLog table migration present
  - Backup database before migration

- [ ] **Database backup completed**
  - Backup date/time: ___________
  - Backup location: ___________
  - Backup verified (test restore): Yes / No

### Environment Variables Documentation

- [ ] **Production .env file prepared**
  - Copy from `.env.example`
  - All variables filled with production values
  - No placeholder/dev values remaining
  - Stored securely (not in git repository)

- [ ] **Environment variables documented**
  - List all required variables in deployment docs
  - Document how to rotate API keys if compromised
  - Document how to generate new encryption key if needed

### Performance Benchmarks

- [ ] **Performance targets defined**
  - List integrations: < 500ms (p95)
  - Get integration: < 200ms (p95)
  - Sync history: < 1s (p95)
  - Sync history stats: < 500ms (p95)

- [ ] **Load testing completed** (if required)
  - Concurrent users tested: ___________
  - Results documented: ___________

---

## Deployment Steps

### Step 1: Pre-Deployment Verification

```bash
# 1. Verify current branch
git status
git log -n 5 --oneline

# 2. Ensure all changes committed
git diff
git diff --staged

# 3. Tag the release
git tag phase2-complete
git tag -l

# 4. Verify tests pass
cd apps/backend
npm run test
npm run test:e2e
```

### Step 2: Database Migration

```bash
# 1. Backup database
pg_dump -U sally_user -d sally > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Review pending migrations
cd apps/backend
npm run prisma:migrate:status

# 3. Run migrations (DRY RUN first if available)
npm run prisma:migrate:deploy

# 4. Verify migration success
npm run prisma:migrate:status
```

### Step 3: Backend Deployment

```bash
# 1. Set environment variables
# Copy production .env file to server
# Verify all variables are set correctly

# 2. Install dependencies
cd apps/backend
npm install --production

# 3. Build backend
npm run build

# 4. Start backend (or restart service)
npm run start:prod
# OR
pm2 restart sally-backend
# OR
docker-compose up -d backend

# 5. Verify backend is running
curl http://localhost:3000/health
```

### Step 4: Frontend Deployment

```bash
# 1. Build frontend with production env vars
cd apps/web
npm run build

# 2. Deploy to Vercel (or other hosting)
vercel deploy --prod
# OR
npm run deploy

# 3. Verify deployment
curl https://sally.yourdomain.com
```

### Step 5: Integration Testing

```bash
# Manual testing checklist (use production UI)

# 1. Login as admin user
# 2. Navigate to Settings > Integrations
# 3. Create Samsara integration
#    - Enter API key
#    - Click "Test Connection"
#    - Verify success message
#    - Save integration
# 4. Trigger manual sync
#    - Click "Sync Now"
#    - Wait for completion
#    - Check sync history
# 5. Verify sync history displays
#    - View sync logs
#    - Check statistics (success rate, last sync)
# 6. Repeat for all 4 integrations
# 7. Test email alerts (if possible)
```

### Step 6: Monitoring Setup

```bash
# 1. Verify logging is working
tail -f /var/log/sally/backend.log

# 2. Check error tracking (if using Sentry/similar)
# Verify errors are being captured

# 3. Monitor first sync cycle
# Watch logs for any errors during automatic sync

# 4. Set up alerts (optional)
# - Alert if sync failure rate > 10%
# - Alert if no syncs in 24 hours
# - Alert if API rate limit exceeded
```

---

## Post-Deployment Verification

### Immediate Checks (0-1 hour)

- [ ] **Backend health check** passing
  - `GET /health` returns 200
  - Database connection working
  - Redis connection working (if applicable)

- [ ] **All 4 integrations testable**
  - Samsara: Test connection succeeds
  - Truckbase: Test connection succeeds
  - Fuel Finder: Test connection succeeds
  - OpenWeather: Test connection succeeds

- [ ] **Sync history displays**
  - Navigate to Settings > Integrations > [Integration] > Sync History
  - Verify sync logs appear
  - Verify statistics calculate correctly

- [ ] **Manual sync works**
  - Trigger manual sync for one integration
  - Verify sync log is created
  - Verify status updates correctly

- [ ] **Authentication working**
  - Login as admin
  - Login as dispatcher
  - Login as driver
  - Verify tenant isolation

### Extended Monitoring (24 hours)

- [ ] **Monitor error rates**
  - Check backend error logs every 4 hours
  - Target: < 1% error rate
  - Investigate any 5xx errors

- [ ] **Check email alert delivery**
  - If any sync failures occur, verify alert sent
  - Check alert email content and formatting
  - Verify alert links work

- [ ] **Verify sync success rates > 95%**
  - Check sync history stats for each integration
  - Target: > 95% success rate
  - Investigate any failures

- [ ] **Monitor API rate limits**
  - Check logs for rate limit warnings
  - Verify retry logic is working
  - Adjust sync frequencies if needed

- [ ] **Database performance**
  - Check slow query logs
  - Verify no N+1 query issues
  - Monitor connection pool usage

### User Acceptance Testing

- [ ] **Gather user feedback**
  - Ask 2-3 dispatchers to test integrations
  - Document any UX issues
  - Note feature requests for Phase 3

- [ ] **Verify data accuracy**
  - Compare synced HOS data with Samsara UI
  - Compare driver data with Truckbase
  - Verify fuel prices are reasonable
  - Check weather data accuracy

---

## Rollback Plan

### If Issues Detected

1. **Assess severity**
   - Critical (data loss, auth broken): Immediate rollback
   - High (integration failures): Consider rollback
   - Medium (sync delays): Fix forward
   - Low (UI issues): Fix forward

2. **Rollback steps (if needed)**

```bash
# 1. Revert to previous deployment
git checkout <previous-tag>

# 2. Rebuild and redeploy
cd apps/backend
npm run build
npm run start:prod

cd apps/web
npm run build
vercel deploy --prod

# 3. Revert database migrations (if necessary)
npm run prisma:migrate:reset
# Restore from backup
psql -U sally_user -d sally < backup_YYYYMMDD_HHMMSS.sql

# 4. Verify system is stable
curl http://localhost:3000/health
```

3. **Enable mock data fallback (alternative to full rollback)**

```bash
# If real APIs are causing issues, temporarily use mock data
# Set environment variable for affected integration(s)
USE_MOCK_DATA=true

# Restart backend
pm2 restart sally-backend

# Investigate real API issues in staging environment
# Deploy fix when ready
# Remove USE_MOCK_DATA flag
```

---

## Communication Plan

### Pre-Deployment

- [ ] **Notify users of deployment window**
  - Email sent to all users: ___________
  - Deployment window: ___________ (2-hour window recommended)
  - Expected downtime: ___________ (aim for zero)

### During Deployment

- [ ] **Status page updated** (if applicable)
  - Mark as "Maintenance in Progress"
  - Provide updates every 30 minutes
  - Include expected completion time

### Post-Deployment

- [ ] **Announce new features**
  - Email to all dispatchers explaining new integrations
  - Document how to set up each integration
  - Provide support contact for issues

- [ ] **Post-deployment report**
  - Summary of changes deployed
  - Any issues encountered and resolutions
  - Next steps / upcoming features

---

## Success Criteria

### Must Have (Go/No-Go)

- ✅ All 4 integrations can be created
- ✅ All 4 integrations can test connection
- ✅ Manual sync works for at least 1 integration
- ✅ Sync history displays correctly
- ✅ Email alerts send successfully
- ✅ No authentication regressions
- ✅ No database errors in logs

### Nice to Have

- ✅ All sync success rates > 95%
- ✅ Performance targets met (< 500ms p95)
- ✅ No user-reported bugs in first 24 hours
- ✅ Automatic syncs running on schedule

---

## Phase 3 Planning

### Identified Enhancements

1. **Sync Log Retention Policy**
   - Automatically archive/delete logs older than 90 days
   - Implement as scheduled job

2. **Rate Limit Monitoring**
   - Track API call counts per integration
   - Alert when approaching vendor rate limits
   - Implement circuit breaker pattern

3. **Integration Health Dashboard**
   - Visual dashboard showing integration status
   - Sync success rate trends over time
   - API response time metrics

4. **Bulk Actions**
   - Enable/disable all integrations at once
   - Bulk sync trigger
   - Export sync history to CSV

5. **Advanced Retry Configuration**
   - Configurable retry count per integration
   - Configurable backoff strategy
   - Manual retry from sync history

### User Feedback Tracking

- Create ticket for each user-reported issue
- Prioritize for Phase 3 or future phases
- Review feedback in 2-week sprint planning

---

## Sign-Off

### Development Team

- **Implementation Complete:** ___________  (Name, Date)
- **Code Review Complete:** ___________ (Name, Date)
- **Testing Complete:** ___________ (Name, Date)

### Deployment Team

- **Pre-Deployment Checklist Complete:** ___________ (Name, Date)
- **Deployment Executed:** ___________ (Name, Date)
- **Post-Deployment Verification Complete:** ___________ (Name, Date)

### Product Owner

- **Feature Approved for Production:** ___________ (Name, Date)
- **UAT Sign-Off:** ___________ (Name, Date)

---

## Appendix A: Emergency Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Lead Developer | ___________ | ___________ | ___________ |
| DevOps Engineer | ___________ | ___________ | ___________ |
| Product Owner | ___________ | ___________ | ___________ |
| On-Call Engineer | ___________ | ___________ | ___________ |

## Appendix B: Useful Commands

```bash
# Check backend logs
tail -f /var/log/sally/backend.log
pm2 logs sally-backend

# Check database connections
psql -U sally_user -d sally -c "SELECT count(*) FROM \"IntegrationConfig\";"

# Restart services
pm2 restart sally-backend
docker-compose restart backend

# Check environment variables
printenv | grep SAMSARA
printenv | grep TRUCKBASE
printenv | grep FUEL_FINDER
printenv | grep OPENWEATHER
printenv | grep SMTP

# Generate new encryption key (if needed)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Manual database migration
cd apps/backend
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

## Appendix C: API Rate Limits (Reference)

| Vendor | Rate Limit | Notes |
|--------|------------|-------|
| Samsara | 300 requests/min | Per API key |
| Truckbase | 100 requests/min | Per account |
| Fuel Finder | 1000 requests/day | Free tier |
| OpenWeather | 1000 requests/day | Free tier, 60/min |

**Recommendation:** Start with 60-minute sync frequency to stay well under limits

---

**Document Version:** 1.0
**Last Updated:** January 31, 2026
**Next Review:** Post-deployment (within 48 hours)
