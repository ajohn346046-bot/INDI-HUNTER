/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

// Fireflies (Spirits) instead of Stars
const Fireflies: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 100; 
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x = (Math.random() - 0.5) * 60;
      let y = Math.random() * 20 + 2; 
      let z = -100 + Math.random() * 150;

      pos[i * 3] = x;     
      pos[i * 3 + 1] = y; 
      pos[i * 3 + 2] = z; 
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const activeSpeed = speed > 0 ? speed : 2;

    for (let i = 0; i < count; i++) {
        let z = positions[i * 3 + 2];
        let y = positions[i * 3 + 1];
        
        z += activeSpeed * delta * 0.5; // Move slower than player for depth
        
        // Bobbing
        y += Math.sin(state.clock.elapsedTime + i) * 0.02;

        if (z > 20) {
            z = -120 - Math.random() * 20; 
            positions[i * 3] = (Math.random() - 0.5) * 60;
        }
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        color="#aaffaa"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const LaneGuides: React.FC = () => {
    const { laneCount } = useStore();
    
    // Forest Path Logic
    return (
        <group position={[0, 0, 0]}>
            {/* Main Dirt Path */}
            <mesh position={[0, -0.05, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[laneCount * LANE_WIDTH + 4, 300]} />
                <meshStandardMaterial color="#3e2723" roughness={1} />
            </mesh>
            
            {/* Grass Sides */}
            <mesh position={[-(laneCount * LANE_WIDTH / 2) - 10, -0.06, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                 <planeGeometry args={[20, 300]} />
                 <meshStandardMaterial color="#1b5e20" roughness={1} />
            </mesh>
            <mesh position={[(laneCount * LANE_WIDTH / 2) + 10, -0.06, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                 <planeGeometry args={[20, 300]} />
                 <meshStandardMaterial color="#1b5e20" roughness={1} />
            </mesh>
        </group>
    );
};

const Moon: React.FC = () => {
    return (
        <group position={[0, 40, -150]}>
            <mesh>
                <circleGeometry args={[15, 32]} />
                <meshBasicMaterial color="#ffeb3b" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// Simple Low Poly Trees with swaying animation
const Trees: React.FC = () => {
    const speed = useStore(state => state.speed);
    const count = 40;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const trunkRef = useRef<THREE.InstancedMesh>(null);

    // Static placement along the sides
    const treeData = useMemo(() => {
        return new Array(count).fill(0).map(() => {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (10 + Math.random() * 30);
            const z = -200 + Math.random() * 200;
            const scale = 1 + Math.random() * 1.5;
            return { x, z, scale, speedOffset: Math.random() * 0.2 + 0.9 };
        });
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current || !trunkRef.current) return;
        const activeSpeed = speed > 0 ? speed : 0;
        const time = state.clock.elapsedTime;

        treeData.forEach((data, i) => {
            data.z += activeSpeed * delta;
            if (data.z > 20) data.z = -200; // Loop back

            // Leaves (sway)
            dummy.position.set(data.x, 3 * data.scale, data.z);
            dummy.scale.set(data.scale, data.scale, data.scale);
            
            // Sway rotation
            const sway = Math.sin(time * 1.5 + data.x) * 0.1;
            dummy.rotation.set(sway * 0.5, 0, sway);
            
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);

            // Trunk (static)
            dummy.rotation.set(0, 0, 0);
            dummy.position.set(data.x, 1 * data.scale, data.z);
            dummy.scale.set(0.5 * data.scale, 2 * data.scale, 0.5 * data.scale);
            dummy.updateMatrix();
            trunkRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        trunkRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
                <coneGeometry args={[2, 6, 8]} />
                <meshStandardMaterial color="#2e7d32" flatShading />
            </instancedMesh>
            <instancedMesh ref={trunkRef} args={[undefined, undefined, count]}>
                <cylinderGeometry args={[0.5, 0.6, 2]} />
                <meshStandardMaterial color="#3e2723" flatShading />
            </instancedMesh>
        </group>
    );
};

// Swaying Bushes
const Bushes: React.FC = () => {
    const speed = useStore(state => state.speed);
    const count = 30;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const bushData = useMemo(() => {
         return new Array(count).fill(0).map(() => {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (8 + Math.random() * 20);
            const z = -200 + Math.random() * 200;
            const scale = 0.8 + Math.random() * 0.8;
            return { x, z, scale, offset: Math.random() * Math.PI };
        });
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 0;
        const time = state.clock.elapsedTime;

        bushData.forEach((data, i) => {
            data.z += activeSpeed * delta;
            if (data.z > 20) data.z = -200;

            dummy.position.set(data.x, 0.5 * data.scale, data.z);
            dummy.scale.set(data.scale, data.scale, data.scale);
            
            // Sway
            dummy.rotation.z = Math.sin(time * 3 + data.offset) * 0.1;
            dummy.rotation.x = Math.cos(time * 2 + data.offset) * 0.1;

            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#388e3c" flatShading />
        </instancedMesh>
    );
};

// Low-lying Fog Patches
const FogPatches: React.FC = () => {
    const speed = useStore(state => state.speed);
    const count = 15;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    const fogData = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 80,
            y: Math.random() * 2,
            z: -200 + Math.random() * 200,
            scaleX: 10 + Math.random() * 10,
            scaleY: 1 + Math.random() * 2,
            scaleZ: 10 + Math.random() * 10,
            speedMod: 0.8 + Math.random() * 0.4
        }));
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 2;

        fogData.forEach((data, i) => {
             data.z += activeSpeed * delta * data.speedMod;
             if (data.z > 50) data.z = -250;
             
             dummy.position.set(data.x, data.y, data.z);
             dummy.scale.set(data.scaleX, data.scaleY, data.scaleZ);
             dummy.updateMatrix();
             meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
             <sphereGeometry args={[1, 8, 8]} />
             <meshBasicMaterial color="#aaddaa" transparent opacity={0.15} depthWrite={false} />
        </instancedMesh>
    );
};

export const Environment: React.FC = () => {
  const { level } = useStore();
  
  // Level 1: Clearer vision. Level 2+: Foggy/Hard to see.
  const isFoggy = level >= 2;

  return (
    <>
      <color attach="background" args={['#001100']} />
      
      {/* Dynamic fog based on level */}
      <fog attach="fog" args={['#001100', isFoggy ? 30 : 50, isFoggy ? 120 : 200]} />
      
      <ambientLight intensity={0.4} color="#aaddaa" />
      
      {/* Brighter light in Level 1 to help visibility */}
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={isFoggy ? 1.0 : 1.5} 
        color="#ffaa00" 
        castShadow 
      />
      
      <Fireflies />
      <LaneGuides />
      <Trees />
      <Bushes />
      
      {/* Fog patches only appear in Level 2+ to obscure obstacles */}
      {isFoggy && <FogPatches />}
      
      <Moon />
    </>
  );
};