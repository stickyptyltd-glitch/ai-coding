# 🚀 Deployment Guide - AI Coding Agent

This guide covers various deployment options for the AI Coding Agent platform.

## 📋 Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Code linted and formatted (`npm run lint`)
- [ ] Environment variables configured
- [ ] AI provider API keys obtained
- [ ] Production database setup (if applicable)
- [ ] SSL certificates ready (for HTTPS)
- [ ] Monitoring and logging configured

## 🛠️ Deployment Options

### 1. 🐳 Docker Deployment (Recommended)

#### Build and Run Locally
```bash
# Build the Docker image
docker build -t ai-coding-agent:latest .

# Run with environment variables
docker run -d \
  --name ai-coding-agent \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your_key_here \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  ai-coding-agent:latest
```

#### Docker Compose (Full Stack)
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  ai-agent:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_API_KEY=${AGENT_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - ai-agent
    restart: unless-stopped
```

### 2. ☁️ Cloud Platforms

#### AWS ECS/Fargate
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker build -t ai-coding-agent .
docker tag ai-coding-agent:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-coding-agent:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-coding-agent:latest

# Deploy with Terraform or CloudFormation
```

#### Google Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy ai-coding-agent \
  --image gcr.io/PROJECT-ID/ai-coding-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_key
```

#### Azure Container Instances
```bash
# Deploy to ACI
az container create \
  --resource-group myResourceGroup \
  --name ai-coding-agent \
  --image your-registry/ai-coding-agent:latest \
  --dns-name-label ai-coding-agent \
  --ports 3000 \
  --environment-variables NODE_ENV=production OPENAI_API_KEY=your_key
```

### 3. 🖥️ VPS/Bare Metal

#### Ubuntu/Debian Setup
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Clone and setup
git clone https://github.com/yourusername/ai-coding-agent
cd ai-coding-agent
npm install --production

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start with PM2
pm2 start src/web-server.js --name "ai-coding-agent"
pm2 startup
pm2 save
```

#### NGINX Reverse Proxy
```nginx
# /etc/nginx/sites-available/ai-coding-agent
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
    
    # Static file caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Configuration

### Environment Variables
```bash
# Production environment
export NODE_ENV=production
export AGENT_API_KEY=$(openssl rand -hex 32)

# AI Provider Keys (keep secure!)
export OPENAI_API_KEY=your_openai_key
export ANTHROPIC_API_KEY=your_anthropic_key

# Optional: Database encryption
export DATABASE_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3000/tcp  # Block direct access to app
sudo ufw enable
```

## 📊 Monitoring & Logging

### Health Checks
```bash
# Add to your monitoring system
curl -f http://localhost:3000/healthz || exit 1

# Or for detailed status
curl http://localhost:3000/api/status
```

### Log Management
```javascript
// PM2 Logs
pm2 logs ai-coding-agent

// Log rotation with logrotate
// /etc/logrotate.d/ai-coding-agent
/var/log/ai-coding-agent/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 644 www-data www-data
}
```

### Monitoring Stack (Optional)
```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      
volumes:
  grafana-storage:
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build Docker image
        run: |
          docker build -t ai-coding-agent:${{ github.sha }} .
          docker tag ai-coding-agent:${{ github.sha }} ai-coding-agent:latest
          
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

## 🚀 Performance Optimization

### Production Optimizations
```javascript
// package.json production script
{
  "scripts": {
    "start:prod": "NODE_ENV=production node --max-old-space-size=2048 src/web-server.js"
  }
}
```

### Load Balancing
```nginx
# NGINX load balancing
upstream ai_coding_agent {
    server localhost:3001 weight=3;
    server localhost:3002 weight=2;
    server localhost:3003 weight=1;
}

server {
    location / {
        proxy_pass http://ai_coding_agent;
    }
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill the process
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/ai-coding-agent
chmod +x src/web-server.js
```

#### 3. Memory Issues
```bash
# Monitor memory usage
htop
# Increase Node.js memory limit
node --max-old-space-size=4096 src/web-server.js
```

#### 4. AI Provider API Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### Log Analysis
```bash
# Check application logs
tail -f logs/app.log

# System logs
journalctl -u ai-coding-agent -f

# PM2 logs
pm2 logs ai-coding-agent --lines 100
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage
- Implement database clustering
- Add load balancer (NGINX, HAProxy)
- Consider microservices architecture

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching (Redis, Memcached)
- Use CDN for static assets

## 🆘 Support

If you encounter issues during deployment:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review application logs
3. Consult the [GitHub Issues](https://github.com/yourusername/ai-coding-agent/issues)
4. Join our [Discord community](https://discord.gg/ai-coding-agent)
5. Contact support: support@ai-coding-agent.com

---

**Happy Deploying! 🚀**