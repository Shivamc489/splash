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
  const animationFrameRef = useRef<number | null>(null);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const moveSpeed = 0.15;
  const rotateSpeed = 0.03;
  
  useEffect(() => {
    if (isLoading || !containerRef.current) return;
    
    const { scene, camera, renderer } = initThreeJS();
    
    setupGame(scene, camera);
    
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      updateGame();
      renderer.render(scene, camera);
    };
    
    animate();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleShoot);
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleShoot);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoading]);
  
  const handleLoadingComplete = () => {
    console.log("Loading complete!");
    setIsLoading(false);
  };
  
  const initThreeJS = () => {
    if (!containerRef.current) {
      throw new Error("Container ref is not available");
    }
    
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer(containerRef.current);
    
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
  };
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!gameStarted) return;
    keysPressed.current[event.key.toLowerCase()] = true;
  };
  
  const handleKeyUp = (event: KeyboardEvent) => {
    if (!gameStarted) return;
    keysPressed.current[event.key.toLowerCase()] = false;
  };
  
  const updateGame = () => {
    if (npcsRef.current) {
      npcsRef.current.forEach(npc => {
        npc.update();
      });
    }
    
    if (cameraRef.current && gameStarted) {
      const camera = cameraRef.current;
      
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();
      
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        camera.position.add(forward.multiplyScalar(moveSpeed));
      }
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        camera.position.add(forward.multiplyScalar(-moveSpeed));
      }
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        camera.position.add(right.multiplyScalar(-moveSpeed));
      }
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        camera.position.add(right.multiplyScalar(moveSpeed));
      }
      
      if (keysPressed.current['q']) {
        camera.rotation.y += rotateSpeed;
      }
      if (keysPressed.current['e']) {
        camera.rotation.y -= rotateSpeed;
      }
      
      camera.position.x = Math.max(-15, Math.min(15, camera.position.x));
      camera.position.z = Math.max(-15, Math.min(15, camera.position.z));
    }
    
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
    
    console.log("Shooting!");
    
    setWaterLevel(prev => Math.max(0, prev - 5));
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    if (cameraRef.current && sceneRef.current) {
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      console.log("Intersections found:", intersects.length);
      
      if (intersects.length > 0) {
        const hitNPC = npcsRef.current.find(npc => 
          npc.model && intersects.some(intersect => {
            let parent = intersect.object;
            while (parent) {
              if (parent === npc.model) return true;
              parent = parent.parent;
            }
            return false;
          })
        );
        
        if (hitNPC) {
          console.log("Hit an NPC!");
          hitNPC.getColored();
          setScore(prev => prev + 10);
        }
        
        createSplashEffect(intersects[0].point);
      }
    }
  };
  
  const createSplashEffect = (position: THREE.Vector3) => {
    if (!sceneRef.current) return;
    
    console.log("Creating splash at", position);
    
    const particles = new THREE.Group();
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
    
    for (let i = 0; i < 15; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)]
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      (particle as any).velocity = new THREE.Vector3(
        Math.random() * 0.1 - 0.05,
        Math.random() * 0.1,
        Math.random() * 0.1 - 0.05
      );
      
      particles.add(particle);
    }
    
    sceneRef.current.add(particles);
    
    const animateParticles = () => {
      particles.children.forEach(particle => {
        particle.position.add((particle as any).velocity);
        (particle as any).velocity.y -= 0.001;
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
        <LoadingScreen onLoadingComplete={handleLoadingComplete} />
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
          {gameStarted && (
            <div className="absolute bottom-20 left-4 p-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
              <p className="text-sm font-medium text-white">
                Controls: WASD to move, Q/E to rotate, Click to shoot
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HoliGame;
