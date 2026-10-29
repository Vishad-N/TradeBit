import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';

// The only module that imports three / R3F / drei. It is lazy-loaded (see LazyScene) and only on capable screens.

function Dust({ color, count }) {
  const ref = useRef();
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.2 + Math.random() * 3.2, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(p) * Math.cos(t);
      a[i * 3 + 1] = r * Math.cos(p) * 0.7;
      a[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    return a;
  }, [count]);
  useFrame((_, d) => { if (ref.current) { ref.current.rotation.y += d * 0.05; ref.current.rotation.x += d * 0.01; } });
  return (
    <Points ref={ref} positions={pos} stride={3} frustumCulled={false}>
      <PointMaterial transparent color={color} size={0.035} sizeAttenuation depthWrite={false} opacity={0.8} />
    </Points>
  );
}

function Orb({ color }) {
  const ref = useRef();
  useFrame((_, d) => { if (ref.current) { ref.current.rotation.y += d * 0.25; ref.current.rotation.x += d * 0.1; } });
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
      <group ref={ref}>
        <mesh>
          <icosahedronGeometry args={[1.25, 1]} />
          <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.9} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.8, 3]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} emissive={color} emissiveIntensity={0.18} />
        </mesh>
      </group>
    </Float>
  );
}

/** `orb` shows the centrepiece; without it, only ambient particles (used behind the lesson player). */
export default function Scene3D({ color = '#b8d83d', orb = true, count = 700 }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 50 }} gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }} aria-hidden="true">
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 5]} intensity={40} color={color} />
      {orb && <Orb color={color} />}
      <Dust color={color} count={count} />
    </Canvas>
  );
}
