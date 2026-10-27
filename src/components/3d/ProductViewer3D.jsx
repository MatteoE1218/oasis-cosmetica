import { useRef, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import StudioLighting from './StudioLighting'
import './ProductViewer3D.css'

/**
 * 3D Lipstick Component (Static Haute Couture Staging)
 */
function StaticLipstick({ color = '#C52844' }) {
  const groupRef = useRef()
  const bulletMeshRef = useRef()
  const currentColor = useRef(new THREE.Color(color))

  const bulletGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.34, 0),
      new THREE.Vector2(0.34, 0.5),
      new THREE.Vector2(0.33, 0.58),
      new THREE.Vector2(0.30, 0.68),
      new THREE.Vector2(0.24, 0.78),
      new THREE.Vector2(0.16, 0.86),
      new THREE.Vector2(0.06, 0.92),
      new THREE.Vector2(0, 0.95),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  const tubeGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0),
      new THREE.Vector2(0.40, 0.04),
      new THREE.Vector2(0.40, 1.2),
      new THREE.Vector2(0.38, 1.24),
      new THREE.Vector2(0, 1.24),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  const capGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.42, 1.1),
      new THREE.Vector2(0.40, 1.14),
      new THREE.Vector2(0.36, 1.18),
      new THREE.Vector2(0.20, 1.22),
      new THREE.Vector2(0, 1.24),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime
    // Subtle breathing float in place without translational jumping
    groupRef.current.position.y = -0.55 + Math.sin(time * 0.8) * 0.03
    groupRef.current.rotation.y = 0.35 + Math.sin(time * 0.35) * 0.15

    if (bulletMeshRef.current && color) {
      const target = new THREE.Color(color)
      currentColor.current.lerp(target, delta * 6)
      bulletMeshRef.current.material.color.copy(currentColor.current)
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.55, 0]} rotation={[0.08, 0.35, -0.06]} scale={1.35}>
      {/* Gold Body Tube */}
      <mesh geometry={tubeGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.94}
          roughness={0.14}
          envMapIntensity={2.8}
          clearcoat={0.8}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {/* Gold Accent Ring */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <torusGeometry args={[0.40, 0.025, 16, 48]} />
        <meshPhysicalMaterial
          color="#F5D77F"
          metalness={0.98}
          roughness={0.06}
          envMapIntensity={3.2}
        />
      </mesh>

      {/* Satin Lipstick Bullet */}
      <mesh ref={bulletMeshRef} geometry={bulletGeometry} position={[0, 1.26, 0]} castShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.04}
          roughness={0.24}
          clearcoat={0.9}
          clearcoatRoughness={0.08}
          sheen={0.85}
          sheenColor="#FFA0B2"
          sheenRoughness={0.2}
          envMapIntensity={2}
        />
      </mesh>

      {/* Elegantly Lifted & Angled Gold Cap */}
      <group position={[0.7, 1.45, -0.3]} rotation={[0.1, 0, 0.28]}>
        <mesh geometry={capGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#D4AF37"
            metalness={0.94}
            roughness={0.14}
            envMapIntensity={2.8}
            clearcoat={0.8}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh position={[0, 1.24, 0]} castShadow>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshPhysicalMaterial
            color="#F5D77F"
            metalness={0.98}
            roughness={0.05}
            envMapIntensity={3.2}
          />
        </mesh>
      </group>
    </group>
  )
}

/**
 * 3D Foundation / Serum Bottle Component (Static Glass & Fluid Staging)
 */
function StaticSerumBottle({ color = '#f5e6d3' }) {
  const groupRef = useRef()
  const liquidMeshRef = useRef()
  const currentLiquidColor = useRef(new THREE.Color(color))

  const bottleGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.65, 0),
      new THREE.Vector2(0.72, 0.08),
      new THREE.Vector2(0.72, 1.8),
      new THREE.Vector2(0.68, 2.05),
      new THREE.Vector2(0.48, 2.25),
      new THREE.Vector2(0.38, 2.3),
      new THREE.Vector2(0.38, 2.65),
      new THREE.Vector2(0.32, 2.65),
      new THREE.Vector2(0.32, 2.25),
      new THREE.Vector2(0, 2.25),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  const liquidGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0.05),
      new THREE.Vector2(0.62, 0.05),
      new THREE.Vector2(0.65, 0.12),
      new THREE.Vector2(0.65, 1.7),
      new THREE.Vector2(0.55, 1.85),
      new THREE.Vector2(0, 1.85),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime
    groupRef.current.position.y = -0.7 + Math.sin(time * 0.75) * 0.03
    groupRef.current.rotation.y = 0.2 + Math.sin(time * 0.3) * 0.15

    if (liquidMeshRef.current && color) {
      const target = new THREE.Color(color)
      currentLiquidColor.current.lerp(target, delta * 6)
      liquidMeshRef.current.material.color.copy(currentLiquidColor.current)
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.7, 0]} rotation={[0.06, 0.2, 0.02]} scale={1.2}>
      {/* Crystal Clear Glass Body */}
      <mesh geometry={bottleGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#FFFFFF"
          transmission={0.93}
          opacity={1}
          transparent
          roughness={0.04}
          ior={1.52}
          thickness={0.85}
          specularIntensity={2}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0.02}
        />
      </mesh>

      {/* Dynamic Foundation Fluid */}
      <mesh ref={liquidMeshRef} geometry={liquidGeometry}>
        <meshPhysicalMaterial
          color={color}
          roughness={0.22}
          metalness={0.02}
          clearcoat={0.7}
          clearcoatRoughness={0.08}
          sheen={0.65}
          sheenColor="#FFF0DF"
          envMapIntensity={1.6}
        />
      </mesh>

      {/* Gold Collar */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.49, 0.49, 0.08, 48]} />
        <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.96}
          roughness={0.1}
          envMapIntensity={3.2}
        />
      </mesh>

      {/* Dropper Cap & Bulb */}
      <group position={[0, 2.85, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.39, 0.39, 0.4, 48]} />
          <meshPhysicalMaterial
            color="#D4AF37"
            metalness={0.96}
            roughness={0.12}
            envMapIntensity={3.2}
          />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#FAFAF8" roughness={0.35} metalness={0.05} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 24]} />
          <meshPhysicalMaterial color="#FFFFFF" transmission={0.92} transparent roughness={0.06} ior={1.5} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * 3D Compact Powder Component (Static Open Mirror Staging)
 */
