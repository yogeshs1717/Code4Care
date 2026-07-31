import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles({ count = 100 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      spd[i] = 0.2 + Math.random() * 0.6;
    }
    return [pos, spd];
  }, [count]);

  const data = useRef({ positions, speeds }).current;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.015;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.008) * 0.08;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={data.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#f59e0b"
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2;
        const radius = 2.8;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle * 1.3) * 1.2, Math.sin(angle) * radius * 0.3]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

export function ParticleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Particles count={120} />
        <FloatingOrbs />
      </Canvas>
    </div>
  );
}
