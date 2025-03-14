import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createScene, createCamera, createRenderer } from '../utils/threeUtils';
import { setupLighting, createNPCs, createWaterGun, createWaterBalloons, createWaterTubs } from '../utils/gameUtils';
import { generateProceduralMap } from '../utils/mapGenerator';
import { NPC } from '../models/gameModels';
import GameUI from './GameUI';
import LoadingScreen from './LoadingScreen';
import { generateCloudTexture, generateGradientTexture } from '../utils/textureGenerator';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const BrowserSafeHoliGame: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    sceneReady: boolean;
    objectCounts: {
      meshes: number;
      lights: number;
      groups: number;
      waterTubs: number;
      npcs: number;
    }
  }>({
    sceneReady: false,
    objectCounts: {
      meshes: 0,
      lights: 0,
      groups: 0,
      waterTubs: 0,
      npcs: 0
    }
  });
  
  // Reference to the scene for debugging
  const sceneDebugRef = useRef<THREE.Scene | null>(null);
  
  // Add debug functions
  const updateDebugInfo = (scene: THREE.Scene, waterTubs: THREE.Group[], npcs: NPC[]) => {
    sceneDebugRef.current = scene;
    
    const meshes = scene.children.filter(child => child instanceof THREE.Mesh).length;
    const lights = scene.children.filter(child => 
      child instanceof THREE.DirectionalLight || 
      child instanceof THREE.AmbientLight || 
      child instanceof THREE.PointLight
    ).length;
    const groups = scene.children.filter(child => child instanceof THREE.Group).length;
    
    setDebugInfo({
      sceneReady: true,
      objectCounts: {
        meshes,
        lights,
        groups,
        waterTubs: waterTubs.length,
        npcs: npcs.length
      }
    });
  };
  
  // Only render the full game component after initial mount
  useEffect(() => {
    if (isBrowser) {
      console.log("Client-side rendering - mounting HoliGame");
      setIsMounted(true);
    }
  }, []);
  
  if (!isBrowser) {
    console.log("Server-side rendering - showing minimal UI");
    // Return loading UI for server-side rendering
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-blue-900">
        <div className="text-white text-xl">Loading Holi Splash Festival...</div>
      </div>
    );
  }
  
  if (!isMounted) {
    console.log("Client-side but not yet mounted - showing loading UI");
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-blue-900">
        <div className="text-white text-xl">Preparing Holi Festival...</div>
      </div>
    );
  }
  
  // Render the full game when in browser environment and mounted
  console.log("Rendering full HoliGame component");
  return (
    <>
      <HoliGameInternal onDebugUpdate={updateDebugInfo} />
      {/* Debugging overlay */}
      <div className="fixed top-0 right-0 bg-black/70 text-white p-4 text-xs font-mono z-50">
        <h3 className="font-bold">Debug Info</h3>
        <div>Scene Ready: {debugInfo.sceneReady ? "Yes" : "No"}</div>
        <div>Meshes: {debugInfo.objectCounts.meshes}</div>
        <div>Lights: {debugInfo.objectCounts.lights}</div>
        <div>Groups: {debugInfo.objectCounts.groups}</div>
        <div>Water Tubs: {debugInfo.objectCounts.waterTubs}</div>
        <div>NPCs: {debugInfo.objectCounts.npcs}</div>
        <button 
          className="mt-2 px-2 py-1 bg-blue-500 rounded text-white"
          onClick={() => console.log("Scene:", sceneDebugRef.current)}
        >
          Log Scene
        </button>
      </div>
    </>
  );
};

