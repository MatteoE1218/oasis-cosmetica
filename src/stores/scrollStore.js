/**
 * Global State & Scrollytelling Store
 * Shared between GSAP ScrollTrigger (writers) and R3F / React UI (readers).
 * Uses direct mutation for 60-120fps useFrame loops without React re-render thrashing.
 */
const scrollState = {
  // Global smoothed progress [0, 1]
  globalProgress: 0,
  globalScrollY: 0,

  // Section-specific progress [0, 1] measured directly by ScrollTrigger
  hero: { progress: 0, active: true },
  lipstick: { progress: 0, active: false },
  serum: { progress: 0, active: false },
  compact: { progress: 0, active: false },
  textures: { progress: 0, active: false },
  catalog: { progress: 0, active: false },

  // Mouse cursor for subtle cinematic parallax (normalized -1 to 1)
  mouse: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },

  // Live selected cosmetic colors (updated when user clicks UI swatches)
  lipstickColor: '#C52844',
  lipstickShadeName: 'Carmesí Imperial 01',
  serumColor: '#f5e6d3',
  serumShadeName: 'Porcelana 01',
  compactColor: '#FAFAF8',
  compactShadeIndex: 0,

  // 3D Inspection interaction toggle
  isInspecting: false,
  rotationManualOffset: 0,
}

export default scrollState

