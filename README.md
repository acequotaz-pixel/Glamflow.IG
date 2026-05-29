# GLAMFLOW — Autonomous Instagram Backend

> Express.js backend for fully automated Instagram posting via Meta Graph API v21.0

---

## Architecture

```
GitHub Actions (cron)
        ↓
Render.com (this backend)
        ↓  ↓  ↓
   Claude AI  →  Generate caption + hashtags
   Cloudinary →  Host images (public URL)
   Instagram  →  3-step container publish
```

---

## Phase 1: Meta Developer App Setup (~30 min, one-time)

### 1.1 Create the App
1. Go to https://developers.facebook.com → **My Apps → Create App**
2. Choose **Business** type, give it any name (e.g. "GLAMFLOW")
3. Under **Add Products**, click **Set Up** next to **Instagram Graph API**

### 1.2 Connect your Instagram account
> Your Instagram must be a **Professional account** (Business or Creator)
> and linked to a **Facebook Page**

1. In Facebook: Settings → Linked Accounts → Connect Instagram
2. In your Meta App: **Instagram → API Setup → Add Instagram Account**
3. Authorize your account

### 1.3 Get a Short-Lived Token
1. Go to: https://developers.facebook.com/tools/explorer
2. Select your app
3. Click **Generate Access Token** → grant all `instagram_*` permissions:
   - `instagram_business_basic`
   - `instagram_business_content_publish`
   - `instagram_business_manage_messages`
4. Copy the token

### 1.4 Exchange for Long-Lived Token (valid 60 days)
```bash
curl "https://graph.instagram.com/access_token\
?grant_type=ig_exchange_token\
&client_secret=YOUR_APP_SECRET\
&access_token=YOUR_SHORT_LIVED_TOKEN"
```
Copy the `access_token` from the response.

### 1.5 Get your Instagram Business Account ID
```bash
# Step A: Get your Facebook Pages
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN"

# Step B: Use the page ID to get the Instagram Business Account ID
curl "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_LONG_LIVED_TOKEN"
```
The `id` inside `instagram_business_account` is your `IG_USER_ID`.

---

## Phase 2: Local Setup

```bash
# Clone or create folder
git clone https://github.com/YOUR_USERNAME/glamflow-instagram.git
cd glamflow-instagram

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# → Edit .env with your credentials (see .env.example for details)

# Copy your GLAMFLOW dashboard into public/
mkdir -p public
cp /path/to/glamflow-auto-instagram.html public/index.html

# Test all connections
npm test
```

If `npm test` shows ✅ for Instagram and Anthropic, you're ready.

---

## Phase 3: Push to GitHub

```bash
git init
git add .
git commit -m "GLAMFLOW autonomous backend v2"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/glamflow-instagram.git
git branch -M main
git push -u origin main
```

**Important:** `.env` and `.token` are in `.gitignore` — they will NOT be pushed.

---

## Phase 4: Deploy to Render.com (Free)

1. Go to https://render.com → **New → Web Service**
2. Connect your GitHub account → select the `glamflow-instagram` repo
3. Configure:
   - **Name:** `glamflow-backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free (spins down after 15min inactivity — use GitHub Actions to keep it warm)

4. Under **Environment Variables**, add each key from `.env.example`:
   ```
   IG_USER_ID          = (your value)
   IG_TOKEN            = (your value)
   IG_APP_ID           = (your value)
   IG_APP_SECRET       = (your value)
   ANTHROPIC_API_KEY   = (your value)
   CLOUDINARY_CLOUD_NAME = (optional)
   CLOUDINARY_API_KEY    = (optional)
   CLOUDINARY_API_SECRET = (optional)
   NODE_ENV            = production
   ```

5. Click **Deploy** → wait ~2 minutes
6. Note your URL: `https://glamflow-backend.onrender.com`

---

## Phase 5: GitHub Actions Auto-Scheduler

### 5.1 Add Secret to GitHub Repo
1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `RENDER_BACKEND_URL`
3. Value: `https://glamflow-backend.onrender.com` (no trailing slash)

### 5.2 The Cron is already configured
`.github/workflows/autopost.yml` will trigger posting at these EAT times:

| EAT Time | UTC Time | Niche      |
|----------|----------|------------|
| 06:00    | 03:00    | Crypto     |
| 09:00    | 06:00    | Forex      |
| 12:00    | 09:00    | Finance    |
| 14:00    | 11:00    | AI/Tech    |
| 18:00    | 15:00    | Motivation |
| 20:00    | 17:00    | Crypto     |
| 22:00    | 19:00    | Fitness    |

### 5.3 Manual trigger
Go to: **Actions → GLAMFLOW Auto-Post → Run workflow**
Pick a niche and click **Run**.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | System health + stats |
| POST | `/api/generate` | Generate AI content (no post) |
| POST | `/api/autopost` | Generate + post to Instagram |
| POST | `/api/instagram/container` | Create media container (Step 1) |
| POST | `/api/instagram/publish` | Publish container (Step 2) |
| GET | `/api/instagram/account` | Instagram account info |
| GET | `/api/queue` | View scheduled queue |
| POST | `/api/queue/add` | Add post to queue |
| DELETE | `/api/queue/:id` | Remove from queue |
| GET | `/api/history` | Post history |
| GET | `/api/logs` | System logs |
| POST | `/api/token/refresh` | Manually refresh IG token |

### POST /api/autopost example:
```json
{
  "niche": "crypto",
  "postType": "Educational Tip",
  "tone": "Authoritative",
  "imageUrl": "https://optional-custom-image-url.jpg"
}
```

---

## Token Refresh (Auto)

Tokens auto-refresh on the **1st of every month** via GitHub Actions.
Manual refresh: `POST /api/token/refresh`

The new token is saved to `.token` file on the server (survives Render restarts).

---

## Image Hosting Options

Instagram requires a **publicly accessible image URL**.

| Option | Cost | Setup |
|--------|------|-------|
| **Cloudinary** (recommended) | Free 25GB/mo | Add 3 env vars |
| **Unsplash** (default) | Free | None — used automatically |
| **Your own CDN** | Varies | Pass `imageUrl` in API call |

For Cloudinary: create an **Upload Preset** named `glamflow` (unsigned) in your Cloudinary dashboard → Settings → Upload → Upload Presets.

---

## Folder Structure

```
glamflow-instagram/
├── server.js                     ← Main backend (Express + all logic)
├── package.json
├── .env.example                  ← Copy to .env and fill in
├── .env                          ← Your secrets (gitignored)
├── .gitignore
├── test-connection.js            ← Run before deploying
├── public/
│   └── index.html                ← Your GLAMFLOW dashboard
└── .github/
    └── workflows/
        └── autopost.yml          ← GitHub Actions cron scheduler
```
