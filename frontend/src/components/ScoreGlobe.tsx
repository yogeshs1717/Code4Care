import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, Ring } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  score: number;
  color: string;
}

function OrbitalParticle({ radius, speed, phase, color }: {
  radius: number; speed: number; phase: number; color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = Math.sin(t * 0.7) * radius * 0.4;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

function ScoreCore({ score, color }: { score: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.2) * 0.04;
    if (ref.current) ref.current.scale.setScalar(pulse);
    if (glowRef.current) glowRef.current.scale.setScalar(pulse * 1.6);
  });
  const coreSize = 0.25 + (score / 100) * 0.35;
  const hexColor = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[coreSize * 1.6, 32, 32]} />
        <meshBasicMaterial color={hexColor} transparent opacity={0.12} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[coreSize, 32, 32]} />
        <meshStandardMaterial color={hexColor} emissive={hexColor} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

function ScoreArc({ score, color }: { score: number; color: string }) {
  const ringRef = useRef<THREE.Group>(null);
  useFrame(() => { if (ringRef.current) ringRef.current.rotation.y += 0.005; });
  const filledAngle = (score / 100) * Math.PI * 2;
  const hexColor = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group ref={ringRef}>
      <Ring args={[1.1, 1.25, 64]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#d6d3d1" transparent opacity={0.2} side={THREE.DoubleSide} />
      </Ring>
      <Ring args={[1.1, 1.25, 64, 0, filledAngle]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={hexColor} transparent opacity={0.85} side={THREE.DoubleSide} />
      </Ring>
    </group>
  );
}

function ParticleRing({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      radius: 1.3 + Math.random() * 0.4,
      speed: 0.3 + Math.random() * 0.5,
      phase: (i / count) * Math.PI * 2,
    })), [count]);
  return (
    <group>{particles.map((p, i) => <OrbitalParticle key={i} {...p} color={color} />)}</group>
  );
}

function ScoreScene({ score, color }: { score: number; color: string }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#fff" />
      <pointLight position={[-3, -2, 4]} intensity={0.6} color={color} />
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.5}>
        <ScoreCore score={score} color={color} />
        <ScoreArc score={score} color={color} />
      </Float>
      <ParticleRing count={30} color={color} />
      <ParticleRing count={15} color={color} />
      <ContactShadows position={[0, -1.5, 0]} opacity={0.15} scale={4} blur={2.5} far={4} />
      <Environment preset="city" />
    </>
  );
}

function ScoreBadge({ score, color }: { score: number; color: string }) {
  const label = score >= 72 ? 'Good' : score >= 50 ? 'Moderate' : score >= 30 ? 'Concerning' : 'Poor';
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <div className="text-5xl font-bold tabular-nums" style={{ color, textShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {score}
        </div>
        <div className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color, opacity: 0.7 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export function ScoreGlobe({ score, color }: Props) {
  return (
    <div className="relative h-48 w-48">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ScoreScene score={score} color={color} />
      </Canvas>
      <ScoreBadge score={score} color={color} />
    </div>
  );
}

export function ResponsiveScoreGlobe({ score, color }: Props) {
  return (
    <div className="relative aspect-square w-full max-w-[200px] mx-auto">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ScoreScene score={score} color={color} />
      </Canvas>
      <ScoreBadge score={score} color={color} />
    </div>
  );
}
