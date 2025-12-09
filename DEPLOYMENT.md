# Deployment Guide: Railway (Backend) + Vercel (Frontend)

## Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- OpenAI API key
- Hume AI API key

---

## Part 1: Deploy Backend to Railway

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `pono-app` repository
5. Railway will auto-detect the backend folder

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables
In Railway project settings → Variables, add:

```
DATABASE_URL=<auto-set by Railway PostgreSQL>
OPENAI_API_KEY=<your-openai-key>
HUME_API_KEY=<your-hume-key>
JWT_SECRET=<generate-a-random-secret-string>
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Important**: Don't set `FRONTEND_URL` yet - you'll add it after deploying the frontend.

### Step 5: Configure Build Settings
1. In Railway project → Settings → Deploy
2. Set **Root Directory** to: `backend`
3. Railway will use the `Dockerfile` automatically

### Step 6: Deploy
1. Railway will automatically deploy when you push to GitHub
2. Wait for build to complete
3. Copy your Railway app URL (e.g., `https://pono-app-production.up.railway.app`)

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### Step 2: Deploy via Vercel Dashboard
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables
In Vercel project → Settings → Environment Variables, add:

```
VITE_API_URL=https://your-railway-app.up.railway.app
VITE_WS_URL=wss://your-railway-app.up.railway.app
```

**Note**: If Railway uses `https://`, WebSocket should use `wss://` (secure WebSocket)

### Step 4: Update Backend CORS
Go back to Railway and update `FRONTEND_URL`:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Railway will automatically redeploy.

---

## Part 3: Database Setup

### Initialize Database Tables
Railway will automatically run `models.Base.metadata.create_all(bind=engine)` on startup, but you can verify:

1. Connect to Railway PostgreSQL via Railway dashboard
2. Or use Railway CLI: `railway connect postgres`
3. Check tables exist: `\dt`

---

## Part 4: Testing

### Test Backend
```bash
curl https://your-railway-app.up.railway.app/
# Should return: {"message":"Pono API"}
```

### Test Frontend
1. Visit your Vercel URL
2. Register a new account
3. Complete onboarding
4. Start a conversation

---

## Troubleshooting

### Backend Issues

**CORS Errors:**
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check Railway logs: `railway logs`

**Database Connection:**
- Verify `DATABASE_URL` is set in Railway
- Check PostgreSQL is running in Railway dashboard

**WebSocket Issues:**
- Ensure Railway URL uses `wss://` for WebSocket connections
- Check Railway supports WebSocket (it does by default)

### Frontend Issues

**API Connection:**
- Verify `VITE_API_URL` is set in Vercel
- Check browser console for CORS errors
- Ensure Railway backend is running

**WebSocket Connection:**
- Verify `VITE_WS_URL` uses `wss://` protocol
- Check browser console for WebSocket errors

### Common Fixes

**Environment Variables Not Loading:**
- Redeploy after adding env vars
- Clear Vercel build cache if needed

**Port Issues:**
- Railway uses `$PORT` environment variable automatically
- Dockerfile already configured for this

---

## Production Checklist

- [ ] All environment variables set in Railway
- [ ] All environment variables set in Vercel
- [ ] Database tables created
- [ ] CORS configured correctly
- [ ] WebSocket URL uses `wss://`
- [ ] Tested registration/login
- [ ] Tested voice chat
- [ ] Tested analytics
- [ ] Error handling working
- [ ] Moderation API working

---

## Monitoring

### Railway
- View logs: Railway dashboard → Deployments → View Logs
- Monitor usage: Railway dashboard → Metrics

### Vercel
- View logs: Vercel dashboard → Project → Functions → Logs
- Monitor analytics: Vercel dashboard → Analytics

---

## Updating Your App

1. Make changes locally
2. Test locally
3. Commit and push to GitHub
4. Railway and Vercel will auto-deploy
5. Monitor deployment logs

---

## Cost Estimates

**Railway:**
- Free tier: $5/month credit
- PostgreSQL: ~$5/month
- Backend hosting: ~$5-10/month (depending on usage)

**Vercel:**
- Free tier: Generous limits for personal projects
- Pro: $20/month if you need more

---

## Security Notes

- Never commit `.env` files
- Use strong `JWT_SECRET`
- Keep API keys secure
- Enable Railway/Vercel security features
- Consider rate limiting for production

