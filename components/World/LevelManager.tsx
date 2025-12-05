/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center, Text } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { 
    GameObject, 
    ObjectType, 
    LANE_WIDTH, 
    SPAWN_DISTANCE, 
    REMOVE_DISTANCE, 
    GameStatus, 
    HUNTER_COLORS,
    SCORE_PENALTY_BOAR,
    SCORE_PENALTY_MONSTER,
    SCORE_PENALTY_OBSTACLE
} from '../../types';
import { audio } from '../System/Audio';

// Geometry Constants
const OBSTACLE_GEO = new THREE.DodecahedronGeometry(0.8, 0); // Rock shape
const GEM_GEO = new THREE.OctahedronGeometry(0.3, 0); // Artifact

// Boar Geometry (Simple shapes)
const BOAR_BODY_GEO = new THREE.BoxGeometry(0.8, 0.6, 1.2);
const BOAR_HEAD_GEO = new THREE.ConeGeometry(0.4, 0.6, 4);

// Monster Geometry (Ghost/Alien)
const MONSTER_BODY_GEO = new THREE.CylinderGeometry(0.4, 0.1, 1.5, 8);
const MONSTER_HEAD_GEO = new THREE.SphereGeometry(0.35, 16, 16);

// Shop Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1); 
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2); 

const PARTICLE_COUNT = 800; // Increased count for richer effects
const BASE_LETTER_INTERVAL = 150; 

const getLetterInterval = (level: number) => {
    return BASE_LETTER_INTERVAL * Math.pow(1.5, Math.max(0, level - 1));
};

const MISSILE_SPEED = 28; // Boar Charge Speed

const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color, count } = e.detail;
            let spawned = 0;
            const burstAmount = count || 40; // Default or custom count

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; 
                    p.pos.set(position[0], position[1], position[2]);
                    
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    
                    p.vel.set(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    ).multiplyScalar(speed);

                    p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    p.rotVel.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(5);
                    
                    p.color.set(color);
                    
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta * 1.5;
                p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 5; 
                p.vel.multiplyScalar(0.98);

                p.rot.x += p.rotVel.x * safeDelta;
                p.rot.y += p.rotVel.y * safeDelta;
                
                dummy.position.copy(p.pos);
                const scale = Math.max(0, p.life * 0.25);
                dummy.scale.set(scale, scale, scale);
                
                dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
                dummy.updateMatrix();
                
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};


