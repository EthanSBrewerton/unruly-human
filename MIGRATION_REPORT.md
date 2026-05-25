# Unruly Human - Vercel Migration Report

**Date:** April 14, 2026  
**Migration:** mecharoys001-cmd/unruly-human → Ethan's Vercel Account (ETHAN)  
**Status:** ✅ COMPLETED

---

## Migration Summary

Successfully migrated the Unruly Human Next.js application from the blocked ROY Vercel team to Ethan's Vercel account (`ethansbrewertons-projects`).

---

## Completed Actions

### 1. Repository Setup
- ✅ Cloned repo to `/home/ethan/.openclaw/workspace/projects/unruly-human`
- ✅ Confirmed project structure: Next.js 16.1.6 with TypeScript, Tailwind CSS 4
- ✅ Dependencies: Stripe, Resend, Framer Motion, React 19

### 2. Vercel Account Configuration
- ✅ Identified ETHAN team: `ethansbrewertons-projects` (team_ssdVvHuYfc3YWyjOIlqhkRLu)
- ✅ Authenticated using `VERCEL_TOKEN_ETHAN`
- ✅ Upgraded Vercel CLI from v39.4.2 to v51.2.1 (required for deployment)
- ✅ User: `ethansbrewerton` (ethansbrewerton@gmail.com)

### 3. Project Deployment
- ✅ Linked project: `ethansbrewertons-projects/unruly-human`
- ✅ Project ID: `prj_YI2OIDPVlgPmNSLtP36EKMomfUYt`
- ✅ Build successful (26s build time)
- ✅ Deployment verified live

### 4. Current Domains
- **Primary:** https://unruly-human.vercel.app
- **Auto-generated aliases:**
  - https://unruly-human-ethansbrewertons-projects.vercel.app
  - https://unruly-human-ethansbrewerton-ethansbrewertons-projects.vercel.app

---

## Blockers Encountered & Resolved

### Critical Blocker: ROY Team Fair Use Limit
- **Issue:** Original team `roys-projects-ec3324ba` exceeded Vercel fair use limits (402 error)
- **Impact:** Could not retrieve original project settings, environment variables, or custom domains
- **Resolution:** Proceeded with fresh deployment to ETHAN account

### Authentication Issues
- **Issue:** Vercel CLI initially used wrong token (VERCEL_TOKEN environment variable)
- **Resolution:** Explicitly set `export VERCEL_TOKEN=$VERCEL_TOKEN_ETHAN` for all operations

### CLI Version Incompatibility
- **Issue:** Vercel CLI v39.4.2 too old for deployment (required v47.2.2+)
- **Resolution:** Upgraded to v51.2.1 via `npm i -g vercel@latest`

---

## ⚠️ Required Manual Configuration

### Environment Variables (CRITICAL)
The application requires the following environment variables to be configured in Vercel:

1. **STRIPE_SECRET_KEY** (Required)
   - Used in: `/api/checkout` and `/api/webhooks/stripe`
   - Purpose: Server-side Stripe API authentication
   - Action: Add via Vercel dashboard → Project Settings → Environment Variables

2. **RESEND_API_KEY** (Required)
   - Used in: `/api/webhooks/stripe` (for order confirmation emails)
   - Purpose: Email notifications via Resend
   - Action: Add via Vercel dashboard → Project Settings → Environment Variables

**How to add:**
```bash
# Option 1: Via Vercel CLI
export VERCEL_TOKEN=$VERCEL_TOKEN_ETHAN
vercel env add STRIPE_SECRET_KEY production
vercel env add RESEND_API_KEY production

# Option 2: Via Dashboard
# https://vercel.com/ethansbrewertons-projects/unruly-human/settings/environment-variables
```

### Custom Domain Configuration
- **Status:** No custom domains currently configured
- **Original domain:** Unknown (ROY team blocked - couldn't retrieve)
- **Action needed:** 
  - Determine if a custom domain was previously used
  - If yes, add domain via Vercel dashboard and update DNS records
  - Current default domain `unruly-human.vercel.app` is production-ready

---

## Technical Details

### Project Configuration
```json
{
  "projectId": "prj_YI2OIDPVlgPmNSLtP36EKMomfUYt",
  "orgId": "team_ssdVvHuYfc3YWyjOIlqhkRLu",
  "projectName": "unruly-human"
}
```

### Framework Detection
- **Framework:** Next.js 16.1.6
- **Build Command:** `next build`
- **Output Directory:** Next.js default
- **Node Version:** 24.x (auto-detected)

### Build Output
- Static pages: 3 (/, /_not-found, /success)
- API routes: 2 (/api/checkout, /api/webhooks/stripe)
- Build time: ~26 seconds
- Build region: Washington, D.C. (iad1)

### Dependencies Requiring Secrets
- `@stripe/stripe-js` & `stripe` → STRIPE_SECRET_KEY
- `resend` → RESEND_API_KEY

---

## Verification Commands

```bash
# Check deployment status
export VERCEL_TOKEN=$VERCEL_TOKEN_ETHAN
vercel ls --scope ethansbrewertons-projects | grep unruly-human

# View project details
vercel project ls | grep unruly-human

# Check environment variables (currently empty)
curl -H "Authorization: Bearer $VERCEL_TOKEN_ETHAN" \
  "https://api.vercel.com/v9/projects/prj_YI2OIDPVlgPmNSLtP36EKMomfUYt/env?teamId=team_ssdVvHuYfc3YWyjOIlqhkRLu"

# Test live deployment
curl -I https://unruly-human.vercel.app
```

---

## Next Steps

1. **Immediate (Critical):**
   - [ ] Add `STRIPE_SECRET_KEY` environment variable
   - [ ] Add `RESEND_API_KEY` environment variable
   - [ ] Verify checkout flow works at https://unruly-human.vercel.app
   - [ ] Test Stripe webhook endpoint

2. **Domain Configuration:**
   - [ ] Confirm if custom domain needed
   - [ ] If yes, add domain via Vercel dashboard
   - [ ] Update DNS records to point to Vercel

3. **Stripe Webhook:**
   - [ ] Update Stripe webhook URL to new domain
   - [ ] Endpoint: `https://unruly-human.vercel.app/api/webhooks/stripe`
   - [ ] Regenerate webhook secret if needed

4. **Testing:**
   - [ ] Test full checkout flow
   - [ ] Verify email notifications (Resend)
   - [ ] Test size guide modal functionality
   - [ ] Mobile responsiveness check

---

## Files Modified

- Created: `.vercel/project.json` (project linking)
- Updated: `~/.local/share/com.vercel.cli/auth.json` (authentication)
- Added to `.gitignore`: `.vercel/` (automatically)

---

## Commands Run

```bash
# Initial setup
git clone https://github.com/mecharoys001-cmd/unruly-human.git
cd /home/ethan/.openclaw/workspace/projects/unruly-human

# Authentication
export VERCEL_TOKEN=$VERCEL_TOKEN_ETHAN
vercel whoami  # → ethansbrewerton
vercel teams ls  # → ethansbrewertons-projects

# Deployment
npm i -g vercel@latest  # Upgrade CLI
vercel deploy --yes  # Initial deployment
```

---

## Contact & Resources

- **Project URL:** https://vercel.com/ethansbrewertons-projects/unruly-human
- **Production Site:** https://unruly-human.vercel.app
- **Settings:** https://vercel.com/ethansbrewertons-projects/unruly-human/settings
- **GitHub Repo:** https://github.com/mecharoys001-cmd/unruly-human

---

**Migration completed by:** CIPHER (AI Dev Lead)  
**Report generated:** 2026-04-14 20:49 EDT
