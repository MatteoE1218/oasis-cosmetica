import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  PerspectiveCamera,
  ContactShadows,
} from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import LipstickModel from './LipstickModel'
import SerumBottleModel from './SerumBottleModel'
import CompactPowderModel from './CompactPowderModel'
import GlitterParticles from './GlitterParticles'
import StudioLighting from './StudioLighting'
import scrollState from '../../stores/scrollStore'

/**
 * Camera and Scene Rig for smooth cinematic parallax
 * Interpolates mouse movement into camera micro-rotation for luxury depth feel
 */
function CameraRig() {
  useFrame((state, delta) => {
    // Smooth damp mouse coordinates
    scrollState.mouse.x = THREE.MathUtils.damp(
      scrollState.mouse.x,
      scrollState.mouse.targetX,
      3.5,
      delta
    )
    scrollState.mouse.y = THREE.MathUtils.damp(
      scrollState.mouse.y,
      scrollState.mouse.targetY,
      3.5,
      delta
    )

    // Gentle camera offset based on mouse position
    state.camera.position.x = scrollState.mouse.x * 0.35
    state.camera.position.y = 0.45 + scrollState.mouse.y * 0.25
    state.camera.lookAt(0, 0, 0)
  })

  return null
}

/**
 * Editorial Luminous 3D Scene
 * Fixed background canvas coordinating the 3 luxury cosmetic items:
 * 1. Rouge Éternel Lipstick (detachable gold cap, live color changes)
 * 2. Sérum Éclat Glass Foundation Bottle (translucent glass & dropper, live tone changes)
 * 3. Poudre Éclat White Lacquer Compact (opening mirror lid, shade focus)
 *
 * Designed with zero scroll-blocking: pointer-events are passed cleanly to the document.
 */
export default function Scene3D({
  dpr = [1, 2],
  particleCount = 120,
  enableShadows = true,
  enableEnvironment = true,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Map to [-1, 1] range
      scrollState.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        scrollState.mouse.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1
        scrollState.mouse.targetY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return (
    <div ref={containerRef} className="canvas-container" aria-hidden="true">
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        dpr={dpr}
        shadows={enableShadows}
        camera={{ position: [0, 0.45, 5.2], fov: 42 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.45, 5.2]} fov={42} />

        <CameraRig />

        {/* Studio Lighting Rig */}
        <StudioLighting />

        {/* Clean Studio Reflections */}
        {enableEnvironment && (
          <Suspense fallback={null}>
            <Environment preset="studio" environmentIntensity={0.85} />
          </Suspense>
        )}

        {/* 3D Cosmetic Models */}
        <Suspense fallback={null}>
          <LipstickModel basePosition={[0, -0.6, 0]} scale={1.25} />
          <SerumBottleModel basePosition={[0, -0.6, 0]} scale={1.2} />
          <CompactPowderModel basePosition={[0, -0.6, 0]} scale={1.15} />
        </Suspense>

        {/* Pearlescent Floating Particles */}
        <GlitterParticles count={particleCount} radius={7.5} />

        {/* Warm studio contact shadow */}
        {enableShadows && (
          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.25}
            scale={9}
            blur={2.4}
            far={4}
            color="#8A7568"
          />
        )}
      </Canvas>
    </div>
  )
}

