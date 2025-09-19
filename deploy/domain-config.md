# Domain Configuration Guide

## For Railway Deployment

### 1. Custom Domain Setup
1. Go to your Railway project dashboard
2. Click on your service → Settings → Domains
3. Add your custom domain (e.g., `yourdomain.com`)
4. Railway will provide you with a CNAME record

### 2. DNS Configuration
Add these DNS records to your domain provider:

```
Type: CNAME
Name: @ (or www)
Value: [railway-provided-domain].railway.app
TTL: 3600
```

### 3. SSL Certificate
Railway automatically provisions SSL certificates via Let's Encrypt for custom domains.

## For Render Deployment

### 1. Custom Domain Setup
1. Go to Render Dashboard → Your Service → Settings
2. Scroll to "Custom Domains"
3. Add your domain

### 2. DNS Configuration
```
Type: CNAME
Name: @ (or www)
Value: [your-service].onrender.com
TTL: 3600
```

## For Vercel Deployment

### 1. Domain Configuration
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy and configure domain
vercel --prod
vercel domains add yourdomain.com
```

## Environment Variables for Custom Domain

Update your `.env.production` file:

```env
# Add your domain to allowed origins
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Update base URL if needed
BASE_URL=https://yourdomain.com
```

## SSL Configuration

### Force HTTPS Redirect
The application automatically redirects HTTP to HTTPS in production mode via the security middleware in `src/security.js`.

### SSL Headers
The following security headers are automatically configured:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

## Testing Your Domain

1. **Health Check**: Visit `https://yourdomain.com/healthz`
2. **Strict Health Check**: Visit `https://yourdomain.com/healthz/strict`
3. **API Test**: `curl https://yourdomain.com/api/health`
4. **WebSocket Test**: Check real-time features in the web interface

## Troubleshooting

### Common Issues

1. **CNAME vs A Record**: Use CNAME for subdomains, A record for root domains
2. **Propagation Time**: DNS changes can take 24-48 hours to propagate
3. **Mixed Content**: Ensure all resources use HTTPS in production
4. **CORS Issues**: Update `ALLOWED_ORIGINS` environment variable

### DNS Propagation Check
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```