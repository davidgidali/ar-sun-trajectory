# Local HTTPS Setup for iPhone Testing

## Why HTTPS is Required
iOS Safari requires HTTPS (secure context) for:
- Camera API (`getUserMedia`)
- Geolocation API
- Device Motion API

HTTP connections are blocked by Safari's security policies.

## Quick Solution: Use Vercel Deployment
Your app is already deployed to Vercel with HTTPS. Use that URL for testing:
- Go to Vercel dashboard
- Copy your deployment URL
- Open on iPhone Safari

## Local HTTPS Setup (Advanced)

### Option A: Using mkcert (Recommended)

1. **Install mkcert** (if not already installed):
   ```powershell
   # Using Chocolatey
   choco install mkcert
   
   # Or download from: https://github.com/FiloSottile/mkcert/releases
   ```

2. **Install local CA**:
   ```powershell
   mkcert -install
   ```

3. **Create certificates**:
   ```powershell
   cd C:\AppWorkshop\Starmap
   mkcert localhost 192.168.1.162
   ```
   This creates `localhost+1.pem` and `localhost+1-key.pem`

4. **Update Next.js to use HTTPS**:
   Create `server.js` in project root:
   ```javascript
   const { createServer } = require('https');
   const { parse } = require('url');
   const next = require('next');
   const fs = require('fs');
   
   const dev = process.env.NODE_ENV !== 'production';
   const hostname = '0.0.0.0';
   const port = 3000;
   
   const app = next({ dev, hostname, port });
   const handle = app.getRequestHandler();
   
   const httpsOptions = {
     key: fs.readFileSync('./localhost+1-key.pem'),
     cert: fs.readFileSync('./localhost+1.pem'),
   };
   
   app.prepare().then(() => {
     createServer(httpsOptions, async (req, res) => {
       try {
         const parsedUrl = parse(req.url, true);
         await handle(req, res, parsedUrl);
       } catch (err) {
         console.error('Error occurred handling', req.url, err);
         res.statusCode = 500;
         res.end('internal server error');
       }
     }).listen(port, hostname, (err) => {
       if (err) throw err;
       console.log(`> Ready on https://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
       console.log(`> Also accessible at https://192.168.1.162:${port}`);
     });
   });
   ```

5. **Update package.json**:
   ```json
   "scripts": {
     "dev": "node server.js",
     ...
   }
   ```

6. **Install certificate on iPhone**:
   - Transfer `rootCA.pem` to iPhone (via email/airdrop)
   - Open Settings > General > VPN & Device Management
   - Install the profile
   - Trust the certificate

7. **Access from iPhone**:
   ```
   https://192.168.1.162:3000
   ```

### Option B: Using ngrok (Easiest, but requires signup)

1. **Sign up at ngrok.com** (free tier available)

2. **Install ngrok**:
   ```powershell
   choco install ngrok
   # Or download from: https://ngrok.com/download
   ```

3. **Start your Next.js dev server**:
   ```powershell
   npm run dev
   ```

4. **Create HTTPS tunnel**:
   ```powershell
   ngrok http 3000
   ```

5. **Use the ngrok HTTPS URL** on your iPhone (e.g., `https://abc123.ngrok.io`)

### Option C: Self-Signed Certificate (Simpler but requires trust)

1. **Generate self-signed certificate**:
   ```powershell
   # Using OpenSSL (if installed)
   openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=192.168.1.162"
   ```

2. **Use the server.js from Option A** with these certificates

3. **On iPhone**: You'll need to accept the security warning and trust the certificate

## Recommended Approach
For quick testing: **Use Vercel deployment** (already has HTTPS)
For local development: **Use mkcert** (most reliable, trusted by browsers)

