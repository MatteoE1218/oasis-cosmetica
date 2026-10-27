import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import scrollState from '../../stores/scrollStore'

/**
 * Editorial 3D Lipstick Model (Rouge Éternel)
 * Built with procedural LatheGeometry and physical materials.
 *
 * Scrollytelling behavior:
 * - Fluidly moves with scroll without abrupt jumps or shrinkage.
 * - Cap smoothly slides off and floats up when entering the Lipstick section.
 * - Live color reactivity: responds instantly when user selects a shade in the UI!
 */
export default function LipstickModel({ basePosition = [0, -0.5, 0], scale = 1.3 }) {
  const groupRef = useRef()
  const capGroupRef = useRef()
  const bulletMeshRef = useRef()
  const currentColor = useRef(new THREE.Color('#C52844'))

  // Bullet tip geometry
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

  // Tube body geometry
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

  // Cap geometry
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

    // Section triggers
    const heroP = scrollState.hero?.progress ?? 0
    const lipP = scrollState.lipstick?.progress ?? 0
    const serumP = scrollState.serum?.progress ?? 0

    // Coordinates calculation
    let targetX = 0
    let targetY = basePosition[1]
    let targetZ = 0
    let targetScale = scale
    let capOpenAmount = 0
    let rotY = time * 0.2
    let rotX = 0.05
    let rotZ = 0

    if (lipP <= 0 && serumP <= 0) {
      // Act 1: In Hero
      // Subtle float, centered or slight right
      targetX = THREE.MathUtils.lerp(0.8, 1.1, heroP)
      targetY = basePosition[1] - heroP * 0.4
      targetZ = 0.2
      targetScale = scale
      capOpenAmount = heroP * 0.3
      rotY = time * 0.25 + heroP * 0.8
      rotZ = -0.06
    } else if (lipP > 0 && serumP <= 0.15) {
      // Act 2: In Lipstick Section (#lipstick) — Protagonist spotlight!
      // lipP goes from 0 (entering) to 0.5 (centered) to 1.0 (leaving)
      targetX = 1.3
      // Follow the scroll down smoothly
      targetY = basePosition[1] - (lipP - 0.5) * 0.5
      targetZ = 0.4
      targetScale = scale * 1.12

      // Cap opens progressively with scroll and stays gracefully elevated
      capOpenAmount = THREE.MathUtils.clamp(lipP * 1.6, 0.35, 1)

      // Dynamic rotation as user scrolls through
      rotY = lipP * Math.PI * 1.2 + time * 0.12
      rotX = 0.08 + Math.sin(lipP * Math.PI) * 0.06
      rotZ = -0.1 + Math.sin(lipP * Math.PI) * 0.04
    } else {
      // Act 3: Glides away smoothly to secondary plane without vanishing into nothing
      const exitProgress = THREE.MathUtils.clamp((serumP - 0.1) * 2, 0, 1)
      targetX = THREE.MathUtils.lerp(1.3, -4.2, exitProgress)
      targetY = THREE.MathUtils.lerp(basePosition[1], 0.2, exitProgress)
      targetZ = THREE.MathUtils.lerp(0.4, -2.5, exitProgress)
      targetScale = THREE.MathUtils.lerp(scale * 1.12, scale * 0.65, exitProgress)
      capOpenAmount = 1
      rotY = time * 0.15
    }

    // Apply high-fidelity smooth damping
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 5.5, delta)
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY + Math.sin(time * 0.8) * 0.04,
      5.5,
      delta
    )
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 5.5, delta)

    const curScale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 5.5, delta)
    groupRef.current.scale.set(curScale, curScale, curScale)

    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotY, 5.5, delta)
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, rotX, 5.5, delta)
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, rotZ, 5.5, delta)

    // Cap detachment animation (floats smoothly up & tilts)
    if (capGroupRef.current) {
      const lift = capOpenAmount * 2.6
      capGroupRef.current.position.y = THREE.MathUtils.damp(capGroupRef.current.position.y, lift, 6, delta)
      capGroupRef.current.rotation.z = capOpenAmount * 0.15
      capGroupRef.current.rotation.x = capOpenAmount * 0.06
    }

    // Live color transition when user changes tone in UI!
    if (bulletMeshRef.current && scrollState.lipstickColor) {
      const targetCol = new THREE.Color(scrollState.lipstickColor)
      currentColor.current.lerp(targetCol, delta * 6)
      bulletMeshRef.current.material.color.copy(currentColor.current)
    }
  })

  return (
    <group ref={groupRef} position={basePosition} scale={scale}>
      {/* Luxury Gold Tube Body */}
      <mesh geometry={tubeGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.92}
          roughness={0.16}
          envMapIntensity={2.5}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
        />
      </mesh>

      {/* Gold Ring Accent */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <torusGeometry args={[0.40, 0.025, 16, 48]} />
        <meshPhysicalMaterial
          color="#F5D77F"
          metalness={0.98}
          roughness={0.08}
          envMapIntensity={3}
        />
      </mesh>

      {/* Haute Couture Satin Ruby Bullet with live shade morph */}
      <mesh
        ref={bulletMeshRef}
        geometry={bulletGeometry}
        position={[0, 1.26, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#C52844"
          metalness={0.04}
          roughness={0.25}
          clearcoat={0.9}
          clearcoatRoughness={0.08}
          sheen={0.8}
          sheenColor="#FFA0B2"
          sheenRoughness={0.2}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* Detachable Cap Group */}
      <group ref={capGroupRef}>
        <mesh
          geometry={capGeometry}
          position={[0, 1.3, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.92}
          roughness={0.15}
          envMapIntensity={2.5}
          clearcoat={0.65}
          clearcoatRoughness={0.12}
        />
        </mesh>
        {/* Cap Crown Embellishment */}
        <mesh position={[0, 2.54, 0]} castShadow>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshPhysicalMaterial
            color="#F5D77F"
            metalness={0.98}
            roughness={0.06}
            envMapIntensity={3}
          />
        </mesh>
      </group>
    </group>
  )
}

