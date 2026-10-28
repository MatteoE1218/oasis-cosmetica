import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import scrollState from '../../stores/scrollStore'

/**
 * Editorial Studio Lighting Rig — Luminous Light Edition
 * Calibrated specifically for clean, bright, white/ivory backgrounds (Dior/Chanel style).
 * Features:
 * - High ambient radiance to ensure products are luminous and crisp, never dark silhouettes.
 * - Soft directional key light with realistic contact illumination.
 * - Smooth temperature morphing across sections.
 */
export default function StudioLighting() {
  const keyLightRef = useRef()
  const rimLightRef = useRef()
  const fillLightRef = useRef()
  const hemiLightRef = useRef()

  const keyColor = useRef(new THREE.Color())
  const rimColor = useRef(new THREE.Color())

  useFrame((_, delta) => {
    const gp = scrollState.globalProgress || 0

    if (gp < 0.25) {
      // Act 1: Hero / Pure White & Soft Blush
      keyColor.current.set('#FFFFFF')
      rimColor.current.set('#FFE3EC')
    } else if (gp >= 0.25 && gp < 0.52) {
      // Act 2: Lipstick / Pink Sparkle
      keyColor.current.set('#FFFDFD')
      rimColor.current.set('#FFB6C1')
    } else if (gp >= 0.52 && gp < 0.78) {
      // Act 3: Liquid Foundation / Soft Pink
      keyColor.current.set('#FFFFFF')
      rimColor.current.set('#FFF0F5')
    } else {
      // Act 4: Compact Powder / Luminous Ivory
      keyColor.current.set('#FAFAFA')
      rimColor.current.set('#FFE3EC')
    }

    if (keyLightRef.current) {
      keyLightRef.current.color.lerp(keyColor.current, delta * 3)
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.lerp(rimColor.current, delta * 3)
    }
  })

  return (
    <>
      {/* Editorial Key Light — main soft directional */}
      <directionalLight
        ref={keyLightRef}
        position={[4, 6, 4]}
        intensity={1.8}
        color="#FFFBF5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
      />

      {/* Editorial Fill Light — balances shadows for clean commercial look */}
      <directionalLight
        ref={fillLightRef}
        position={[-4, 4, 2]}
        intensity={1.0}
        color="#FFF9F5"
      />

      {/* Delicate Rim / Back Light — highlights gold trims & glass edges */}
      <pointLight
        ref={rimLightRef}
        position={[-2, 4, -3]}
        intensity={1.2}
        color="#FFE8D6"
        distance={15}
        decay={2}
      />

      {/* Soft Front Bounce Light */}
      <directionalLight
        position={[0, -2, 4]}
        intensity={0.4}
        color="#FFFFFF"
      />

      {/* Radiant Studio Ambient Light */}
      <ambientLight intensity={0.8} color="#FFFFFF" />

      {/* Hemisphere light — clean studio sky/ground bounce */}
      <hemisphereLight
        ref={hemiLightRef}
        args={['#FFFFFF', '#FFF0F5', 0.65]}
      />
    </>
  )
}
