
import * as THREE from 'three';

export const createScene = (): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Light blue sky
  
  // Add fog for depth
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);
  
  return scene;
};

export const createCamera = (): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );
  
  // Set initial position
  camera.position.set(0, 1.7, 5); // Eye level for typical human
  
  return camera;
};

export const createRenderer = (container: HTMLDivElement): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Clear any existing canvas before adding new one
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  container.appendChild(renderer.domElement);
  
  console.log("Renderer created and added to container");
  
  return renderer;
};

export const createFloor = (scene: THREE.Scene): void => {
  // Create a ground plane
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.8,
  });
  
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  floor.receiveShadow = true;
  
  scene.add(floor);
};

export const createSkybox = (scene: THREE.Scene): void => {
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    '/skybox/px.jpg', '/skybox/nx.jpg',
    '/skybox/py.jpg', '/skybox/ny.jpg',
    '/skybox/pz.jpg', '/skybox/nz.jpg',
  ]);
  
  scene.background = texture;
};
