# Deployment Guide

Deploy your Maze Solver to the internet for free!

---

## Option 1: Vercel + Render (FREE & Recommended)

### Backend on Render

1. **Go to [render.com](https://render.com)** and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub and select `Maze_Solver` repository
4. **Settings:**
   ```
   Name: maze-solver-backend
   Region: Choose closest region
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT
   ```
5. Click **"Create Web Service"**
6. Wait 2-3 minutes
7. **Copy your backend URL** (e.g., `https://maze-solver-backend.onrender.com`)

### Frontend on Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up
2. Click **"Add New..."** → **"Project"**
3. Import `Maze_Solver` repository
4. **Settings:**
   ```
   Framework Preset: Next.js
   Root Directory: frontend
   Build Command: pnpm build
   ```
5. **Add Environment Variable:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your Render backend URL (from above)
6. Click **"Deploy"**
7. Wait 1-2 minutes
8. **Your app is live!** Copy the URL

### Update CORS

1. Edit `backend/app.py` line 37
2. Add your Vercel URL:
```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-vercel-app.vercel.app"  # Your actual URL
]
```
3. Commit and push:
```bash
git add backend/app.py
git commit -m "Add production URL to CORS"
git push origin main
```
4. Render will auto-deploy in 1-2 minutes

### ✅ You're Done!

Visit your Vercel URL and start training agents!

---

## Option 2: Railway (No Sleep - $5/month)

Railway keeps your app running 24/7 without sleep time.

### Deploy

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Deploy backend:
```bash
cd backend
railway login
railway init
railway up
```
Copy the backend URL from Railway dashboard.

3. Deploy frontend:
```bash
cd frontend
railway init
railway up
```

4. In Railway dashboard, add environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend URL

5. Update CORS in `backend/app.py` with your Railway URLs

---

## Option 3: Docker (Self-Hosted)

Run on any server with Docker:

```bash
# Clone your repo on the server
git clone https://github.com/17arhaan/Maze_Solver.git
cd Maze_Solver

# Start both services
docker-compose up -d

# Check status
docker-compose ps
```

Access at `http://your-server-ip:3000`

---

## Quick Comparison

| Platform | Cost | Sleep | Auto-Deploy | Best For |
|----------|------|-------|-------------|----------|
| **Vercel + Render** | FREE | Yes* | ✅ | Portfolio, Demo |
| **Railway** | $5/mo | No | ✅ | Production |
| **Docker** | Variable | No | ❌ | Self-hosted |

*Backend sleeps after 15min inactivity

---

## Troubleshooting

### CORS Error
Add your frontend URL to `backend/app.py` line 37

### Can't Connect to Backend
Check `NEXT_PUBLIC_API_URL` environment variable in Vercel

### Backend Sleeping
Normal on Render free tier. Upgrade to paid plan or use Railway.

---

## Next Steps After Deployment

1. ✅ Test training on deployed app
2. ✅ Share your URL
3. ✅ Add to portfolio/resume
4. ✅ Monitor in platform dashboards

**Questions?** Check platform documentation or GitHub Actions logs.

