import * as THREE from 'three';
import { NPC } from '../models/gameModels';

// Setup the scene lighting
export const setupLighting = (scene: THREE.Scene): void => {
  // Main directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(10, 20, 10);
  sunLight.castShadow = true;
  
  // Configure shadow properties
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -20;
  sunLight.shadow.camera.right = 20;
  sunLight.shadow.camera.top = 20;
  sunLight.shadow.camera.bottom = -20;
  
  scene.add(sunLight);
  
  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0xccccff, 0.5);
  scene.add(ambientLight);
  
  // Colorful point lights for Holi atmosphere
  const colors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
  
  colors.forEach((color, index) => {
    const pointLight = new THREE.PointLight(color, 0.5, 10);
    const angle = (index / colors.length) * Math.PI * 2;
    const radius = 8;
    
    pointLight.position.set(
      Math.cos(angle) * radius,
      2,
      Math.sin(angle) * radius
    );
    
    scene.add(pointLight);
  });
  
  // Create a festival environment
  createFestivalEnvironment(scene);
};

// Create the festival environment with decorations
const createFestivalEnvironment = (scene: THREE.Scene): void => {
  // Create ground
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xe0e0e0,
    roughness: 0.9
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Add color spots on the ground
  for (let i = 0; i < 100; i++) {
    const spotGeometry = new THREE.CircleGeometry(Math.random() * 0.5 + 0.2, 16);
    const colors = [0xff3366, 0x33ff66, 0x6633ff, 0xffff33, 0x33ffff, 0xff33ff];
    const spotMaterial = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.7
    });
    
    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
    spot.position.set(
      Math.random() * 40 - 20,
      0.01, // Just above ground
      Math.random() * 40 - 20
    );
    spot.rotation.x = -Math.PI / 2;
    scene.add(spot);
  }
  
  // Add decorative elements
  addDecorations(scene);
};

// Add festive decorations
const addDecorations = (scene: THREE.Scene): void => {
  // Create colorful banners and flags
  for (let i = 0; i < 20; i++) {
    const banner = createBanner();
    // Position banners on the ground
    banner.position.set(
      Math.random() * 30 - 15,
      0, // Position at ground level
      Math.random() * 30 - 15
    );
    scene.add(banner);
  }
  
  // Create water tubs/containers
  for (let i = 0; i < 5; i++) {
    const tub = createWaterTub();
    tub.position.set(
      Math.random() * 20 - 10,
      0,
      Math.random() * 20 - 10
    );
    scene.add(tub);
  }
};

// Create a decorative banner
const createBanner = (): THREE.Group => {
  const banner = new THREE.Group();
  
  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  // Position pole so it stands on the ground
  pole.position.y = 2; // Half height of the pole
  pole.castShadow = true;
  banner.add(pole);
  
  // Flag - these decorative flags are inspired by traditional Holi festival decorations
  // They serve multiple purposes:
  // 1. Visual aesthetics - adding color and festivity to the game environment
  // 2. Cultural context - representing the celebratory atmosphere of Holi
  // 3. Game landmarks - helping players navigate the game space
  // 4. Immersion - enhancing the feeling of being at a Holi festival
  const colors = [0xff3366, 0x33ff66, 0x6633ff, 0xffff33, 0x33ffff, 0xff33ff];
  
  // Create a more elaborate flag with multiple colored sections
  const sections = Math.floor(Math.random() * 2) + 2; // 2-3 sections
  
  for (let i = 0; i < sections; i++) {
    const flagGeometry = new THREE.PlaneGeometry(1, 0.6 / sections);
    const flagMaterial = new THREE.MeshBasicMaterial({ 
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide
    });
    
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    // Position each section above the previous one
    flag.position.set(0.5, 3.5 - (i * 0.6 / sections), 0);
    banner.add(flag);
  }
  
  // Add some decorative elements to the banner
  const decorations = Math.floor(Math.random() * 3) + 1; // 1-3 decorations
  
  for (let i = 0; i < decorations; i++) {
    const size = 0.1 + Math.random() * 0.1;
    const decorGeometry = new THREE.SphereGeometry(size, 8, 8);
    const decorMaterial = new THREE.MeshBasicMaterial({ 
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    
    const decoration = new THREE.Mesh(decorGeometry, decorMaterial);
    // Position decorations randomly on the pole
    decoration.position.set(
      0, 
      1 + Math.random() * 2, // Position along the pole
      0
    );
    banner.add(decoration);
  }
  
  return banner;
};

// Create a water tub
const createWaterTub = (): THREE.Group => {
  const tub = new THREE.Group();
  
  // Tub base
  const tubGeometry = new THREE.CylinderGeometry(0.7, 0.5, 0.8, 16);
  const tubMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3366ff,
    transparent: true,
    opacity: 0.8
  });
  
  const tubMesh = new THREE.Mesh(tubGeometry, tubMaterial);
  tubMesh.position.y = 0.4;
  tubMesh.castShadow = true;
  tubMesh.receiveShadow = true;
  tub.add(tubMesh);
  
  // Water surface
  const waterGeometry = new THREE.CircleGeometry(0.65, 16);
  const waterMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x33ccff,
    transparent: true,
    opacity: 0.7
  });
  
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.y = 0.75;
  water.rotation.x = -Math.PI / 2;
  tub.add(water);
  
  // Add floating color powders
  const colors = [0xff3366, 0xffff33, 0x33ffff, 0xff33ff];
  
  for (let i = 0; i < 5; i++) {
    const powderGeometry = new THREE.CircleGeometry(0.1, 8);
    const powderMaterial = new THREE.MeshBasicMaterial({ 
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide
    });
    
    const powder = new THREE.Mesh(powderGeometry, powderMaterial);
    powder.position.set(
      (Math.random() - 0.5) * 1,
      0.76,
      (Math.random() - 0.5) * 1
    );
    powder.rotation.x = -Math.PI / 2;
    tub.add(powder);
  }
  
  return tub;
};

