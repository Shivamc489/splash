import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createScene, createCamera, createRenderer } from '../utils/threeUtils';
import { setupLighting, createNPCs, createWaterGun, createWaterBalloons, createWaterTubs } from '../utils/gameUtils';
import { NPC } from '../models/gameModels';
import GameUI from './GameUI';
import LoadingScreen from './LoadingScreen';

const HoliGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [waterLevel, setWaterLevel] = useState(100);
  const [gameStarted, setGameStarted] = useState(false);
  const [nearWaterTank, setNearWaterTank] = useState(false);
  const [refilling, setRefilling] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const npcsRef = useRef<NPC[]>([]);
  const waterGunRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waterTubsRef = useRef<THREE.Group[]>([]);
  const refillIntervalRef = useRef<number | null>(null);
  const refillIndicatorsRef = useRef<THREE.Group[]>([]);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const moveSpeed = 0.15;
  const rotateSpeed = 0.03;
  
  // Add mouse control references
  const isMouseLocked = useRef<boolean>(false);
  const mouseMovement = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const mouseSensitivity = 0.002;
  
  // Track pointer lock state
  const handlePointerLockChange = () => {
    isMouseLocked.current = document.pointerLockElement === containerRef.current;
  };
  
  // Track mouse movement for camera rotation
  const handleMouseMove = (event: MouseEvent) => {
    if (isMouseLocked.current && cameraRef.current && gameStarted) {
      // Get mouse movement
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      // Update camera rotation based on mouse movement - fixing reversed controls
      cameraRef.current.rotation.y += movementX * mouseSensitivity; // Changed from -= to += to fix reversed horizontal aim
      
      // Limit vertical rotation to prevent flipping
      const verticalRotation = cameraRef.current.rotation.x + (-movementY * mouseSensitivity); // Negated movementY for proper vertical aim
      cameraRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, verticalRotation));
    }
  };
  
  // Handle mouse click to lock pointer
  const handleContainerClick = () => {
    if (gameStarted && containerRef.current && !isMouseLocked.current) {
      containerRef.current.requestPointerLock();
    }
  };
  
  useEffect(() => {
    if (isLoading || !containerRef.current) return;
    
    console.log("Initializing Three.js");
    
    try {
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
      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('pointerlockchange', handlePointerLockChange);
      
      return () => {
        console.log("Cleaning up Three.js resources");
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (refillIntervalRef.current) {
          clearInterval(refillIntervalRef.current);
        }
        
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('click', handleShoot);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
      };
    } catch (error) {
      console.error("Error initializing Three.js:", error);
    }
  }, [isLoading, gameStarted]);
  
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
    npcsRef.current = createNPCs(scene, 10);
    waterGunRef.current = createWaterGun(scene, camera);
    createWaterBalloons(scene, 10);
    
    // Create water tubs and store their references
    waterTubsRef.current = createWaterTubs(scene, 5);
    
    // Create refill indicators above each water tub
    createRefillIndicators(scene);
  };
  
  // Create refill indicators above water tubs
  const createRefillIndicators = (scene: THREE.Scene) => {
    refillIndicatorsRef.current = waterTubsRef.current.map(tub => {
      const indicator = new THREE.Group();
      
      // Create floating text mesh for "Press R to Refill"
      const textGeometry = new THREE.PlaneGeometry(1.5, 0.5);
      
      // Create canvas for the text
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d')!;
      
      // Draw background
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw border
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      
      // Draw text
      context.fillStyle = '#ffffff';
      context.font = 'bold 24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('PRESS R TO REFILL', canvas.width / 2, canvas.height / 2);
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      
      const textMesh = new THREE.Mesh(textGeometry, material);
      textMesh.position.y = 2.2; // Position above the tub
      textMesh.rotation.x = -Math.PI / 8; // Slight tilt for better visibility
      
      // Add pulsing effect
      (textMesh as any).pulse = 0;
      
      indicator.add(textMesh);
      
      // Position the indicator at the tub's position
      indicator.position.copy(tub.position);
      indicator.visible = false;
      
      scene.add(indicator);
      return indicator;
    });
  };
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!gameStarted) return;
    
    console.log(`Key pressed: ${event.key}`);
    
    keysPressed.current[event.key.toLowerCase()] = true;
    
    // Handle refill key (R)
    if (event.key.toLowerCase() === 'r' && nearWaterTank && !refilling && waterLevel < 100) {
      console.log("R key pressed near water tank! Starting refill...");
      startRefilling();
    }
    
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'r'].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  };
  
  const handleKeyUp = (event: KeyboardEvent) => {
    if (!gameStarted) return;
    keysPressed.current[event.key.toLowerCase()] = false;
    
    // Stop refilling when R key is released
    if (event.key.toLowerCase() === 'r' && refilling) {
      stopRefilling();
    }
  };
  
  const startRefilling = () => {
    console.log("Starting to refill water!");
    setRefilling(true);
    
    // Refill water gradually
    if (refillIntervalRef.current) {
      console.log("Clearing existing refill interval");
      clearInterval(refillIntervalRef.current);
    }
    
    // Use a direct interval rather than setState callback for more reliable updates
    let currentWaterLevel = waterLevel;
    
    refillIntervalRef.current = window.setInterval(() => {
      currentWaterLevel = Math.min(100, currentWaterLevel + 2);
      console.log(`Refilling: current level: ${currentWaterLevel}`);
      
      setWaterLevel(currentWaterLevel);
      
      if (currentWaterLevel >= 100) {
        console.log("Water tank full! Stopping refill.");
        stopRefilling();
      }
      
      // Create new particle effect every few refill ticks for continuous effect
      if (Math.random() > 0.7) {
        createRefillEffect();
      }
    }, 100); // Refill rate - increase by 2 every 100ms
    
    // Create initial refill effect
    if (cameraRef.current && sceneRef.current) {
      console.log("Creating initial refill effect");
      createRefillEffect();
    }
  };
  
  const stopRefilling = () => {
    console.log("Stopping refill process.");
    setRefilling(false);
    if (refillIntervalRef.current) {
      clearInterval(refillIntervalRef.current);
      refillIntervalRef.current = null;
    }
  };
  
  const createRefillEffect = () => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    // Find the closest water tub
    let closestTub: THREE.Group | null = null;
    let minDistance = Infinity;
    
    waterTubsRef.current.forEach(tub => {
      const distance = tub.position.distanceTo(cameraRef.current!.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestTub = tub;
      }
    });
    
    if (!closestTub) return;
    
    // Create water particles flowing from tub to gun
    const particles = new THREE.Group();
    const waterColor = 0x33ccff;
    
    // Create particle stream
    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.SphereGeometry(0.03, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: waterColor,
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Set initial position at the tub
      particle.position.copy(closestTub.position.clone());
      particle.position.y += 0.8; // Start at the top of the tub
      
      // Target is the water gun
      const target = waterGunRef.current?.position.clone() || cameraRef.current.position.clone();
      target.y -= 0.2;
      
      // Calculate direction to gun
      const direction = new THREE.Vector3().subVectors(target, particle.position);
      direction.normalize();
      
      // Add random spread
      direction.x += (Math.random() - 0.5) * 0.2;
      direction.y += (Math.random() - 0.5) * 0.2;
      direction.z += (Math.random() - 0.5) * 0.2;
      
      // Set velocity
      particle.userData.velocity = direction.multiplyScalar(0.1 + Math.random() * 0.1);
      
      // Set lifetime
      particle.userData.life = 1.0;
      particle.userData.decay = 0.02 + Math.random() * 0.02;
      
      particles.add(particle);
    }
    
    sceneRef.current.add(particles);
    
    // Animate particles
    const animateParticles = () => {
      let allDead = true;
      
      particles.children.forEach(child => {
        // Make sure we're working with a Mesh with a MeshBasicMaterial
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          const particle = child;
          const particleData = particle.userData;
          
          // Update position
          if (particleData.velocity) {
            particle.position.add(particleData.velocity);
          }
          
          // Decay life
          if (particleData.life !== undefined && particleData.decay !== undefined) {
            particleData.life -= particleData.decay;
            
            // Update opacity based on life
            if (particleData.life > 0) {
              particle.material.opacity = particleData.life * 0.7;
              allDead = false;
            } else {
              particle.material.opacity = 0;
            }
          }
        }
      });
      
      // Remove particles if all are dead
      if (allDead) {
        clearInterval(animation);
        sceneRef.current?.remove(particles);
      }
    };
    
    const animation = setInterval(animateParticles, 16);
    
    // Clean up after some time regardless
    setTimeout(() => {
      clearInterval(animation);
      sceneRef.current?.remove(particles);
    }, 2000);
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
      
      let moved = false;
      
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        camera.position.add(forward.clone().multiplyScalar(moveSpeed));
        moved = true;
      }
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        camera.position.add(forward.clone().multiplyScalar(-moveSpeed));
        moved = true;
      }
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        camera.position.add(right.clone().multiplyScalar(-moveSpeed));
        moved = true;
      }
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        camera.position.add(right.clone().multiplyScalar(moveSpeed));
        moved = true;
      }
      
      if (keysPressed.current['q']) {
        camera.rotation.y += rotateSpeed;
        moved = true;
      }
      if (keysPressed.current['e']) {
        camera.rotation.y -= rotateSpeed;
        moved = true;
      }
      
      // Check for R key pressing - for continuous refill
      if (keysPressed.current['r'] && nearWaterTank && !refilling && waterLevel < 100) {
        console.log("Starting refill from continuous R press");
        startRefilling();
      }
      
      if (moved) {
        console.log("Movement detected!");
      }
      
      camera.position.x = Math.max(-15, Math.min(15, camera.position.x));
      camera.position.z = Math.max(-15, Math.min(15, camera.position.z));
      
      // Check if player is near any water tub
      let playerNearTub = false;
      let nearestTubIndex = -1;
      let minDistance = Infinity;
      
      waterTubsRef.current.forEach((tub, index) => {
        const distance = tub.position.distanceTo(camera.position);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestTubIndex = index;
        }
        
        // Use a clearer detection range of 3 units
        if (distance < 3.0) {
          playerNearTub = true;
        }
      });
      
      // Debug logging for water tank proximity
      if (playerNearTub && !nearWaterTank) {
        console.log("Player now near water tank! Distance:", minDistance);
      } else if (!playerNearTub && nearWaterTank) {
        console.log("Player left water tank area!");
        
        // Make sure refilling stops if player leaves the area
        if (refilling) {
          stopRefilling();
        }
      }
      
      // Update refill indicators
      refillIndicatorsRef.current.forEach((indicator, i) => {
        // Synchronized with the same detection range as playerNearTub
        const isNearThis = waterTubsRef.current[i].position.distanceTo(camera.position) < 3.0;
        indicator.visible = isNearThis;
        
        // Update pulsing effect for the nearest indicator
        if (indicator.visible) {
          // Get the text mesh and check that it's a proper mesh
          const textMesh = indicator.children[0];
          if (textMesh instanceof THREE.Mesh && textMesh.material instanceof THREE.MeshBasicMaterial) {
            // Now TypeScript knows it's a MeshBasicMaterial
            textMesh.material.opacity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
          }
          
          // Make indicator face the camera
          indicator.lookAt(camera.position);
        }
      });
      
      // Update nearWaterTank state
      if (playerNearTub !== nearWaterTank) {
        setNearWaterTank(playerNearTub);
      }
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
    if (!gameStarted) return;
    
    console.log("Shooting attempt! Water level:", waterLevel);
    
    // Strict check to ensure we can't shoot when water is empty
    if (waterLevel <= 0) {
      console.log("Out of water - can't shoot!");
      return;
    }
    
    console.log("Shooting!");
    
    setWaterLevel(prev => Math.max(0, prev - 5));
    
    const raycaster = new THREE.Raycaster();
    
    if (cameraRef.current && sceneRef.current) {
      // When mouse is locked, shoot from center of screen
      if (isMouseLocked.current) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
      } else {
        // Otherwise use mouse position (for non-locked shooting)
        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, cameraRef.current);
      }
      
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      console.log("Intersections found:", intersects.length);
      
      if (intersects.length > 0) {
        // Find the first intersection that hits an NPC
        let hitNPC: NPC | undefined = undefined;
        let hitPoint: THREE.Vector3 | undefined = undefined;
        
        // Check each intersection to see if it's with an NPC
        for (const intersect of intersects) {
          // Walk up the parent chain to see if this is part of an NPC
          let parent: THREE.Object3D | null = intersect.object;
          let foundNPC = false;
          
          while (parent) {
            const npcIndex = npcsRef.current.findIndex(npc => npc.model === parent);
            if (npcIndex >= 0) {
              hitNPC = npcsRef.current[npcIndex];
              hitPoint = intersect.point;
              foundNPC = true;
              break;
            }
            parent = parent.parent;
          }
          
          if (foundNPC) break;
        }
        
        if (hitNPC && hitPoint) {
          console.log("Hit an NPC at specific point!", hitPoint);
          
          // Pass the intersection point to the NPC for localized coloring
          hitNPC.getColored(hitPoint);
          setScore(prev => prev + 10);
        }
        
        // Always create a splash at the first hit point, whether it's an NPC or the environment
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
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      // Store velocity in userData for type safety
      particle.userData.velocity = new THREE.Vector3(
        Math.random() * 0.1 - 0.05,
        Math.random() * 0.1,
        Math.random() * 0.1 - 0.05
      );
      
      particles.add(particle);
    }
    
    sceneRef.current.add(particles);
    
    const animateParticles = () => {
      particles.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData.velocity) {
          // Update position using velocity from userData
          child.position.add(child.userData.velocity);
          
          // Apply gravity
          child.userData.velocity.y -= 0.001;
        }
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
  
  return (
    <div className="relative w-full h-screen">
      {isLoading ? (
        <LoadingScreen onLoadingComplete={handleLoadingComplete} />
      ) : (
        <>
          <div 
            ref={containerRef} 
            className="w-full h-full" 
            onClick={handleContainerClick}
          />
          
          {/* Crosshair when mouse is locked */}
          {gameStarted && isMouseLocked.current && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute w-6 h-0.5 bg-white/30 rounded-full"></div>
                <div className="absolute w-0.5 h-6 bg-white/30 rounded-full"></div>
              </div>
            </div>
          )}
          
          {/* Refill indicator */}
          {gameStarted && nearWaterTank && (
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30 text-center">
                <p className="text-white font-medium">{refilling ? "Refilling..." : "Press R to Refill"}</p>
                {refilling && (
                  <div className="w-full bg-white/30 h-1 mt-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-100 ease-out" 
                      style={{ width: `${waterLevel}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <GameUI 
            score={score} 
            waterLevel={waterLevel} 
            gameStarted={gameStarted}
            onStart={startGame}
          />
          {gameStarted && (
            <div className="absolute bottom-20 left-4 p-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
              <p className="text-sm font-medium text-white">
                Controls: WASD to move, mouse to aim, click to shoot
              </p>
              <p className="text-sm font-medium text-white mt-1">
                Find water tanks and hold R to refill
              </p>
              {!isMouseLocked.current && (
                <p className="text-xs text-white/80 mt-1">
                  Click on the game to enable mouse aiming
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HoliGame;
