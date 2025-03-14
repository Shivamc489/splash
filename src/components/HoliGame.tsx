
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createScene, createCamera, createRenderer } from '../utils/threeUtils';
import { setupLighting, createNPCs, createWaterGun, createWaterBalloons } from '../utils/gameUtils';
import { NPC } from '../models/gameModels';
import GameUI from './GameUI';
import LoadingScreen from './LoadingScreen';

const HoliGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [waterLevel, setWaterLevel] = useState(100);
  const [gameStarted, setGameStarted] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const npcsRef = useRef<NPC[]>([]);
  const waterGunRef = useRef<THREE.Group | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize Three.js components
    const { scene, camera, renderer } = initThreeJS();
    
    // Setup the game elements
    setupGame(scene, camera);
    
    // Start animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      updateGame();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Simulate loading time
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);
  
  const initThreeJS = () => {
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer(containerRef.current!);
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    return { scene, camera, renderer };
  };
  
  const setupGame = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    setupLighting(scene);
    npcsRef.current = createNPCs(scene, 5);
    waterGunRef.current = createWaterGun(scene, camera);
    createWaterBalloons(scene, 10);
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('click', handleShoot);
  };
  
  const updateGame = () => {
    // Update NPCs movements and behaviors
    if (npcsRef.current) {
      npcsRef.current.forEach(npc => {
        npc.update();
      });
    }
    
    // Update water gun position with camera
    if (waterGunRef.current && cameraRef.current) {
      waterGunRef.current.position.copy(cameraRef.current.position);
      waterGunRef.current.rotation.copy(cameraRef.current.rotation);
      waterGunRef.current.translateZ(-1);
      waterGunRef.current.translateY(-0.5);
      waterGunRef.current.translateX(0.5);
    }
  };
  
  const handleResize = () => {
    if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
    
    cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
  };
  
  const handleShoot = (event: MouseEvent) => {
    if (!gameStarted || waterLevel <= 0) return;
    
    // Calculate water consumption
    setWaterLevel(prev => Math.max(0, prev - 5));
    
    // Check if hit any NPC
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    if (cameraRef.current && sceneRef.current) {
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        // Determine if the hit object is an NPC
        const hitNPC = npcsRef.current.find(npc => 
          npc.model && intersects.some(intersect => intersect.object.parent === npc.model)
        );
        
        if (hitNPC) {
          hitNPC.getColored();
          setScore(prev => prev + 10);
        }
        
        // Create splash effect at the intersection point
        createSplashEffect(intersects[0].point);
      }
    }
  };
  
  const createSplashEffect = (position: THREE.Vector3) => {
    if (!sceneRef.current) return;
    
    // Create colorful particles at the hit position
    const particles = new THREE.Group();
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
    
    for (let i = 0; i < 15; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)]
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      // Add random velocity
      (particle as any).velocity = new THREE.Vector3(
        Math.random() * 0.1 - 0.05,
        Math.random() * 0.1,
        Math.random() * 0.1 - 0.05
      );
      
      particles.add(particle);
    }
    
    sceneRef.current.add(particles);
    
    // Animate and remove after a short time
    const animateParticles = () => {
      particles.children.forEach(particle => {
        particle.position.add((particle as any).velocity);
        (particle as any).velocity.y -= 0.001; // gravity
      });
    };
    
    const particleAnimation = setInterval(animateParticles, 16);
    
    setTimeout(() => {
      clearInterval(particleAnimation);
      sceneRef.current?.remove(particles);
    }, 2000);
  };
  
  const startGame = () => {
    setGameStarted(true);
  };
  
  const refillWater = () => {
    setWaterLevel(100);
  };
  
  return (
    <div className="relative w-full h-screen">
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          <div ref={containerRef} className="w-full h-full" />
          <GameUI 
            score={score} 
            waterLevel={waterLevel} 
            gameStarted={gameStarted}
            onStart={startGame}
            onRefill={refillWater}
          />
        </>
      )}
    </div>
  );
};

export default HoliGame;