function StaticCompact({ activeShadeIndex = 0 }) {
  const groupRef = useRef()

  const baseGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.1, 0),
      new THREE.Vector2(1.15, 0.05),
      new THREE.Vector2(1.15, 0.22),
      new THREE.Vector2(1.05, 0.25),
      new THREE.Vector2(0.95, 0.12),
      new THREE.Vector2(0, 0.12),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  const lidGeometry = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0.2),
      new THREE.Vector2(1.1, 0.2),
      new THREE.Vector2(1.15, 0.15),
      new THREE.Vector2(1.15, 0.02),
      new THREE.Vector2(1.05, 0),
      new THREE.Vector2(0, 0),
    ]
    return new THREE.LatheGeometry(points, 48)
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime
    groupRef.current.position.y = -0.45 + Math.sin(time * 0.7) * 0.03
    groupRef.current.rotation.y = -0.15 + Math.sin(time * 0.3) * 0.12
  })

  return (
    <group ref={groupRef} position={[0, -0.45, 0]} rotation={[0.48, -0.15, -0.04]} scale={1.2}>
      {/* Ivory Lacquer Lower Case */}
      <mesh geometry={baseGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#FAFAF8"
          roughness={0.14}
          metalness={0.08}
          clearcoat={0.9}
          clearcoatRoughness={0.05}
          envMapIntensity={2.5}
        />
      </mesh>

      {/* Gold Trim Rim */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <torusGeometry args={[1.15, 0.03, 16, 48]} />
        <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.96}
          roughness={0.08}
          envMapIntensity={3}
        />
      </mesh>

      {/* 4 Pressed Powder Pans */}
      <group position={[0, 0.14, 0]}>
        <mesh position={[-0.42, 0, -0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial color="#E8B0BA" roughness={0.55} metalness={0.12} sheen={0.8} sheenColor="#FFF0F5" />
        </mesh>
        <mesh position={[0.42, 0, -0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial color="#D8BA9E" roughness={0.6} metalness={0.1} sheen={0.6} sheenColor="#FFEEDD" />
        </mesh>
        <mesh position={[-0.42, 0, 0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial color="#C48E72" roughness={0.45} metalness={0.35} sheen={0.7} sheenColor="#FFD8C0" />
        </mesh>
        <mesh position={[0.42, 0, 0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial color="#FFF4E6" roughness={0.3} metalness={0.45} sheen={1} sheenColor="#FFFFFF" />
        </mesh>
      </group>

      {/* Mirrored Lid held open at 105 degrees */}
      <group position={[0, 0.24, -1.1]} rotation={[-Math.PI * 0.6, 0, 0]}>
        <group position={[0, 0, 1.1]}>
          <mesh geometry={lidGeometry} castShadow>
            <meshPhysicalMaterial
              color="#FAFAF8"
              roughness={0.12}
              metalness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.03}
              envMapIntensity={2.8}
            />
          </mesh>
          <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.28, 32]} />
            <meshPhysicalMaterial color="#D4AF37" metalness={0.96} roughness={0.08} envMapIntensity={3.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.95, 48]} />
            <meshPhysicalMaterial color="#FFFFFF" metalness={1} roughness={0.01} clearcoat={1} envMapIntensity={3.5} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * Self-contained 3D Product Showcase Viewer
 * Sits directly in the section's column — perfectly static, crisp, zero overlaps!
 */
export default function ProductViewer3D({
  type = 'lipstick',
  color = '#C52844',
  activeShadeIndex = 0,
  badgeText = 'Vista 3D Interactiva',
}) {
  return (
    <div className="product-viewer-3d glass">
      {/* Luxury Showcase Header Badge */}
      <div className="product-viewer-3d__badge">
        <span className="product-viewer-3d__badge-dot" />
        <span>{badgeText}</span>
      </div>

      {/* Embedded 3D Canvas */}
      <div className="product-viewer-3d__canvas-wrap">
        <Canvas
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          dpr={[1, 2]}
          camera={{ position: [0, 0.4, 4.2], fov: 40 }}
        >
          <PerspectiveCamera makeDefault position={[0, 0.4, 4.2]} fov={40} />
          <StudioLighting />

          <Suspense fallback={null}>
            <Environment preset="studio" environmentIntensity={0.85} />
          </Suspense>

          <Suspense fallback={null}>
            {type === 'lipstick' && <StaticLipstick color={color} />}
            {type === 'serum' && <StaticSerumBottle color={color} />}
            {type === 'compact' && <StaticCompact activeShadeIndex={activeShadeIndex} />}
          </Suspense>

          <ContactShadows
            position={[0, -1.6, 0]}
            opacity={0.3}
            scale={7.5}
            blur={2.2}
            far={3.5}
            color="#8A7568"
          />
        </Canvas>
      </div>

      {/* Pedestal Aura */}
      <div className="product-viewer-3d__aura" aria-hidden="true" />

      {/* Chic Caption */}
      <div className="product-viewer-3d__caption">
        <span>OASIS • Estudio 3D de Alta Fidelidad</span>
      </div>
    </div>
  )
}
