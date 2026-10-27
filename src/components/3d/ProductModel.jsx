import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'

/**
 * Placeholder 3D product model.
 * Replace this with your actual GLTF/GLB model using useGLTF.
 *
 * Usage with real model:
 *   import { useGLTF } from '@react-three/drei'
 *   const { scene } = useGLTF('/assets/models/your-model.glb')
 *   return <primitive object={scene} />
 */
export default function ProductModel({ position = [0, 0, 0], scale = 1 }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    meshRef.current.rotation.y = time * 0.3
    meshRef.current.position.y = position[1] + Math.sin(time * 0.8) * 0.15
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusKnotGeometry args={[1, 0.35, 128, 32]} />
      <MeshDistortMaterial
        color="#e040a0"
        roughness={0.15}
        metalness={0.9}
        distort={0.2}
        speed={2}
        envMapIntensity={1.5}
      />
    </mesh>
  )
}