const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectGem, 
    collectLetter, 
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level,
    takeDamage
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  // Handle resets and transitions
  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0;
        nextLetterDistance.current = getLetterInterval(1);

    } else if (isLevelUp && level > 1) {
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);
        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -100], 
            active: true,
        });
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        setRenderTrigger(t => t + 1);
        
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    
    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) {
              playerObjRef.current = group.children[0];
          }
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    
    if (playerObjRef.current) {
        playerObjRef.current.getWorldPosition(playerPos);
    }

    // 1. Move & Update
    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        let moveAmount = dist;
        
        // Charging Boar (Missile logic)
        if (obj.type === ObjectType.MISSILE) {
            moveAmount += MISSILE_SPEED * safeDelta;
        }

        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;
        
        // Boar Aggro Logic (Level 2)
        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             // Charge logic
             if (obj.position[2] > -90) {
                 obj.hasFired = true;
                 
                 // Spawn Charging Boar (replaces idle boar)
                 newSpawns.push({
                     id: uuidv4(),
                     type: ObjectType.MISSILE,
                     position: [obj.position[0], 0.6, obj.position[2] + 2], 
                     active: true,
                     color: '#5d4037'
                 });
                 hasChanges = true;
             }
        }

        let keep = true;
        if (obj.active) {
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            if (obj.type === ObjectType.SHOP_PORTAL) {
                const dz = Math.abs(obj.position[2] - playerPos.z);
                if (dz < 2) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                const dx = Math.abs(obj.position[0] - playerPos.x);
                if (dx < 0.9) { 
                     const isDamageSource = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE || obj.type === ObjectType.MONSTER;
                     
                     if (isDamageSource) {
                         const playerBottom = playerPos.y;
                         const playerTop = playerPos.y + 1.8; 

                         let objBottom = obj.position[1] - 0.5;
                         let objTop = obj.position[1] + 0.5;

                         if (obj.type === ObjectType.OBSTACLE) {
                             objBottom = 0;
                             objTop = 1.0;
                         } else if (obj.type === ObjectType.MISSILE || obj.type === ObjectType.MONSTER) {
                             objBottom = 0;
                             objTop = 1.6;
                         }

                         const isHit = (playerBottom < objTop) && (playerTop > objBottom);

                         if (isHit) { 
                             window.dispatchEvent(new Event('player-hit'));
                             
                             // Calculate Penalty
                             let penalty = SCORE_PENALTY_OBSTACLE;
                             if (obj.type === ObjectType.MISSILE) penalty = SCORE_PENALTY_BOAR;
                             if (obj.type === ObjectType.MONSTER) penalty = SCORE_PENALTY_MONSTER;
                             
                             takeDamage(penalty);

                             obj.active = false; 
                             hasChanges = true;
                             
                             if (obj.type === ObjectType.MISSILE || obj.type === ObjectType.MONSTER) {
                                window.dispatchEvent(new CustomEvent('particle-burst', { 
                                    detail: { position: obj.position, color: '#ff0000', count: 50 } 
                                }));
                             }
                         }
                     } else {
                         // Collectible
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         if (dy < 2.5) { 
                            if (obj.type === ObjectType.GEM) {
                                collectGem(obj.points || 50);
                                audio.playGemCollect();
                            }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                                collectLetter(obj.targetIndex);
                                audio.playLetterCollect();
                            }
                            
                            // Emit particle burst with item's color and higher count
                            window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { 
                                    position: obj.position, 
                                    color: obj.color || '#ffffff',
                                    count: 60 
                                } 
                            }));

                            obj.active = false;
                            hasChanges = true;
                         }
                     }
                }
            }
        }

        if (obj.position[2] > REMOVE_DISTANCE) {
            keep = false;
            hasChanges = true;
        }

        if (keep) {
            keptObjects.push(obj);
        }
    }

    if (newSpawns.length > 0) {
        keptObjects.push(...newSpawns);
    }

    // 2. Spawning Logic
    let furthestZ = 0;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    
    if (staticObjects.length > 0) {
        furthestZ = Math.min(...staticObjects.map(o => o.position[2]));
    } else {
        furthestZ = -20;
    }

    if (furthestZ > -SPAWN_DISTANCE) {
         const minGap = 12 + (speed * 0.4); 
         const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);
         
         const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             const lane = getRandomLane(laneCount);
             const target = ['H','U','N','T','E','R'];
             
             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 const val = target[chosenIndex];
                 const color = HUNTER_COLORS[chosenIndex];

                 keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.LETTER,
                    position: [lane * LANE_WIDTH, 1.0, spawnZ], 
                    active: true,
                    color: color,
                    value: val,
                    targetIndex: chosenIndex
                 });
                 
                 nextLetterDistance.current += getLetterInterval(level);
                 hasChanges = true;
             } else {
                // Fallback reward
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#ffd700',
                    points: 100
                });
                hasChanges = true;
             }

         } else if (Math.random() > 0.1) { 
            
            // Adjust probability: Level 1 has fewer hazards (40%), Level 2+ has normal (80%)
            const threshold = level === 1 ? 0.6 : 0.2;
            const isObstacle = Math.random() > threshold;

            if (isObstacle) {
                // Level-specific Hazard Logic
                let spawnType = ObjectType.OBSTACLE;
                let isHazard = false;

                // Level 2: Boars take priority
                if (level === 2 && Math.random() < 0.4) {
                    spawnType = ObjectType.ALIEN; // Spawns idle boar that becomes missile
                    isHazard = true;
                }
                
                // Level 3: Monsters take priority
                if (level === 3 && Math.random() < 0.4) {
                    spawnType = ObjectType.MONSTER;
                    isHazard = true;
                }

                // If standard obstacle (Level 1, or fallthrough for L2/L3)
                if (!isHazard && Math.random() < 0.2 && level >= 1) {
                    spawnType = ObjectType.OBSTACLE;
                }

                if (isHazard) {
                    // Spawn Cluster of Enemies (1 to 3 based on level)
                    const availableLanes = [];
                    const maxLane = Math.floor(laneCount / 2);
                    for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                    availableLanes.sort(() => Math.random() - 0.5);

                    // Difficulty scaling: Level 2 = max 2, Level 3 = max 3
                    let maxEnemies = level; 
                    let count = Math.ceil(Math.random() * maxEnemies); 
                    count = Math.min(count, availableLanes.length);

                    for (let k = 0; k < count; k++) {
                        const lane = availableLanes[k];
                        const color = spawnType === ObjectType.MONSTER ? '#6a1b9a' : '#4e342e';
                        
                        keptObjects.push({
                            id: uuidv4(),
                            type: spawnType, 
                            position: [lane * LANE_WIDTH, 0.6, spawnZ],
                            active: true,
                            color: color,
                            hasFired: false
                        });
                    }
                } else {
                    // Standard Rock/Log Obstacles
                    const availableLanes = [];
                    const maxLane = Math.floor(laneCount / 2);
                    for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                    availableLanes.sort(() => Math.random() - 0.5);
                    
                    let countToSpawn = Math.random() > 0.6 ? 2 : 1;
                    countToSpawn = Math.min(countToSpawn, availableLanes.length);

                    for (let i = 0; i < countToSpawn; i++) {
                        const lane = availableLanes[i];
                        keptObjects.push({
                            id: uuidv4(),
                            type: ObjectType.OBSTACLE,
                            position: [lane * LANE_WIDTH, 0.4, spawnZ],
                            active: true,
                            color: '#546e7a'
                        });

                        // 30% chance for a weapon/artifact above obstacle
                        if (Math.random() < 0.3) {
                             const points = [10, 50, 100][Math.floor(Math.random() * 3)];
                             let gemColor = '#cd7f32'; // Bronze 10
                             if (points === 50) gemColor = '#c0c0c0'; // Silver 50
                             if (points === 100) gemColor = '#ffd700'; // Gold 100

                             keptObjects.push({
                                id: uuidv4(),
                                type: ObjectType.GEM,
                                position: [lane * LANE_WIDTH, 2.0, spawnZ],
                                active: true,
                                color: gemColor,
                                points: points
                            });
                        }
                    }
                }

            } else {
                // Standalone Weapon/Artifact
                const lane = getRandomLane(laneCount);
                const points = [10, 50, 100][Math.floor(Math.random() * 3)];
                let gemColor = '#cd7f32'; // Bronze 10
                if (points === 50) gemColor = '#c0c0c0'; // Silver 50
                if (points === 100) gemColor = '#ffd700'; // Gold 100

                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: gemColor,
                    points: points
                });
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const { laneCount } = useStore();
    
    // Determine Label Data
    const labelData = useMemo(() => {
        if (data.type === ObjectType.GEM) return { text: `+${data.points}`, color: '#00e676' }; // Green
        if (data.type === ObjectType.OBSTACLE) return { text: '-10', color: '#ff1744' }; // Red
        if (data.type === ObjectType.MISSILE || data.type === ObjectType.MONSTER) return { text: '-100', color: '#d50000' }; // Deep Red
        if (data.type === ObjectType.ALIEN) return { text: '-100', color: '#ff5252' }; // Boar idle
        return null;
    }, [data.type, data.points]);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.set(data.position[0], 0, data.position[2]);
        }

        if (visualRef.current) {
            const baseHeight = data.position[1];
            
            if (data.type === ObjectType.MISSILE || data.type === ObjectType.ALIEN) {
                 // Boar movement
                 visualRef.current.position.y = baseHeight + Math.abs(Math.sin(state.clock.elapsedTime * 15)) * 0.1;
            } else if (data.type === ObjectType.MONSTER) {
                 // Monster hover
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 2) * 0.3;
                 visualRef.current.rotation.y += delta * 0.5;
            } else if (data.type !== ObjectType.OBSTACLE && data.type !== ObjectType.SHOP_PORTAL) {
                // Collectible bob
                visualRef.current.rotation.y += delta * 2;
                visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
            } else {
                visualRef.current.position.y = baseHeight;
            }
        }
    });

    return (
        <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
            <group ref={visualRef} position={[0, data.position[1], 0]}>
                
                {/* --- FLOATING SCORE LABEL --- */}
                {labelData && (
                    <Text
                        position={[0, 2.5, 0]}
                        fontSize={0.8}
                        color={labelData.color}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.05}
                        outlineColor="#000000"
                        rotation={[0, 0, 0]} 
                    >
                        {labelData.text}
                    </Text>
                )}

                {/* --- SHOP PORTAL --- */}
                {data.type === ObjectType.SHOP_PORTAL && (
                    <group>
                         <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[laneCount * LANE_WIDTH + 2, 1, 1]}>
                             <meshStandardMaterial color="#5d4037" />
                         </mesh>
                         <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
                              <meshBasicMaterial color="#000000" />
                         </mesh>
                         <Center position={[0, 5, 0.6]}>
                             <Text3D font={FONT_URL} size={1.0} height={0.2}>
                                 TRADER
                                 <meshBasicMaterial color="#ffcc80" />
                             </Text3D>
                         </Center>
                    </group>
                )}

                {/* --- OBSTACLE (ROCK) --- */}
                {data.type === ObjectType.OBSTACLE && (
                    <group>
                        <mesh geometry={OBSTACLE_GEO} castShadow receiveShadow>
                             <meshStandardMaterial color="#78909c" roughness={0.9} />
                        </mesh>
                    </group>
                )}

                {/* --- ALIEN/BOAR --- */}
                {(data.type === ObjectType.ALIEN || data.type === ObjectType.MISSILE) && (
                    <group>
                        {/* Body */}
                        <mesh castShadow geometry={BOAR_BODY_GEO}>
                            <meshStandardMaterial color="#4e342e" />
                        </mesh>
                        {/* Head/Snout */}
                        <mesh position={[0, 0, 0.6]} rotation={[Math.PI/2, 0, 0]} geometry={BOAR_HEAD_GEO}>
                            <meshStandardMaterial color="#3e2723" />
                        </mesh>
                        {/* Tusks */}
                         <mesh position={[0.2, -0.1, 0.6]} rotation={[Math.PI/4, 0, 0]}>
                            <cylinderGeometry args={[0.02, 0.05, 0.4]} />
                             <meshStandardMaterial color="#eceff1" />
                        </mesh>
                         <mesh position={[-0.2, -0.1, 0.6]} rotation={[Math.PI/4, 0, 0]}>
                            <cylinderGeometry args={[0.02, 0.05, 0.4]} />
                             <meshStandardMaterial color="#eceff1" />
                        </mesh>
                    </group>
                )}

                {/* --- MONSTER (Ghost/Alien) --- */}
                {data.type === ObjectType.MONSTER && (
                    <group>
                        <mesh geometry={MONSTER_BODY_GEO} castShadow>
                            <meshStandardMaterial color="#4a148c" transparent opacity={0.9} />
                        </mesh>
                        <mesh position={[0, 0.8, 0]} geometry={MONSTER_HEAD_GEO}>
                            <meshStandardMaterial color="#7b1fa2" emissive="#4a148c" emissiveIntensity={0.5} />
                        </mesh>
                        {/* Eyes */}
                        <mesh position={[0.15, 0.8, 0.3]} geometry={new THREE.SphereGeometry(0.05)}>
                            <meshBasicMaterial color="#ff0000" />
                        </mesh>
                        <mesh position={[-0.15, 0.8, 0.3]} geometry={new THREE.SphereGeometry(0.05)}>
                             <meshBasicMaterial color="#ff0000" />
                        </mesh>
                    </group>
                )}

                {/* --- GEM (Weapon/Artifact) --- */}
                {data.type === ObjectType.GEM && (
                    <mesh castShadow geometry={GEM_GEO} scale={[1.5, 2.5, 1.5]}>
                        <meshStandardMaterial 
                            color={data.color}
                            emissive={data.color}
                            emissiveIntensity={0.5}
                            metalness={0.8}
                            roughness={0.2}
                        />
                    </mesh>
                )}

                {/* --- LETTER --- */}
                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <Center>
                             <Text3D 
                                font={FONT_URL} 
                                size={0.8} 
                                height={0.2} 
                             >
                                {data.value}
                                <meshStandardMaterial color={data.color} />
                             </Text3D>
                         </Center>
                    </group>
                )}
            </group>
        </group>
    );
});