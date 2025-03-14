import * as THREE from 'three';

export const createScene = (): THREE.Scene => {
  console.log("Creating scene");
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Light blue sky
  
  // Add basic lighting directly to the scene during creation
  // This ensures we always have some light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 10, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Add fog for depth
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);
  
  console.log("Scene created with basic lighting");
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
  console.log("Creating renderer, container:", container);
  
  try {
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true // Allow transparency
    });
    
    console.log("WebGLRenderer created successfully");
    
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
    
    console.log("Renderer canvas added to container");
    
    // Verify the canvas is added correctly
    const canvasElements = container.getElementsByTagName('canvas');
    console.log(`Canvas elements in container: ${canvasElements.length}`);
    
    return renderer;
  } catch (error) {
    console.error("Error creating renderer:", error);
    throw error;
  }
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
