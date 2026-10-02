# TERIMBERE — AgriRwanda Pro

**TERIMBERE (AgriRwanda Pro)** is a full-stack smart agriculture and farm management platform built for Rwandan farmers, cooperatives, and agronomists.

## Key Capabilities

1. **Globally Dynamic Daily Engine**:
   - Automatically tracks the live calendar day, active Rwandan agricultural season (**Season A**, **Season B**, **Season C**), and rotates daily agronomy advisories, market prices, and 7-day weather projections as the day changes.
2. **Respectful, Supportive AI Agronomist (`Umujyanama wa AI`)**:
   - Fetches and analyzes 7-day local weather forecasts for each farm's specific `agroZone` (*Birunga Volcanic Highlands*, *Eastern Savanna*, *Central/Southern Plateau*, *Lake Kivu Belt*) to provide clear, respectful, and actionable advice on **planting times** and **pest & disease risk management (IPM)**.
3. **7-Day Visual Weather Trend Chart (`MarketWeatherView`)**:
   - Interactive dual-axis `ComposedChart` displaying daily precipitation bars (`mm`), cumulative rainfall curves, daytime high/nighttime low temperature projections (`°C`), and district evapotranspiration metrics.
4. **Precision Soil Health & Moisture SVG Spatial Map (`SoilHealthParcelMap`)**:
   - Interactive 20-zone (`A1–D5`) topographic SVG parcel grid overlaying soil moisture (`% VWC`), Nitrogen (`N`), Phosphorus (`P`), Potassium (`K`), and soil `pH / EC` with micro-zone calibration and variable-rate task scheduling.
5. **Clean Slate Architecture**:
   - Starts fresh with zero pre-loaded test users or sample transactions so farmers and administrators can register their own accounts and parcels from scratch.

---

## Step 1: Host on GitHub

Run these commands in your project folder to push the codebase to a new GitHub repository:

```bash
git init
git add .
git commit -m "Initial clean-slate release of TERIMBERE AgriRwanda Pro"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/terimbere-agrirwanda-pro.git
git push -u origin main
```

---

## Step 2: Deploy to Render

You can deploy to [Render](https://render.com) using either the included **`render.yaml` Blueprint** or a standard **Web Service**:

### Option A: 1-Click Blueprint (`render.yaml`)
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Blueprint** and connect your GitHub repository.
3. Render will automatically detect `render.yaml`.
4. Enter your `GEMINI_API_KEY` when prompted and click **Apply**.

### Option B: Manual Web Service Setup
1. Click **New +** → **Web Service** on Render and select your GitHub repository.
2. Configure the service settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
3. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `your_gemini_api_key`
4. Click **Create Web Service**. Render will build the Vite frontend and bundle the Express API server (`dist/server.cjs`) and serve your live URL!
