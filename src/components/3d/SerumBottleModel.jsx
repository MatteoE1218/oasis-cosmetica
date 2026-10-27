import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import scrollState from '../../stores/scrollStore'

/**
 * Editorial 3D Glass Foundation / Serum Bottle (Sérum Éclat)
 * Features crystal glass body with physical transmission and inner fluid.
 *
 * Scrollytelling behavior:
 * - Glides into view seamlessly as the user scrolls into the Serum section.
 * - Pipette dropper gently lifts with scroll scrub.
 * - Liquid inside dynamically changes color with the selected foundation shade!
 */
export default function SerumBottleModel({ basePosition = [0, -0.5, 0], scale = 1.2 }) {
  const groupRef = useRef()
  const dropperRef = useRef()
  const liquidMeshRef = useRef()
  const currentLiquidColor = useRef(new THREE.Color('#f5e6d3'))

  // Outer glass profile
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

  // Inner liquid profile
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

    const lipP = scrollState.lipstick?.progress ?? 0
    const serumP = scrollState.serum?.progress ?? 0
    const compactP = scrollState.compact?.progress ?? 0

    let targetX = 4.2
    let targetY = basePosition[1]
    let targetZ = -2
    let targetScale = scale * 0.75
    let rotY = time * 0.15
    let rotX = 0.05
    let rotZ = 0
    let dropperLift = 0

    if (serumP <= 0 && compactP <= 0) {
      // Waiting in background right, gracefully blurred/scaled
      targetX = THREE.MathUtils.lerp(4.5, 3.2, Math.max(0, lipP - 0.5))
      targetY = -0.6
      targetZ = -1.8
      targetScale = scale * 0.65
      rotY = time * 0.12
    } else if (serumP > 0 && compactP <= 0.15) {
      // Act 3: Section 3 (Base Líquida / Sérum) — Star spotlight!
      targetX = 1.3
      // Follow the scroll down smoothly
      targetY = basePosition[1] - (serumP - 0.5) * 0.5
      targetZ = 0.5
      targetScale = scale * 1.12

      // Rotation responding to scroll scrub
      rotY = serumP * Math.PI * 1.3 + time * 0.12
      rotX = 0.06 - Math.sin(serumP * Math.PI) * 0.08
      rotZ = 0.04 - Math.sin(serumP * Math.PI) * 0.05

      // Dropper smoothly lifts during active inspection
      dropperLift = Math.sin(serumP * Math.PI) * 0.45
    } else {
      // Glides to secondary plane to let Compact powder take over
      const exitProgress = THREE.MathUtils.clamp((compactP - 0.1) * 2, 0, 1)
      targetX = THREE.MathUtils.lerp(1.3, -4.2, exitProgress)
      targetY = THREE.MathUtils.lerp(basePosition[1], 0.2, exitProgress)
      targetZ = THREE.MathUtils.lerp(0.5, -2.5, exitProgress)
      targetScale = THREE.MathUtils.lerp(scale * 1.12, scale * 0.65, exitProgress)
      rotY = time * 0.1
    }

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 5.5, delta)
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY + Math.sin(time * 0.75) * 0.04,
      5.5,
      delta
    )
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 5.5, delta)

    const curScale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 5.5, delta)
    groupRef.current.scale.set(curScale, curScale, curScale)

    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotY, 5.5, delta)
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, rotX, 5.5, delta)
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, rotZ, 5.5, delta)

    if (dropperRef.current) {
      dropperRef.current.position.y = THREE.MathUtils.damp(dropperRef.current.position.y, 2.65 + dropperLift, 6, delta)
    }

    // Dynamic foundation tone update
    if (liquidMeshRef.current && scrollState.serumColor) {
      const targetCol = new THREE.Color(scrollState.serumColor)
      currentLiquidColor.current.lerp(targetCol, delta * 6)
      liquidMeshRef.current.material.color.copy(currentLiquidColor.current)
    }
  })

  return (
    <group ref={groupRef} position={[4, -0.6, -2]} scale={scale * 0.7}>
      {/* Crystal Clear Cosmetic Glass */}
      <mesh geometry={bottleGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#FFFFFF"
          transmission={0.92}
          opacity={1}
          transparent
          roughness={0.05}
          ior={1.5}
          thickness={0.8}
          specularIntensity={1.8}
          envMapIntensity={2.8}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>

      {/* Luminous Inner Liquid Foundation */}
      <mesh ref={liquidMeshRef} geometry={liquidGeometry}>
        <meshPhysicalMaterial
          color="#f5e6d3"
          roughness={0.22}
          metalness={0.02}
          clearcoat={0.7}
          clearcoatRoughness={0.08}
          sheen={0.6}
          sheenColor="#FFF0DF"
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Champagne Gold Shoulder Collar */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.49, 0.49, 0.08, 48]} />
        <meshPhysicalMaterial
          color="#D4AF37"
          metalness={0.95}
          roughness={0.12}
          envMapIntensity={3}
        />
      </mesh>

      {/* Dropper Group */}
      <group ref={dropperRef} position={[0, 2.65, 0]}>
        {/* Gold Dropper Cap */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.39, 0.39, 0.4, 48]} />
          <meshPhysicalMaterial
            color="#D4AF37"
            metalness={0.95}
            roughness={0.14}
            envMapIntensity={3}
          />
        </mesh>

        {/* Rubber Bulb (Chic Soft Porcelain) */}
        <mesh position={[0, 0.58, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color="#FAFAF8"
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>

        {/* Pipette Stem */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 24]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transmission={0.92}
            transparent
            roughness={0.08}
            ior={1.5}
          />
        </mesh>
      </group>
    </group>
  )
}