// Create water tubs/tanks and return their references
export const createWaterTubs = (scene: THREE.Scene, count: number): THREE.Group[] => {
  const tubs: THREE.Group[] = [];
  
  // Create tubs at more intentional, evenly distributed positions
  const positions = [
    { x: 8, z: 8 },    // Northeast
    { x: -8, z: 8 },   // Northwest
    { x: -8, z: -8 },  // Southwest
    { x: 8, z: -8 },   // Southeast
    { x: 0, z: 0 }     // Center
  ];
  
  for (let i = 0; i < count && i < positions.length; i++) {
    const tub = createWaterTub();
    
    // Add some visual enhancement to make tubs more noticeable
    
    // Add a glowing ring on the ground around the tub
    const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x33ccff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    tub.add(ring);
    
    // Make water surface pulse to draw attention
    (tub.children[1] as THREE.Mesh).userData.initialY = tub.children[1].position.y;
    (tub.children[1] as THREE.Mesh).userData.pulseSpeed = 0.001 + Math.random() * 0.001;
    (tub.children[1] as THREE.Mesh).userData.pulseTime = Math.random() * Math.PI * 2;
    
    // Animation function to make water surface pulse
    const animateWaterSurface = () => {
      const water = tub.children[1] as THREE.Mesh;
      water.userData.pulseTime += water.userData.pulseSpeed;
      water.position.y = water.userData.initialY + Math.sin(water.userData.pulseTime) * 0.05;
      
      requestAnimationFrame(animateWaterSurface);
    };
    
    animateWaterSurface();
    
    // Position tub
    const pos = positions[i];
    tub.position.set(pos.x, 0, pos.z);
    
    scene.add(tub);
    tubs.push(tub);
  }
  
  return tubs;
};

// Create NPCs for the game
export const createNPCs = (scene: THREE.Scene, count: number): NPC[] => {
  const npcs: NPC[] = [];
  
  for (let i = 0; i < count; i++) {
    const npc = new NPC(scene);
    
    // Set random position
    npc.setPosition(
      Math.random() * 20 - 10,
      0,
      Math.random() * 20 - 10
    );
    
    npcs.push(npc);
  }
  
  return npcs;
};

// Create water gun
export const createWaterGun = (scene: THREE.Scene, camera: THREE.PerspectiveCamera): THREE.Group => {
  const waterGun = new THREE.Group();
  
  // Gun body
  const bodyGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff3366,
    roughness: 0.2
  });
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.z = -0.4;
  waterGun.add(body);
  
  // Gun handle
  const handleGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.2);
  const handleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x6633ff,
    roughness: 0.3
  });
  
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(0, -0.25, -0.3);
  waterGun.add(handle);
  
  // Gun nozzle
  const nozzleGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 16);
  const nozzleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffff33,
    roughness: 0.1
  });
  
  const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 0.1;
  waterGun.add(nozzle);
  
  // Tank
  const tankGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
  const tankMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x33ffff,
    transparent: true,
    opacity: 0.7
  });
  
  const tank = new THREE.Mesh(tankGeometry, tankMaterial);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 0.1, -0.5);
  waterGun.add(tank);
  
  // Position the gun
  waterGun.position.copy(camera.position);
  waterGun.rotation.copy(camera.rotation);
  waterGun.translateZ(-1);
  waterGun.translateY(-0.5);
  waterGun.translateX(0.5);
  
  scene.add(waterGun);
  
  return waterGun;
};

// Create water balloons
export const createWaterBalloons = (scene: THREE.Scene, count: number): void => {
  // Will be implemented in the game mechanics
  // Placeholder for future implementation
};
