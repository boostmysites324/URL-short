# Domain Setup Guide for 247l.ink

## Current Issue
You're getting `DNS_PROBE_FINISHED_NXDOMAIN` error because the domain `247l.ink` is not connected to your Vercel deployment.

## Solution Options

### Option 1: Use Your Vercel Default Domain (Quickest)

If you don't own `247l.ink` yet, use your Vercel deployment URL temporarily:

1. Find your Vercel URL (e.g., `url-short-xyz.vercel.app`) in Vercel Dashboard
2. Update the default domain in code:
   - Update `supabase/functions/shorten-url/index.ts` line 134
   - Update `src/components/dashboard/LinkShortener.tsx` line 43

### Option 2: Configure 247l.ink (If You Own It)

#### Step 1: Add Domain to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter `247l.ink` and click **Add**

#### Step 2: Configure DNS
Vercel will show you DNS records to add. Go to your domain registrar (where you bought 247l.ink) and add:

**Option A: A Record (Recommended)**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600 (or default)
```

**Option B: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600 (or default)
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600 (or default)
```

#### Step 3: Wait for DNS Propagation
- DNS changes can take 5 minutes to 48 hours
- Check status in Vercel Dashboard
- Use [DNS Checker](https://dnschecker.org) to verify propagation

### Option 3: Buy the Domain 247l.ink

If you don't own it yet, you can purchase it from:
- [Namecheap](https://www.namecheap.com)
- [GoDaddy](https://www.godaddy.com)
- [Google Domains](https://domains.google)

After purchase, follow Option 2 steps above.

## Quick Fix for Testing

If you want to test your app now while waiting for DNS:

1. Use your Vercel URL directly: `https://your-project.vercel.app`
2. Or edit your hosts file to test locally:

**On Mac/Linux:**
```bash
sudo nano /etc/hosts
```

**On Windows:**
```
C:\Windows\System32\drivers\etc\hosts
```

Add this line (replace with your Vercel IP):
```
76.76.21.21 247l.ink
```

## Verification

Once configured, verify your setup:

1. **DNS Check**: Visit https://dnschecker.org and enter `247l.ink`
2. **SSL Check**: Visit https://247l.ink (should load with HTTPS)
3. **Test Short Link**: Create a short link and test the redirect

## Troubleshooting

### Domain not resolving
- Wait longer (DNS can take up to 48 hours)
- Clear browser cache and DNS cache
- Try different browser or incognito mode

### SSL Certificate Issues
- Vercel auto-generates SSL certificates
- Can take a few minutes after domain verification
- Check Vercel Dashboard → Settings → Domains

### Links not redirecting
- Ensure Supabase Edge Functions are deployed
- Check `vercel.json` has correct rewrite rules
- Verify `/s/:shortCode` route works

## Current Configuration

Your app is configured to use: **247l.ink**

To change this:
1. Update `supabase/functions/shorten-url/index.ts` (line 134)
2. Update `src/components/dashboard/LinkShortener.tsx` (line 43)
3. Deploy changes to Vercel

## Need Help?

If you're still having issues:
1. Share your Vercel deployment URL
2. Confirm if you own 247l.ink
3. Check Vercel deployment logs for errors




