# 🚀 Lecheyne AI - Complete Deployment Guide

## ⚠️ Important Note About appo.live

The originally requested "appo.live" hosting platform does not exist as a legitimate web hosting service. This deployment guide provides production-ready alternatives with similar or better features.

## 🎯 Recommended Hosting Platforms

### 1. Railway (Recommended) 🚂
**Best for**: Full-stack applications with databases
- **Pros**: Git-based deployment, built-in databases, simple scaling
- **Pricing**: Free tier available, pay-as-you-grow
- **Deploy time**: ~5 minutes

### 2. Render 🎨
**Best for**: Production applications with advanced features
- **Pros**: Auto-scaling, global CDN, team collaboration
- **Pricing**: Free tier for static sites, affordable for services
- **Deploy time**: ~3 minutes

### 3. Vercel ▲
**Best for**: Static/JAMstack deployments
- **Pros**: Edge functions, excellent performance, GitHub integration
- **Pricing**: Generous free tier
- **Deploy time**: ~2 minutes

## 🚀 Quick Deployment (Railway)

### Step 1: Prepare Repository
```bash
# Ensure all deployment files are committed
git add .
git commit -m "Add deployment configuration"
git push origin main
```

### Step 2: Deploy to Railway
1. Visit [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects the Node.js app and deploys

### Step 3: Configure Environment Variables
In Railway dashboard:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
AGENT_API_KEY=your_secure_random_string
NODE_ENV=production
```

### Step 4: Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS with provided CNAME record

## 🎨 Deploy to Render

### Step 1: Connect Repository
1. Visit [render.com](https://render.com)
2. Sign up and connect GitHub
3. Click "New" → "Web Service"
4. Select your repository

### Step 2: Configure Service
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Environment**: Node.js

### Step 3: Environment Variables
Add in Render dashboard:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
AGENT_API_KEY=your_secure_random_string
NODE_ENV=production
```

## ▲ Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Deploy
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Step 3: Configure Environment Variables
```bash
# Add environment variables
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add AGENT_API_KEY
```

## 🐳 Docker Deployment (Any Platform)

### Build Production Image
```bash
# Build optimized production image
docker build -f Dockerfile.prod -t lecheyne-ai:latest .

# Test locally
docker run -p 3000:3000 --env-file .env.production lecheyne-ai:latest
```

### Deploy to Container Registry
```bash
# Tag for registry
docker tag lecheyne-ai:latest your-registry/lecheyne-ai:latest

# Push to registry
docker push your-registry/lecheyne-ai:latest
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Container registry access

### Deploy
```bash
# Update image in deployment.yaml
# Then deploy
kubectl apply -f deploy/k8s/
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Core (Required)
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Security (Recommended)
AGENT_API_KEY=your_secure_random_string

# Optional Features
ENABLE_ENTERPRISE_FEATURES=true
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Optional Features
```env
# Database (for advanced features)
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port

# Monitoring
ENABLE_MONITORING=true
SENTRY_DSN=your_sentry_dsn

# Custom Domain
ALLOWED_ORIGINS=https://yourdomain.com
```

## 📊 Post-Deployment Checklist

### ✅ Immediate Checks
- [ ] Service is running: `https://your-domain.com`
- [ ] Health check: `https://your-domain.com/healthz`
- [ ] API working: `https://your-domain.com/api/health`
- [ ] WebSocket connection works
- [ ] Environment variables loaded correctly

### ✅ Security Checks
- [ ] HTTPS enabled and working
- [ ] API key authentication working (if enabled)
- [ ] CORS configured correctly
- [ ] Security headers present
- [ ] No sensitive data in logs

### ✅ Performance Checks
- [ ] Response times < 2s
- [ ] Memory usage stable
- [ ] No memory leaks
- [ ] Proper caching headers
- [ ] CDN configured (if applicable)

### ✅ Monitoring Setup
- [ ] Health check monitoring configured
- [ ] Error tracking enabled
- [ ] Log aggregation working
- [ ] Alert notifications configured
- [ ] Performance metrics tracked

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check Node.js version (requires 18-20)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Environment Variables Not Loading
- Verify variable names (case-sensitive)
- Check platform-specific env var format
- Ensure no trailing spaces in values

#### 3. Health Check Failures
```bash
# Test health endpoint locally
curl http://localhost:3000/healthz

# Check application logs
# Railway: View in dashboard
# Render: Check logs in dashboard
# Docker: docker logs container-name
```

#### 4. Memory Issues
- Increase memory limits in platform settings
- Check for memory leaks in logs
- Optimize NODE_OPTIONS for memory

### Getting Help

1. **Platform Documentation**:
   - Railway: [docs.railway.app](https://docs.railway.app)
   - Render: [render.com/docs](https://render.com/docs)
   - Vercel: [vercel.com/docs](https://vercel.com/docs)

2. **Application Logs**: Check your platform's logging interface

3. **GitHub Issues**: [Report deployment issues](https://github.com/your-repo/issues)

## 🌟 Success!

Your Lecheyne AI platform is now deployed and ready for production use!

🎉 **Next Steps**:
- Configure your custom domain
- Set up monitoring and alerts
- Invite team members
- Start building with AI agents

---

**Made with ❤️ in Melbourne, Australia**
**© 2025 Sticky Pty Ltd - Lecheyne AI**