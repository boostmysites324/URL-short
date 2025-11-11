# Quick Fix - Use Your Vercel Domain

## Problem
`247l.ink` is not configured, so you're getting DNS errors.

## Temporary Solution

### Step 1: Find Your Vercel URL
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. You'll see a URL like: `https://url-short-abc123.vercel.app`
4. Copy this URL

### Step 2: Update Configuration

Replace `247l.ink` with your Vercel domain in these 2 files:

#### File 1: `src/components/dashboard/LinkShortener.tsx`
**Line 43** - Change:
```typescript
customDomainUrl: "247l.ink",
```
To (example):
```typescript
customDomainUrl: "url-short-abc123.vercel.app",
```

#### File 2: `supabase/functions/shorten-url/index.ts`
**Line 134** - Change:
```typescript
let domain = 'https://247l.ink';
```
To (example):
```typescript
let domain = 'https://url-short-abc123.vercel.app';
```

### Step 3: Deploy
```bash
git add .
git commit -m "Update domain to Vercel URL"
git push
```

Vercel will auto-deploy, and your app will work immediately!

---

## When You Get 247l.ink Working

Once you configure the domain properly in Vercel, change these values back to `247l.ink`.





