# 🚀 Deployment Guide

This guide covers deploying Kalyanam to production.

## Build Process

### 1. Production Build

```bash
npm run build
```

This creates an optimized production build in the `out` directory (static export).

### 2. Test Production Build Locally

```bash
npx serve out
```

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the company behind Next.js and offers the best deployment experience.

#### Automatic Deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Click "Deploy"

#### CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Configuration
No special configuration needed - Vercel auto-detects Next.js.

### Option 2: Netlify

#### Drag & Drop
1. Run `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag the `out` folder to the deploy zone

#### Git Integration
1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `out`

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: GitHub Pages

#### Setup
1. Go to repository Settings → Pages
2. Set source to "GitHub Actions"

#### GitHub Action
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### Option 4: Self-Hosted

#### Using Nginx

```nginx
server {
    listen 80;
    server_name kalyanam.example.com;
    root /var/www/kalyanam/out;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

#### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t kalyanam .
docker run -p 80:80 kalyanam
```

### Option 5: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
npm run build
firebase deploy
```

#### firebase.json
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Environment Variables

### Production Variables
Create environment variables in your hosting platform:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Vercel
- Go to Project Settings → Environment Variables
- Add variables for Production/Preview/Development

### Netlify
- Go to Site Settings → Environment Variables
- Add your variables

## Domain Configuration

### Custom Domain Setup

1. **Get your deployment URL** (e.g., `kalyanam.vercel.app`)

2. **Configure DNS**:
   - A Record: `@` → Platform IP
   - CNAME: `www` → `kalyanam.vercel.app`

3. **Add domain in platform settings**

4. **Enable HTTPS** (usually automatic)

## Performance Optimization

### Pre-deployment Checklist

- [ ] Run `npm run build` without errors
- [ ] Test all pages work correctly
- [ ] Verify PWA installation works
- [ ] Check offline functionality
- [ ] Test on mobile devices
- [ ] Verify all images are optimized

### Lighthouse Score Goals

| Metric | Target |
|--------|--------|
| Performance | > 90 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |
| PWA | ✅ |

## Monitoring

### Analytics (Optional)

Add analytics to track usage:

```typescript
// src/lib/analytics.ts
export function trackEvent(name: string, properties?: object) {
  // Your analytics implementation
}
```

### Error Tracking (Optional)

Consider adding error tracking:
- Sentry
- LogRocket
- Rollbar

## Continuous Deployment

### Automatic Deployments

Most platforms support automatic deployments:

1. **Vercel/Netlify**: Automatic on push to main
2. **GitHub Actions**: Configure workflow
3. **GitLab CI/CD**: Add `.gitlab-ci.yml`

### Branch Previews

- **Vercel**: Automatic preview for each PR
- **Netlify**: Enable Deploy Previews
- **GitHub Pages**: Use separate branch

## Rollback

### Vercel
- Go to Deployments
- Click on a previous deployment
- Click "Promote to Production"

### Netlify
- Go to Deploys
- Select a previous deploy
- Click "Publish deploy"

### Manual
Keep previous builds:
```bash
# Before deploying
mv out out-backup-$(date +%Y%m%d)
npm run build
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] No sensitive data in client code
- [ ] Dependencies up to date
- [ ] Security headers set

### Security Headers (Nginx)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Troubleshooting

### Build Failures
1. Check Node.js version
2. Clear `.next` and `node_modules`
3. Run `npm ci` instead of `npm install`

### 404 Errors
- Ensure `trailingSlash: true` in `next.config.js`
- Configure redirects in hosting platform

### PWA Not Installing
- Check HTTPS is enabled
- Verify `manifest.json` is accessible
- Check service worker registration

