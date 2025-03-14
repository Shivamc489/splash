import * as THREE from 'three';
import { generateGroundTexture } from './textureGenerator';

// Check for browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Map generation parameters
interface MapConfig {
  size: number;
  terrainRoughness: number;
  obstacleCount: number;
  decorationDensity: number;
  waterTubCount: number;
}

// Default map configuration
const DEFAULT_MAP_CONFIG: MapConfig = {
  size: 30, // Map size (30x30 units)
  terrainRoughness: 0.8, // How rough/varied the terrain is
  obstacleCount: 15, // Number of obstacles
  decorationDensity: 0.1, // Density of decorations (0-1)
  waterTubCount: 5, // Number of water tubs
};

// Generate a procedural map with terrain, obstacles, and decorations
export function generateProceduralMap(
  scene: THREE.Scene, 
  config: Partial<MapConfig> = {}
): {
  ground: THREE.Mesh;
  obstacles: THREE.Object3D[];
  decorations: THREE.Object3D[];
  waterTubs: THREE.Group[];
} {
  // Merge provided config with defaults
  const mapConfig: MapConfig = { ...DEFAULT_MAP_CONFIG, ...config };
  
  // Create collections for generated objects
  const obstacles: THREE.Object3D[] = [];
  const decorations: THREE.Object3D[] = [];
  const waterTubs: THREE.Group[] = [];
  
  // Generate terrain
  const ground = generateTerrain(scene, mapConfig);
  
  // Generate obstacles
  generateObstacles(scene, mapConfig, obstacles);
  
  // Generate decorations
  generateDecorations(scene, mapConfig, decorations);
  
  // Generate water tubs
  generateWaterTubs(scene, mapConfig, waterTubs, obstacles);
  
  return {
    ground,
    obstacles,
    decorations,
    waterTubs
  };
}

// Simplify the ground generation function for easier debugging
function generateTerrain(scene: THREE.Scene, config: MapConfig): THREE.Mesh {
  console.log("Generating simplified terrain with config:", config);
  
  // Create a simple flat ground
  const groundGeometry = new THREE.PlaneGeometry(config.size, config.size, 32, 32);
  
  // Create a simple material without relying on the texture generator
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x91e55f, // Green for grass
    roughness: 0.8,
    metalness: 0.1,
    flatShading: false,
  });
  
  console.log("Ground material created:", groundMaterial);
  
  // Create ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.receiveShadow = true;
  ground.name = "GroundPlane";
  
  // Add ground to scene
  scene.add(ground);
  console.log("Ground added to scene");
  
  return ground;
}

// Simplify obstacle generation
function generateObstacles(scene: THREE.Scene, config: MapConfig, obstacles: THREE.Object3D[]): void {
  console.log("Generating simplified obstacles");
  
  // Create simple walls
  for (let i = 0; i < 5; i++) {
    const wallGeometry = new THREE.BoxGeometry(3, 1.5, 0.3);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0c9a6,
      roughness: 0.9,
    });
    
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    
    // Position in a pentagon shape around the center
    const angle = (i / 5) * Math.PI * 2;
    const radius = config.size / 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    wall.position.set(x, 0.75, z);
    wall.rotation.y = angle + Math.PI/2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.name = `Wall_${i}`;
    
    scene.add(wall);
    obstacles.push(wall);
    console.log(`Added wall at (${x}, 0.75, ${z})`);
  }
}

// Simplify decoration generation
function generateDecorations(scene: THREE.Scene, config: MapConfig, decorations: THREE.Object3D[]): void {
  console.log("Generating simplified decorations");
  
  // Create simple colored blocks as decorations
  const colors = [0xff5555, 0x55ff55, 0x5555ff, 0xffff55, 0xff55ff, 0x55ffff];
  
  for (let i = 0; i < 10; i++) {
    const size = 0.5 + Math.random() * 0.5;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      roughness: 0.7,
    });
    
    const decoration = new THREE.Mesh(geometry, material);
    
    // Position randomly but away from center
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * (config.size/2 - 7);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    decoration.position.set(x, size/2, z);
    decoration.castShadow = true;
    decoration.receiveShadow = true;
    decoration.name = `Decoration_${i}`;
    
    scene.add(decoration);
    decorations.push(decoration);
    console.log(`Added decoration at (${x}, ${size/2}, ${z})`);
  }
}

// Generate water tubs for refilling
function generateWaterTubs(
  scene: THREE.Scene, 
  config: MapConfig, 
  waterTubs: THREE.Group[],
  obstacles: THREE.Object3D[]
): void {
  for (let i = 0; i < config.waterTubCount; i++) {
    const tubGroup = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.7, 0.8, 0.3, 12);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.8,
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    tubGroup.add(base);
    
    // Tub
    const tubGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 12);
    const tubMaterial = new THREE.MeshStandardMaterial({
      color: 0x5599ff,
      roughness: 0.3,
      metalness: 0.5,
    });
    
    const tub = new THREE.Mesh(tubGeometry, tubMaterial);
    tub.position.y = 0.7;
    tub.castShadow = true;
    tubGroup.add(tub);
    
    // Water surface
    const waterGeometry = new THREE.CircleGeometry(0.58, 12);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x33ccff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = 1.0;
    water.rotation.x = -Math.PI / 2;
    tubGroup.add(water);
    
    // Position the tub at a reasonable distance from other obstacles
    let validPosition = false;
    let attempts = 0;
    let x, z;
    
    while (!validPosition && attempts < 50) {
      attempts++;
      
      // Try to position near the edges for better gameplay
      const edgeFactor = 0.7;
      if (Math.random() > 0.5) {
        // Position along x-axis
        x = (Math.random() > 0.5 ? 1 : -1) * config.size/2 * edgeFactor;
        z = (Math.random() * config.size - config.size/2) * 0.6;
      } else {
        // Position along z-axis
        x = (Math.random() * config.size - config.size/2) * 0.6;
        z = (Math.random() > 0.5 ? 1 : -1) * config.size/2 * edgeFactor;
      }
      
      // Check distance from other obstacles
      validPosition = true;
      for (const obstacle of obstacles) {
        const dx = obstacle.position.x - x;
        const dz = obstacle.position.z - z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance < 3) {
          validPosition = false;
          break;
        }
      }
      
      // Also check distance from other water tubs
      for (const tub of waterTubs) {
        const dx = tub.position.x - x;
        const dz = tub.position.z - z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance < 10) { // Keep water tubs well-spaced
          validPosition = false;
          break;
        }
      }
    }
    
    // If we couldn't find a valid position, use a fallback
    if (!validPosition) {
      const angle = (i / config.waterTubCount) * Math.PI * 2;
      x = Math.cos(angle) * config.size * 0.4;
      z = Math.sin(angle) * config.size * 0.4;
    }
    
    tubGroup.position.set(x, 0, z);
    
    scene.add(tubGroup);
    waterTubs.push(tubGroup);
  }
} 