# Source Platform Tracking Feature

## 📱 Overview

This feature tracks **where your shortened URLs were shared and opened from**. When someone clicks your link from WhatsApp, Facebook, Twitter, or any other platform, we detect and record the source platform.

## ✨ What It Does

- **Detects** the platform where the link was shared/opened (WhatsApp, Facebook, Twitter, etc.)
- **Stores** the source platform in the database for each click
- **Displays** the source platform in analytics dashboard
- **Shows** top source platform in statistics cards
- **Tracks** individual source for each click in recent activity

## 🎯 Supported Platforms

The system automatically detects these platforms:

### Messaging Apps
- ✅ WhatsApp
- ✅ Telegram
- ✅ WeChat
- ✅ Line
- ✅ Viber
- ✅ Skype
- ✅ Discord
- ✅ Slack
- ✅ Messenger

### Social Media
- ✅ Facebook
- ✅ Twitter/X
- ✅ Instagram
- ✅ LinkedIn
- ✅ Pinterest
- ✅ Reddit
- ✅ Snapchat
- ✅ TikTok
- ✅ YouTube

### Other Sources
- ✅ Direct (no referer)
- ✅ Custom domains (from referer URL)
- ✅ UTM source parameter support

## 🔧 How It Works

### Detection Logic

1. **User Agent Detection**: Checks if the user agent string contains platform identifiers
   - Example: `WhatsApp/2.x` → Detects as "WhatsApp"

2. **Referer Detection**: Checks the HTTP referer header for known domains
   - Example: `https://wa.me/...` → Detects as "WhatsApp"
   - Example: `https://facebook.com/...` → Detects as "Facebook"

3. **UTM Parameter**: Checks for `utm_source` in the URL
   - Example: `?utm_source=newsletter` → Detects as "Newsletter"

4. **Fallback**: If no platform is detected, defaults to "Direct"

### Priority Order

1. User Agent (highest priority)
2. Referer Header
3. UTM Source Parameter
4. Direct (fallback)

## 📊 Database Changes

### New Column

```sql
ALTER TABLE public.clicks 
ADD COLUMN source_platform TEXT;
```

### Index

```sql
CREATE INDEX idx_clicks_source_platform ON public.clicks(source_platform);
```

## 🎨 UI Changes

### Statistics Page

1. **New Metric Card**: "Top Source" card showing the most common source platform
   - Located in the summary metrics section
   - Purple icon with Share2 icon
   - Shows platform name (e.g., "WhatsApp", "Facebook", "Direct")

2. **Recent Activity**: Each click now shows source platform
   - Displays as: "From: WhatsApp" or "From: Facebook"
   - Purple text with Share2 icon
   - Appears below referer information

### Example Display

```
Recent Activity:
📍 Noida, India
29 minutes ago
🌐 https://swift-link-stats.vercel.app/
📱 From: WhatsApp
🔗 → meet.google.com
```

## 🚀 Usage Examples

### Scenario 1: Link Shared on WhatsApp

1. User shares link: `https://247l.ink/s/abc123` on WhatsApp
2. Friend clicks the link from WhatsApp
3. System detects:
   - User Agent: Contains "WhatsApp"
   - Source Platform: **WhatsApp**
4. Analytics shows: "Top Source: WhatsApp"

### Scenario 2: Link Shared on Facebook

1. User posts link on Facebook
2. Someone clicks from Facebook feed
3. System detects:
   - Referer: `https://facebook.com/...`
   - Source Platform: **Facebook**
4. Analytics shows: "Top Source: Facebook"

### Scenario 3: Direct Link

1. User types link directly in browser
2. No referer, no social platform user agent
3. System detects:
   - Source Platform: **Direct**
4. Analytics shows: "Top Source: Direct"

## 📈 Analytics Benefits

### What You Can Track

- **Which platforms** drive the most traffic
- **Where your links** are being shared
- **Effectiveness** of different sharing channels
- **User behavior** across platforms

### Use Cases

1. **Marketing Campaigns**: See which social media platform performs best
2. **Content Strategy**: Understand where your audience shares links
3. **Engagement Analysis**: Compare direct vs. social media traffic
4. **Platform Optimization**: Focus on platforms with highest engagement

## 🔍 Technical Implementation

### Backend (Edge Function)

**File**: `supabase/functions/track-click/index.ts`

- Detects source platform from user agent and referer
- Stores in `source_platform` column
- Logs detection for debugging

### Frontend (Statistics Page)

**File**: `src/pages/Statistics.tsx`

- Fetches `source_platform` from clicks table
- Calculates top source platform
- Displays in metric card and recent activity

### Database Migration

**File**: `supabase/migrations/20250110000000_add_source_platform_to_clicks.sql`

- Adds `source_platform` column
- Creates index for performance

## 🧪 Testing

### Test Cases

1. **WhatsApp**: Share link on WhatsApp, click from WhatsApp app
   - Expected: Source = "WhatsApp"

2. **Facebook**: Share link on Facebook, click from Facebook
   - Expected: Source = "Facebook"

3. **Direct**: Type link directly in browser
   - Expected: Source = "Direct"

4. **UTM Parameter**: Add `?utm_source=newsletter` to link
   - Expected: Source = "Newsletter"

### How to Test

1. Create a short link
2. Share it on different platforms (WhatsApp, Facebook, etc.)
3. Click the link from each platform
4. Check Statistics page → Recent Activity
5. Verify "Top Source" card shows correct platform

## 📝 Notes

- **Backward Compatible**: Existing clicks without source_platform will show as "Direct"
- **Real-time**: New clicks immediately show source platform
- **No Breaking Changes**: All existing functionality remains intact
- **Performance**: Index ensures fast queries even with millions of clicks

## 🎉 Result

You can now see exactly **where your links are being shared and opened from**! This gives you valuable insights into:

- Which platforms your audience prefers
- Where your content is being shared
- Which channels drive the most engagement
- How users discover your links

---

**Feature Status**: ✅ **COMPLETE & READY TO USE**

**Next Steps**:
1. Run the database migration
2. Deploy the updated edge function
3. Start tracking source platforms!

