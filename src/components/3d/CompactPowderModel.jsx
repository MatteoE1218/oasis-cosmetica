import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import scrollState from '../../stores/scrollStore'

/**
 * Editorial 3D Compact Powder Model (Poudre Éclat)
 * High-end white porcelain lacquer case with champagne gold trim,
 * interior mirror, and 4 pressed powder shades (Velvet Nude, Rose Silk, Warm Bronze, Pearl).
 *
 * Scrollytelling behavior:
 * - Emerges fluidly without sudden scale pop-in or disappearance.
 * - Mirrored lid smoothly opens up to 110 degrees as user enters the Compact section.
 * - Reacts to user shade selection with subtle highlighting.
 */
export default function CompactPowderModel({ basePosition = [0, -0.6, 0], scale = 1.15 }) {
  const groupRef = useRef()
  const lidHingeRef = useRef()

  // Base profile
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

  // Lid profile
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

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    const serumP = scrollState.serum?.progress ?? 0
    const compactP = scrollState.compact?.progress ?? 0
    const catalogP = scrollState.catalog?.progress ?? 0

    let targetX = 4.2
    let targetY = -1.2
    let targetZ = -2
    let targetScale = scale * 0.65
    let targetLidAngle = 0
    let rotX = 0.55
    let rotY = -0.2
    let rotZ = -0.08

    if (compactP <= 0 && catalogP <= 0) {
      // Waiting in background, smooth entrance
      targetX = THREE.MathUtils.lerp(4.5, 3.2, Math.max(0, serumP - 0.4))
      targetY = -1.2
      targetZ = -2
      targetScale = scale * 0.65
      targetLidAngle = 0
    } else if (compactP > 0 && catalogP <= 0.2) {
      // Act 4: Section 4 (Polvos Compactos) — Star spotlight!
      targetX = 1.3
      // Follow the scroll down smoothly
      targetY = basePosition[1] - (compactP - 0.5) * 0.45
      targetZ = 0.6
      targetScale = scale * 1.1

      // Lid smoothly opens up to 110 degrees (Math.PI * 0.62)
      targetLidAngle = THREE.MathUtils.clamp(compactP * 1.5, 0, 1) * Math.PI * 0.62

      rotX = 0.55 + Math.sin(time * 0.5) * 0.03
      rotY = -0.2 + compactP * 0.35 + time * 0.06
    } else {
      // Section 5+ / Catalog: Soft perspective stance in the background
      const exitP = THREE.MathUtils.clamp((catalogP - 0.1) * 2, 0, 1)
      targetX = THREE.MathUtils.lerp(1.3, -3.8, exitP)
      targetY = THREE.MathUtils.lerp(basePosition[1], 0.4, exitP)
      targetZ = THREE.MathUtils.lerp(0.6, -2.8, exitP)
      targetScale = THREE.MathUtils.lerp(scale * 1.1, scale * 0.6, exitP)
      targetLidAngle = Math.PI * 0.6
      rotY = time * 0.08
    }

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

    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, rotX, 5.5, delta)
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotY, 5.5, delta)
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, rotZ, 5.5, delta)

    if (lidHingeRef.current) {
      lidHingeRef.current.rotation.x = -THREE.MathUtils.damp(
        -lidHingeRef.current.rotation.x,
        targetLidAngle,
        6,
        delta
      )
    }
  })

  return (
    <group ref={groupRef} position={[4, -1.2, -2]} scale={scale * 0.65}>
      {/* Lower Case Base — Haute Couture Ivory Lacquer */}
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

      {/* Champagne Gold Edge Rim */}
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
        {/* Pan 1: Rose Silk */}
        <mesh position={[-0.42, 0, -0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial
            color="#E8B0BA"
            roughness={0.55}
            metalness={0.12}
            sheen={0.8}
            sheenColor="#FFF0F5"
          />
        </mesh>

        {/* Pan 2: Warm Nude Cashmere */}
        <mesh position={[0.42, 0, -0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial
            color="#D8BA9E"
            roughness={0.6}
            metalness={0.1}
            sheen={0.6}
            sheenColor="#FFEEDD"
          />
        </mesh>

        {/* Pan 3: Terracotta Bronze */}
        <mesh position={[-0.42, 0, 0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial
            color="#C48E72"
            roughness={0.45}
            metalness={0.35}
            sheen={0.7}
            sheenColor="#FFD8C0"
          />
        </mesh>

        {/* Pan 4: Starlight Pearl */}
        <mesh position={[0.42, 0, 0.42]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshPhysicalMaterial
            color="#FFF4E6"
            roughness={0.3}
            metalness={0.45}
            sheen={1}
            sheenColor="#FFFFFF"
          />
        </mesh>
      </group>

      {/* Hinged Mirrored Lid */}
      <group ref={lidHingeRef} position={[0, 0.24, -1.1]}>
        <group position={[0, 0, 1.1]}>
          {/* Lid outer shell — White Lacquer */}
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

          {/* Champagne gold brand monogram plate */}
          <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.28, 32]} />
            <meshPhysicalMaterial
              color="#D4AF37"
              metalness={0.96}
              roughness={0.08}
              envMapIntensity={3.2}
            />
          </mesh>

          {/* Interior Reflection Mirror */}
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.95, 48]} />
            <meshPhysicalMaterial
              color="#FFFFFF"
              metalness={1}
              roughness={0.01}
              clearcoat={1}
              envMapIntensity={3.5}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}

