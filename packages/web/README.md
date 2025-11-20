# AR Sun Trajectory MVP

A Next.js web application that displays the sun's trajectory for today overlaid on your device camera view using AR. The overlay aligns with the real world and responds correctly to device orientation changes.

## Features

- **AR Overlay**: Sun trajectory arc overlaid on camera view
- **Real-time Alignment**: AR content correctly responds to device motion (yaw, pitch, roll)
- **Sun Calculations**: Accurate sun position calculations using SunCalc
- **Location Detection**: Automatic geolocation with manual fallback
- **Hourly Markers**: Visual markers showing sun position at each hour
- **Current Position**: Real-time indicator showing current sun position

## Tech Stack

- **Next.js 14** (App Router) - React framework
- **Three.js** - 3D graphics and AR overlay
- **SunCalc** - Solar position calculations
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Starmap
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing on iPhone

1. Deploy to Vercel (see Deployment section)
2. Open the deployed URL on your iPhone SE Safari browser
3. Grant camera, location, and motion permissions when prompted
4. Point your device at the sky to see the sun trajectory overlay

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy (Vercel will automatically detect Next.js)

The app requires HTTPS for camera and geolocation APIs, which Vercel provides automatically.

## How It Works

1. **Camera Access**: Requests access to device camera and displays the feed
2. **Location Detection**: Gets user location via geolocation API or manual input
3. **Sun Calculations**: Calculates sun trajectory for today using SunCalc library
4. **Device Orientation**: Listens to device orientation events (yaw, pitch, roll)
5. **AR Overlay**: Renders sun trajectory arc in Three.js scene, aligned with device orientation
6. **Coordinate Transformation**: Correctly transforms device motion to screen movement (yaw right = overlay slides left)

## Critical AR Alignment

The app implements correct coordinate transformation:
- Device yaw (alpha) → negative rotation in Three.js (so yaw right = overlay slides left)
- Device pitch (beta) → pitch rotation in scene
- Device roll (gamma) → roll rotation in scene

## Browser Compatibility

- **iOS Safari**: Full support (requires iOS 13+ for device motion)
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari (Desktop)**: Limited (no device orientation)

## Permissions Required

- **Camera**: To display AR overlay
- **Location**: To calculate accurate sun trajectory
- **Device Motion** (iOS 13+): To align AR overlay with device orientation

## License

MIT

