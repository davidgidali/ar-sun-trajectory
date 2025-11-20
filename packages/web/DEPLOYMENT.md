# Deployment Guide

## Local Development

The development server is running. Access it at:
- **Local**: http://localhost:3000

### Testing on iPhone

To test on your iPhone SE:

1. **Find your local IP address**:
   - Windows: Run `ipconfig` and look for IPv4 Address (usually 192.168.x.x)
   - Or use your computer's network IP

2. **Access from iPhone**:
   - Make sure your iPhone is on the same Wi-Fi network
   - Open Safari on iPhone
   - Navigate to: `http://YOUR_LOCAL_IP:3000`
   - Example: `http://192.168.1.100:3000`

3. **Grant Permissions**:
   - Camera permission (required)
   - Location permission (required)
   - Device Motion permission (required on iOS 13+)

## Deploy to Vercel

### Option 1: GitHub + Vercel (Recommended)

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AR Sun Trajectory MVP"
   ```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., "ar-sun-trajectory")
   - Don't initialize with README (we already have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ar-sun-trajectory.git
   git branch -M main
   git push -u origin main
   ```

4. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your repository
   - Vercel will auto-detect Next.js
   - Click "Deploy"
   - Wait for deployment (usually 1-2 minutes)

5. **Access Your App**:
   - Vercel will provide a URL like: `https://ar-sun-trajectory.vercel.app`
   - Open this URL on your iPhone SE Safari
   - Grant all permissions when prompted

### Option 2: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Login if needed
   - Deploy to production when asked

3. **Access Your App**:
   - Vercel will provide a deployment URL
   - Open on your iPhone SE Safari

## Important Notes

- **HTTPS Required**: Camera and geolocation APIs require HTTPS. Vercel provides this automatically.
- **Permissions**: All three permissions (camera, location, motion) are required for full functionality.
- **iOS Safari**: Works best on iOS 13+ Safari. Older versions may have limited device motion support.
- **Testing**: Test the AR alignment by panning your device - the overlay should slide in the opposite direction.

## Troubleshooting

### Camera not working
- Ensure you're using HTTPS (Vercel provides this)
- Check browser permissions in Settings
- Try refreshing the page

### Location not detected
- Grant location permission
- Use manual location input as fallback
- Check browser console for errors

### AR overlay not aligning
- Grant device motion permission (iOS 13+)
- Ensure device orientation is supported
- Check browser console for orientation errors

### Build errors
- Run `npm run build` locally to check for errors
- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `npx tsc --noEmit`