const HoliGameInternal: React.FC<{ onDebugUpdate?: (scene: THREE.Scene, waterTubs: THREE.Group[], npcs: NPC[]) => void }> = ({ onDebugUpdate }) => {
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
  const mapSizeRef = useRef<number>(30); // Store map size for boundaries
  const obstaclesRef = useRef<THREE.Object3D[]>([]);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const moveSpeed = 0.15;
  const rotateSpeed = 0.03;
  
  // Add mouse control references
  const isMouseLocked = useRef<boolean>(false);
  const mouseMovement = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const mouseSensitivity = 0.002;
  const trackpadSensitivity = 0.001; // Lower sensitivity for trackpad
  
  // Track pointer lock state
  const handlePointerLockChange = () => {
    isMouseLocked.current = document.pointerLockElement === containerRef.current;
  };
  
  // Helper function to ensure camera orientation is correct with no unwanted roll
  const resetCameraOrientation = () => {
    if (!cameraRef.current) return;
    
    // Force the camera to use Euler rotations with the correct order
    cameraRef.current.rotation.order = 'YXZ'; // This order ensures yaw-pitch-roll behavior
    
    // Ensure roll is always zero
    cameraRef.current.rotation.z = 0;
    
    // Update the quaternion from the Euler angles
    cameraRef.current.quaternion.setFromEuler(cameraRef.current.rotation);
  };
  
  // Track mouse movement for camera rotation
  const handleMouseMove = (event: MouseEvent) => {
    if (isMouseLocked.current && cameraRef.current && gameStarted) {
      // Get mouse movement
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      // Only update yaw (horizontal) and pitch (vertical) rotations
      // Horizontal rotation (yaw) - around Y axis
      cameraRef.current.rotation.y -= movementX * trackpadSensitivity;
      
      // Vertical rotation (pitch) - around X axis
      const verticalRotation = cameraRef.current.rotation.x + (-movementY * trackpadSensitivity);
      cameraRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, verticalRotation));
      
      // Reset orientation to prevent any roll
      resetCameraOrientation();
    }
  };
  
  // Handle mouse click to lock pointer
  const handleContainerClick = () => {
    if (gameStarted && containerRef.current && !isMouseLocked.current) {
      containerRef.current.requestPointerLock();
    }
  };
  
  useEffect(() => {
    console.log("useEffect triggered. isLoading:", isLoading, "containerRef.current:", !!containerRef.current, "isBrowser:", isBrowser);
    
    if (isLoading || !containerRef.current || !isBrowser) {
      console.log("Skipping Three.js initialization due to missing requirements");
      return;
    }
    
    console.log("Initializing Three.js");
    
    try {
      const { scene, camera, renderer } = initThreeJS();
      
      console.log("Three.js initialized successfully, setting up game");
      setupGame(scene, camera);
      
      const animate = () => {
        try {
          animationFrameRef.current = requestAnimationFrame(animate);
          updateGame();
          renderer.render(scene, camera);
          
          // Animate ambient particles
          if (scene.userData.ambientParticles) {
            const particles = scene.userData.ambientParticles;
            const positions = particles.geometry.attributes.position.array;
            const time = Date.now();
            
            for (let i = 0; i < positions.length; i += 3) {
              // Gentle floating motion
              positions[i + 1] += Math.sin(time * 0.001 + i) * 0.01;
              if (positions[i + 1] > 20) positions[i + 1] = 0;
              
              // Slight horizontal drift
              positions[i] += Math.sin(time * 0.0005 + i) * 0.01;
              positions[i + 2] += Math.cos(time * 0.0005 + i) * 0.01;
              
              // Keep particles within bounds
              const bound = mapSizeRef.current / 2;
              if (positions[i] > bound) positions[i] = -bound;
              if (positions[i] < -bound) positions[i] = bound;
              if (positions[i + 2] > bound) positions[i + 2] = -bound;
              if (positions[i + 2] < -bound) positions[i + 2] = bound;
            }
            particles.geometry.attributes.position.needsUpdate = true;
          }
          
          // Animate clouds
          if (scene.userData.clouds) {
            const clouds = scene.userData.clouds;
            clouds.rotation.z += 0.0001;
            
            // Gentle cloud pulsing
            const time = Date.now();
            const scale = 1 + Math.sin(time * 0.001) * 0.02;
            clouds.scale.set(scale, scale, 1);
          }
        } catch (animationError) {
          console.error("Error in animation loop:", animationError);
        }
      };
      
      console.log("Starting animation loop");
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
  
  const createFallbackScene = () => {
    if (!containerRef.current) return;
    
    console.log("Creating fallback scene with basic elements");
    
    try {
      // Create a basic scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Create a simple ground
      const groundGeometry = new THREE.PlaneGeometry(50, 50);
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x91e55f });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      
      // Create a basic camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        containerRef.current.clientWidth / containerRef.current.clientHeight, 
        0.1, 
        1000
      );
      camera.position.set(0, 1.7, 10);
      
      // Create a simple renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      containerRef.current.appendChild(renderer.domElement);
      
      // Store refs
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      
      // Add a simple box as a test object
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff3366 });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(0, 0.5, -5);
      box.castShadow = true;
      scene.add(box);
      
      // Simple water tub
      const tubGeometry = new THREE.CylinderGeometry(0.7, 0.5, 0.8, 16);
      const tubMaterial = new THREE.MeshStandardMaterial({ color: 0x3366ff });
      const tub = new THREE.Mesh(tubGeometry, tubMaterial);
      tub.position.set(3, 0.4, -4);
      tub.castShadow = true;
      scene.add(tub);
      
      // Store it as a water tub
      const tubGroup = new THREE.Group();
      tubGroup.add(tub);
      tubGroup.position.copy(tub.position);
      waterTubsRef.current = [tubGroup];
      
      // Create a simple animation function
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        box.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      
      animate();
      
      // Return true if fallback scene was created successfully
      return true;
    } catch (error) {
      console.error("Error creating fallback scene:", error);
      return false;
    }
  };
  
  const initThreeJS = () => {
    if (!isBrowser) {
      console.error("Cannot initialize Three.js in non-browser environment");
      throw new Error("Cannot initialize Three.js in non-browser environment");
    }
    
    if (!containerRef.current) {
      console.error("Container ref is not available");
      throw new Error("Container ref is not available");
    }
    
    console.log("Container element:", containerRef.current);
    
    try {
      const scene = createScene();
      const camera = createCamera();
      const renderer = createRenderer(containerRef.current);
      
      console.log("Scene created:", scene);
      console.log("Camera created:", camera);
      console.log("Renderer created:", renderer);
      
      // Enable shadows for better visuals
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      
      return { scene, camera, renderer };
    } catch (error) {
      console.error("Error in Three.js initialization:", error);
      
      // Try to create a fallback scene
      if (createFallbackScene()) {
        console.log("Fallback scene created successfully");
        // Return the refs that were set in createFallbackScene
        return {
          scene: sceneRef.current!,
          camera: cameraRef.current!,
          renderer: rendererRef.current!
        };
      }
      
      throw error;
    }
  };
  
  const setupGame = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    console.log("Setting up game...");
    
    try {
      // Setup enhanced lighting for the procedural map
      console.log("Setting up enhanced lighting...");
      setupEnhancedLighting(scene);
      
      // Add skybox for better visuals
      console.log("Creating skybox...");
      createSkybox(scene);
      
      // Generate procedural map with terrain, obstacles, and decorations
      console.log("Generating procedural map...");
      const { ground, obstacles, decorations, waterTubs } = generateProceduralMap(scene, {
        size: 30,
        terrainRoughness: 0.8,
        obstacleCount: 15,
        decorationDensity: 0.1,
        waterTubCount: 5
      });
      console.log("Procedural map generated:", { ground, obstacles: obstacles.length, decorations: decorations.length, waterTubs: waterTubs.length });
      
      // Add ambient color dust particles
      console.log("Creating ambient color dust...");
      createAmbientColorDust(scene);
      
      // Store map size and obstacles for collision detection
      mapSizeRef.current = 30;
      obstaclesRef.current = obstacles;
      
      // Store water tubs for refilling
      waterTubsRef.current = waterTubs;
      
      // Create NPCs and position them on the terrain
      console.log("Creating NPCs...");
      npcsRef.current = createNPCs(scene, 10);
      console.log("NPCs created:", npcsRef.current.length);
      
      // Position NPCs at valid locations (not inside obstacles)
      console.log("Positioning NPCs...");
      npcsRef.current.forEach(npc => {
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 20) {
          attempts++;
          const x = (Math.random() * mapSizeRef.current - mapSizeRef.current/2) * 0.8;
          const z = (Math.random() * mapSizeRef.current - mapSizeRef.current/2) * 0.8;
          
          // Check distance from obstacles
          validPosition = true;
          for (const obstacle of obstaclesRef.current) {
            const dx = obstacle.position.x - x;
            const dz = obstacle.position.z - z;
            const distance = Math.sqrt(dx*dx + dz*dz);
            
            if (distance < 2) {
              validPosition = false;
              break;
            }
          }
          
          if (validPosition) {
            npc.setPosition(x, 0, z);
          }
        }
        
        // If we couldn't find a valid position, use a fallback
        if (!validPosition) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 5 + Math.random() * 5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          npc.setPosition(x, 0, z);
        }
      });
      
      // Create water gun
      console.log("Creating water gun...");
      waterGunRef.current = createWaterGun(scene, camera);
      
      // Create water balloons as additional gameplay elements
      console.log("Creating water balloons...");
      createWaterBalloons(scene, 5);
      
      // Create refill indicators above each water tub
      console.log("Creating refill indicators...");
      createRefillIndicators(scene);
      
      // Set initial camera position
      camera.position.set(0, 1.7, 10);
      camera.lookAt(0, 1.7, 0);
      
      // Update debug info
      if (onDebugUpdate) {
        onDebugUpdate(scene, waterTubsRef.current, npcsRef.current);
      }
      
      console.log("Game setup complete!");
      
      // Log scene children for debugging
      console.log("Scene children:", scene.children);
    } catch (error) {
      console.error("Error setting up game:", error);
    }
  };
  
  // Setup enhanced lighting for better visuals
  const setupEnhancedLighting = (scene: THREE.Scene) => {
    try {
      console.log("Setting up enhanced lighting");
      
      // Ambient light for base illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);
      
      // Main directional light (sun)
      const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
      sunLight.position.set(10, 20, 15);
      sunLight.castShadow = true;
      
      // Improve shadow quality
      sunLight.shadow.mapSize.width = 1024; // Reduced from 2048 for better performance
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 50;
      
      // Adjust shadow camera frustum to cover the scene
      const shadowSize = 30;
      sunLight.shadow.camera.left = -shadowSize;
      sunLight.shadow.camera.right = shadowSize;
      sunLight.shadow.camera.top = shadowSize;
      sunLight.shadow.camera.bottom = -shadowSize;
      
      scene.add(sunLight);
      
      // Add some colored fill lights for Holi atmosphere
      const colors = [0xff5555, 0x55ff55, 0x5555ff];
      const positions = [
        new THREE.Vector3(-15, 5, -15),
        new THREE.Vector3(15, 5, -15),
        new THREE.Vector3(0, 5, 15)
      ];
      
      colors.forEach((color, index) => {
        const fillLight = new THREE.PointLight(color, 0.5, 30);
        fillLight.position.copy(positions[index]);
        scene.add(fillLight);
      });
      
      // Add simple fog for atmosphere that works on mobile
      scene.fog = new THREE.Fog(0xd7f0ff, 20, 100);
      
      console.log("Enhanced lighting setup complete");
    } catch (error) {
      console.error("Error setting up enhanced lighting:", error);
      
      // Fallback to basic lighting if something goes wrong
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.8));
    }
  };
  
  // Create a skybox for better visuals
  const createSkybox = (scene: THREE.Scene) => {
    try {
      console.log("Creating skybox");
      
      // Create skybox with gradient and clouds
      const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
      
      console.log("Creating sky gradient texture");
      const skyGradient = generateGradientTexture('#87CEEB', '#E0F6FF');
      console.log("Sky gradient texture created:", skyGradient);
      
      const skyMaterial = new THREE.MeshBasicMaterial({
        map: skyGradient,
        side: THREE.BackSide,
      });
      const sky = new THREE.Mesh(skyGeometry, skyMaterial);
      scene.add(sky);
      
      console.log("Creating cloud texture");
      const cloudTexture = generateCloudTexture();
      console.log("Cloud texture created:", cloudTexture);
      
      const cloudGeometry = new THREE.PlaneGeometry(1000, 1000);
      const cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });
      const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
      clouds.position.y = 200;
      clouds.rotation.x = -Math.PI / 2;
      scene.add(clouds);
      
      // Create ambient color particles only in browser environment
      if (isBrowser) {
        console.log("Creating ambient particles");
        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const holiColors = [
          new THREE.Color('#ff3366'),
          new THREE.Color('#33ccff'),
          new THREE.Color('#ffcc33'),
          new THREE.Color('#ff33cc'),
          new THREE.Color('#33ffcc'),
        ];
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          // Random position within game bounds
          positions[i3] = (Math.random() - 0.5) * mapSizeRef.current;
          positions[i3 + 1] = Math.random() * 20; // Height up to 20 units
          positions[i3 + 2] = (Math.random() - 0.5) * mapSizeRef.current;
          
          // Random color from holi palette
          const color = holiColors[Math.floor(Math.random() * holiColors.length)];
          colors[i3] = color.r;
          colors[i3 + 1] = color.g;
          colors[i3 + 2] = color.b;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
          size: 0.1,
          vertexColors: true,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        // Store particles in userData for animation
        scene.userData.ambientParticles = particles;
        scene.userData.clouds = clouds;
        
        console.log("Skybox and particles created successfully");
      }
    } catch (error) {
      console.error("Error creating skybox:", error);
    }
  };
  
  // Create ambient color dust particles floating in the air
  const createAmbientColorDust = (scene: THREE.Scene) => {
    // Skip if not in browser
    if (!isBrowser) return;
    
    const particleCount = 200;
    const colors = [0xff3366, 0x33ccff, 0xffcc33, 0xff33cc, 0x33ffcc];
    
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const size = 0.03 + Math.random() * 0.05;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particles randomly within the map
      const mapSize = mapSizeRef.current;
      const x = (Math.random() * mapSize - mapSize/2) * 0.9;
      const y = 0.5 + Math.random() * 3; // Float above ground
      const z = (Math.random() * mapSize - mapSize/2) * 0.9;
      
      particle.position.set(x, y, z);
      
      // Add random floating motion data
      particle.userData.floatSpeed = 0.001 + Math.random() * 0.003;
      particle.userData.floatAmplitude = 0.1 + Math.random() * 0.3;
      particle.userData.floatOffset = Math.random() * Math.PI * 2;
      particle.userData.rotationSpeed = Math.random() * 0.01;
      particle.userData.initialY = y;
      
      particles.add(particle);
    }
    
    scene.add(particles);
    
    // Animate dust particles
    const animateDust = () => {
      if (!isBrowser) return;
      
      particles.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          // Gentle floating motion
          const time = Date.now() * 0.001;
          child.position.y = child.userData.initialY + 
            Math.sin(time * child.userData.floatSpeed + child.userData.floatOffset) * 
            child.userData.floatAmplitude;
          
          // Slow rotation
          child.rotation.x += child.userData.rotationSpeed;
          child.rotation.y += child.userData.rotationSpeed * 0.8;
        }
      });
      
      requestAnimationFrame(animateDust);
    };
    
    animateDust();
  };
  
  // Create refill indicators above water tubs
  const createRefillIndicators = (scene: THREE.Scene) => {
    refillIndicatorsRef.current = waterTubsRef.current.map(tub => {
      const indicator = new THREE.Group();
      
      // Create floating text mesh for "Press R to Refill"
      const textGeometry = new THREE.PlaneGeometry(1.5, 0.5);
      let texture: THREE.Texture;
      
      if (isBrowser) {
        // Client-side - create canvas texture
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
        texture = new THREE.CanvasTexture(canvas);
      } else {
        // Server-side - create a solid color
        const data = new Uint8Array([0, 0, 0, 200]); // Black with transparency
        texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      }
      
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
  
  // Function to get terrain height at a specific position
  const getTerrainHeightAt = (position: THREE.Vector3): number => {
    if (!sceneRef.current) return 0;
    
    // Create a raycaster to detect terrain height
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.set(position.x, 20, position.z); // Start from high above
    raycaster.ray.direction.set(0, -1, 0); // Point downward
    
    // Find ground objects to check for height
    const groundObjects = sceneRef.current.children.filter(child => 
      child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.PlaneGeometry
    );
    
    // Cast ray downward to find terrain height
    const intersects = raycaster.intersectObjects(groundObjects);
    
    if (intersects.length > 0) {
      // Get the y-position of the first intersection
      return intersects[0].point.y;
    }
    
    return 0; // Default height if no terrain found
  };

  const updateGame = () => {
    if (npcsRef.current) {
      npcsRef.current.forEach(npc => {
        npc.update();
        
        // Update NPC boundaries to match map size
        const halfSize = mapSizeRef.current / 2;
        if (npc.position.x > halfSize) npc.position.x = halfSize;
        if (npc.position.x < -halfSize) npc.position.x = -halfSize;
        if (npc.position.z > halfSize) npc.position.z = halfSize;
        if (npc.position.z < -halfSize) npc.position.z = -halfSize;
        
        // Check for collisions with obstacles
        for (const obstacle of obstaclesRef.current) {
          const dx = obstacle.position.x - npc.position.x;
          const dz = obstacle.position.z - npc.position.z;
          const distance = Math.sqrt(dx*dx + dz*dz);
          
          // Simple collision avoidance
          if (distance < 1.5) {
            // Change direction away from obstacle
            npc.moveDirection.set(-dx, 0, -dz).normalize();
            break;
          }
        }
      });
    }
    
    if (cameraRef.current && gameStarted) {
      const camera = cameraRef.current;
      
      // Ensure camera orientation is correct
      resetCameraOrientation();
      
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();
      
      let moved = false;
      
      // Store current position for collision detection
      const oldPosition = camera.position.clone();
      
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
        // Check for collisions with obstacles
        let collision = false;
        for (const obstacle of obstaclesRef.current) {
          const dx = obstacle.position.x - camera.position.x;
          const dz = obstacle.position.z - camera.position.z;
          const distance = Math.sqrt(dx*dx + dz*dz);
          
          // Simple collision detection
          if (distance < 1.0) {
            collision = true;
            break;
          }
        }
        
        // If collision detected, revert to old position
        if (collision) {
          camera.position.copy(oldPosition);
        }
        
        // Enforce map boundaries
        const halfSize = mapSizeRef.current / 2;
        camera.position.x = Math.max(-halfSize, Math.min(halfSize, camera.position.x));
        camera.position.z = Math.max(-halfSize, Math.min(halfSize, camera.position.z));
        
        // Adjust camera height to terrain
        const terrainHeight = getTerrainHeightAt(camera.position);
        camera.position.y = terrainHeight + 1.7; // Eye height above terrain
      }
      
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
    
    // Create more particles for a better splash effect
    for (let i = 0; i < 25; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      // Store velocity in userData for type safety
      particle.userData.velocity = new THREE.Vector3(
        Math.random() * 0.15 - 0.075,
        Math.random() * 0.15,
        Math.random() * 0.15 - 0.075
      );
      
      // Add rotation for more dynamic movement
      particle.userData.rotationSpeed = {
        x: Math.random() * 0.1,
        y: Math.random() * 0.1,
        z: Math.random() * 0.1
      };
      
      // Add scale data for animation
      particle.userData.scale = 1.0;
      particle.userData.scaleSpeed = 0.97;
      
      particles.add(particle);
    }
    
    // Add a flash effect at the impact point
    const flashGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    flash.userData.scale = 1.0;
    flash.userData.scaleSpeed = 0.85;
    
    particles.add(flash);
    
    sceneRef.current.add(particles);
    
    const animateParticles = () => {
      particles.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          if (child.userData.velocity) {
            // Update position using velocity from userData
            child.position.add(child.userData.velocity);
            
            // Apply gravity
            child.userData.velocity.y -= 0.002;
            
            // Apply rotation if available
            if (child.userData.rotationSpeed) {
              child.rotation.x += child.userData.rotationSpeed.x;
              child.rotation.y += child.userData.rotationSpeed.y;
              child.rotation.z += child.userData.rotationSpeed.z;
            }
          }
          
          // Scale down over time
          if (child.userData.scale !== undefined) {
            child.userData.scale *= child.userData.scaleSpeed;
            child.scale.set(
              child.userData.scale,
              child.userData.scale,
              child.userData.scale
            );
            
            // Remove when too small
            if (child.userData.scale < 0.01) {
              particles.remove(child);
            }
          }
          
          // Fade out
          if (child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity *= 0.98;
          }
        }
      });
      
      if (particles.children.length === 0) {
        clearInterval(particleAnimation);
        sceneRef.current?.remove(particles);
      }
    };
    
    const particleAnimation = setInterval(animateParticles, 16);
    
    setTimeout(() => {
      clearInterval(particleAnimation);
      sceneRef.current?.remove(particles);
    }, 2000);
  };
  
  const startGame = () => {
    if (!isBrowser) {
      console.warn('Cannot start game in server environment');
      return;
    }
    setGameStarted(true);
    
    // Initialize camera rotation order when the game starts
    if (cameraRef.current) {
      cameraRef.current.rotation.order = 'YXZ';
      resetCameraOrientation();
    }
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

export default BrowserSafeHoliGame;
