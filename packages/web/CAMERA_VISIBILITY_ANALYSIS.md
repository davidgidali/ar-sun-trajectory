# Camera Visibility Analysis

## Code Parts Controlling Camera Visibility

### 1. **ARCamera.tsx** (Video Element)
**Location**: Lines 83-92

**Current Settings**:
- `className="absolute inset-0 w-full h-full object-cover"` - Full screen positioning
- **No explicit z-index** - Defaults to `auto` (stacking order 0)
- `autoPlay`, `playsInline`, `muted` - Video playback attributes
- Horizontal flip is **commented out** (line 90): `// style={{ transform: 'scaleX(-1)' }}`

**Potential Issues**:
- No explicit z-index means it relies on DOM order
- Video might be behind other elements

---

### 2. **ARScene.tsx** (Canvas Overlay)
**Location**: Lines 177-183

**Current Settings**:
- `zIndex: 10` - **Explicitly above video** (line 181)
- `background: 'transparent'` - Inline style (line 181)
- `pointer-events-none` - Allows clicks to pass through (line 180)
- `className="absolute inset-0 w-full h-full"` - Full screen positioning

**Renderer Settings** (Lines 38-47):
- `alpha: true` - Enables transparency (line 41)
- `setClearColor(0x000000, 0)` - Black with 0 opacity = transparent (line 44)
- `scene.background = null` - No scene background (line 31)

**Potential Issues**:
- Canvas is correctly on top (z-index 10) but should be transparent
- If renderer isn't properly clearing alpha channel, canvas could be opaque
- Canvas might have default white/black background despite settings

---

### 3. **app/page.tsx** (Layout Structure)
**Location**: Lines 122-142

**Current Structure**:
```jsx
<main className="relative w-screen h-screen overflow-hidden bg-black">
  <ARCamera />           {/* z-index: auto (0) */}
  <ARScene />            {/* z-index: 10 */}
  {/* Other overlays */}
</main>
```

**Potential Issues**:
- `bg-black` on main element - **This could be showing through if canvas isn't fully transparent**
- Main element covers entire screen
- If canvas has any opacity, black background shows through

---

### 4. **app/globals.css**
**Location**: Lines 10-16

**Current Settings**:
- `body { background: rgb(255, 255, 255) }` - White background
- `overflow: hidden` - Prevents scrolling

**Potential Issues**:
- Body background shouldn't affect visibility, but worth noting

---

## Root Cause Analysis

### Most Likely Issues:

1. **Canvas Not Fully Transparent**
   - Despite `alpha: true` and `setClearColor(0x000000, 0)`, the canvas might still be rendering with opacity
   - WebGL renderer might not be properly clearing the alpha channel
   - Canvas element might have default background color

2. **Main Element Black Background Showing Through**
   - `bg-black` on main element (line 123 in page.tsx)
   - If canvas has any opacity (even 0.01), black shows through
   - This creates the "black screen" effect

3. **Video Element Z-Index**
   - Video has no explicit z-index (defaults to 0)
   - Canvas has z-index 10 (correctly on top)
   - But if canvas isn't transparent, video is hidden behind it

4. **Renderer Alpha Channel Not Clearing**
   - `setClearColor(0x000000, 0)` should work, but might need additional settings
   - May need `renderer.setPixelRatio()` or other renderer settings
   - WebGL context might need specific attributes

---

## Debugging Checklist

### To Verify Canvas Transparency:
1. **Check computed styles**: Inspect canvas element in browser dev tools
   - Look for `background-color` in computed styles
   - Check if `opacity` is set
   - Verify `z-index` is 10

2. **Check WebGL context**: 
   - Verify `alpha: true` is actually applied
   - Check if `premultipliedAlpha` needs to be set
   - Verify `preserveDrawingBuffer` setting

3. **Test with canvas hidden**:
   - Temporarily set `display: none` on canvas
   - If video appears, canvas transparency is the issue

4. **Check renderer output**:
   - Add console.log to verify renderer settings
   - Check if scene is rendering anything that blocks view

### To Verify Video Element:
1. **Check video z-index**: Should be lower than canvas (0 < 10) ✓
2. **Check video visibility**: Verify video element is actually rendering
3. **Check video stream**: Verify camera stream is active
4. **Check video dimensions**: Ensure video covers full screen

---

## Potential Fixes

### Fix 1: Ensure Canvas is Fully Transparent
```javascript
// In ARScene.tsx, after renderer creation:
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
// Add this:
renderer.domElement.style.backgroundColor = 'transparent';
```

### Fix 2: Remove Black Background from Main
```jsx
// In app/page.tsx, line 123:
<main className="relative w-screen h-screen overflow-hidden">
  {/* Remove bg-black */}
```

### Fix 3: Add Explicit Z-Index to Video
```jsx
// In ARCamera.tsx, line 89:
style={{ zIndex: 0 }}  // Explicitly set below canvas
```

### Fix 4: Verify WebGL Context Alpha
```javascript
// In ARScene.tsx, check renderer context:
const gl = renderer.getContext();
console.log('Alpha:', gl.getContextAttributes().alpha);
console.log('PremultipliedAlpha:', gl.getContextAttributes().premultipliedAlpha);
```

### Fix 5: Add Canvas CSS
```css
/* Ensure canvas has no background */
canvas {
  background: transparent !important;
  background-color: transparent !important;
}
```

---

## Recommended Investigation Order

1. **First**: Remove `bg-black` from main element and test
2. **Second**: Add explicit `zIndex: 0` to video element
3. **Third**: Verify renderer alpha channel is working
4. **Fourth**: Add canvas CSS to force transparency
5. **Fifth**: Check if scene is rendering opaque geometry that blocks view

