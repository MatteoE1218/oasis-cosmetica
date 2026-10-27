import { useState, useEffect } from 'react'

/**
 * Detects device GPU/CPU capability and returns a performance tier.
 * Used to scale 3D complexity (particle count, DPR, material quality).
 */
export default function useDevicePerformance() {
  const [tier, setTier] = useState('high')

  useEffect(() => {
    let detected = 'high'

    // Check hardware concurrency
    const cores = navigator.hardwareConcurrency || 4
    if (cores <= 2) detected = 'low'
    else if (cores <= 4) detected = 'medium'

    // Check device pixel ratio (high DPR = more GPU work)
    const dpr = window.devicePixelRatio || 1
    if (dpr > 2 && cores <= 4) detected = 'medium'

    // Check for mobile/touch (usually lower GPU)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile && detected === 'high') detected = 'medium'

    // Check WebGL renderer info
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
          if (renderer.includes('intel') || renderer.includes('mesa') || renderer.includes('swiftshader')) {
            detected = 'low'
          }
        }
      }
    } catch {
      // Ignore WebGL detection failure
    }

    setTier(detected)
  }, [])

  return {
    tier,
    particleCount: tier === 'high' ? 300 : tier === 'medium' ? 120 : 50,
    dpr: tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [1, 1],
    enableShadows: tier !== 'low',
    enableEnvironment: tier !== 'low',
    enablePostProcessing: tier === 'high',
  }
}
