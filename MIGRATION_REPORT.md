# Unruly Human - Vercel Migration Report

**Date:** April 14, 2026  
**Migration:** mecharoys001-cmd/unruly-human → Ethan's Vercel Account (ETHAN)  
**Status:** ✅ COMPLETED

---

## Migration Summary

Successfully migrated the Unruly Human Next.js application from the blocked ROY Vercel team to Ethan's Vercel account (`ethansbrewertons-projects`).

### Current purchase architecture (July 18, 2026)

The storefront uses a **payment-first** flow. Stripe Checkout is the order ledger, and the success page verifies the Checkout Session server-side before showing paid/confirmed copy. The unfinished custom Stripe webhook and Resend email pipeline are deferred and are not part of this deployment. Buyers should rely on Stripe's payment receipt; the storefront does not promise a custom confirmation or tracking email.

---

## Completed Actions

### 1. Repository Setup
- ✅ Cloned repo to `/home/ethan/.openclaw/workspace/projects/unruly-human`
- ✅ Confirmed project structure: Next.js 16.2.10 with TypeScript, Tailwind CSS 4
- ✅ Dependencies: Stripe, Framer Motion, React 19

### 2. Vercel Account Configuration
- ✅ Identified ETHAN team: `ethansbrewertons-projects` (team_ssdVvHuYfc3YWyjOIlqhkRLu)
- ✅ Authenticated using `VERCEL_TOKEN_ETHAN`
- ✅ Upgraded Vercel CLI from v39.4.2 to v51.2.1 (required for deployment)
- ✅ User: `ethansbrewerton`

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

1. **STRIPE_SECRET_KEY** (Required in production)
   - Used in: `/api/checkout` and `/success`
   - Purpose: Create Checkout Sessions and verify the returned session before confirming payment
   - Production gate: Must be a Stripe live-mode secret (`sk_live_...`) or live restricted key (`rk_live_...`). Test keys fail closed in production.
   - Action: Add via Vercel dashboard → Project Settings → Environment Variables

2. **SITE_URL** (Required in production)
   - Example: `https://unruly.fashion`
   - Purpose: Trusted HTTPS origin for Stripe success and cancellation redirects
   - Validation: Must be an HTTPS origin only (no path, query, credentials, or fragment)
   - Action: Add via Vercel dashboard → Project Settings → Environment Variables

The webhook and Resend integration are explicitly deferred. `RESEND_API_KEY` and a Stripe webhook signing secret are not required for this payment-first release.

### Payment-first release gates (all required before release)

- [ ] Configure a live `STRIPE_SECRET_KEY` and verify production Checkout creates a live Session.
- [ ] Complete a controlled live purchase and verify the returned Session has `livemode === true`; the production success page must reject test-mode Sessions.
- [ ] In Stripe Dashboard, manually enable **Customer emails → Successful payments**, then manually verify the setting and delivery behavior with the controlled live purchase.
- [ ] Inspect Stripe Workbench event destinations and disable any obsolete or old event destination left from the removed webhook implementation, if one exists. Do not add a replacement webhook for this release.
- [ ] Establish and test the manual fulfillment ledger runbook below.
- [ ] A public support contact is a separate unresolved requirement. Do not publish or substitute a private email address.

### Manual fulfillment ledger runbook

Until durable webhook automation is intentionally designed and deployed, Stripe is the source ledger:

1. At least once each business day, open Stripe Dashboard in live mode and filter **Payments** for successful, uncaptured, refunded, disputed, and failed payments since the previous review.
2. For every successful Alloy 000 Bomber payment, open its Checkout Session and copy the Session ID, PaymentIntent ID, payment date, amount/currency, customer-provided contact, shipping address, and `size` metadata into the restricted fulfillment ledger. Never copy card data.
3. Deduplicate on Checkout Session ID. Confirm `payment_status=paid`, `livemode=true`, amount `$300.00 USD`, product metadata `alloy-000-bomber`, schema version `1`, and a valid size before fulfillment.
4. Mark the ledger row `ready`, `held`, `fulfilled`, `refunded`, or `disputed`; record assignee, timestamps, carrier/reference when fulfilled, and notes for any exception.
5. Reconcile the ledger against Stripe successful payments daily. Escalate missing metadata, duplicate rows, refunds, and disputes before shipping. A success-page view alone is never fulfillment authorization.

**How to add:**
```bash
# Option 1: Via Vercel CLI
export VERCEL_TOKEN=$VERCEL_TOKEN_ETHAN
vercel env add STRIPE_SECRET_KEY production
vercel env add SITE_URL production

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
- **Framework:** Next.js 16.2.10
- **Build Command:** `next build`
- **Output Directory:** Next.js default
- **Node Version:** 24.x (auto-detected)

### Build Output
- Pages: `/`, `/_not-found`, and server-verified `/success`
- API routes: 1 (`/api/checkout`)
- Build time: ~26 seconds
- Build region: Washington, D.C. (iad1)

### Dependencies Requiring Secrets
- `stripe` → `STRIPE_SECRET_KEY`
- Checkout redirect configuration → `SITE_URL`

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
   - [ ] Add a live `STRIPE_SECRET_KEY` environment variable (`sk_live_...` or least-privilege `rk_live_...`)
   - [ ] Add `SITE_URL` as the canonical production HTTPS origin
   - [ ] Verify a production Session reports `livemode === true`
   - [ ] Manually enable and verify Stripe **Customer emails → Successful payments**
   - [ ] Disable any obsolete Stripe event destination if one exists
   - [ ] Validate the manual fulfillment ledger runbook
   - [ ] Resolve a separate public support contact without exposing a private email
   - [ ] Verify checkout flow works at https://unruly-human.vercel.app

2. **Domain Configuration:**
   - [ ] Confirm if custom domain needed
   - [ ] If yes, add domain via Vercel dashboard
   - [ ] Update DNS records to point to Vercel

3. **Deferred automation:**
   - [ ] Design a durable fulfillment ledger/outbox before adding a Stripe webhook
   - [ ] Configure and verify Resend only when a custom email pipeline is intentionally deployed

4. **Testing:**
   - [ ] Test full checkout flow
   - [ ] Confirm unpaid, fake, and missing Checkout Session IDs do not show paid order copy
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
