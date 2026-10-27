import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Editorial Luminous Pearl Particles
 * Floating champagne gold, rose petal, and diamond shimmer specs
 * calibrated for clean light backgrounds.
 */
export default function GlitterParticles({ count = 150, radius = 7 }) {
  const pointsRef = useRef()

  const { positions, colors, sizes, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    const spd = new Float32Array(count)

    // Palette: soft rose, warm gold, champagne, bronze
    const palette = [
      new THREE.Color('#C55367'),
      new THREE.Color('#D4A574'),
      new THREE.Color('#C5A059'),
      new THREE.Color('#E8B0BA'),
      new THREE.Color('#B8860B'),
      new THREE.Color('#8E6B73'),
    ]

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.35 + Math.random() * 0.65)

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      const color = palette[Math.floor(Math.random() * palette.length)]
      col[i * 3] = color.r
      col[i * 3 + 1] = color.g
      col[i * 3 + 2] = color.b

      siz[i] = Math.random() * 0.05 + 0.015
      spd[i] = 0.2 + Math.random() * 0.7
    }

    return { positions: pos, colors: col, sizes: siz, speeds: spd }
  }, [count, radius])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.elapsedTime

    pointsRef.current.rotation.y = time * 0.02
    pointsRef.current.rotation.x = Math.sin(time * 0.01) * 0.05

    const posArray = pointsRef.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const speed = speeds[i]
      posArray[i3 + 1] += Math.sin(time * speed + i) * 0.0008
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  )
}
