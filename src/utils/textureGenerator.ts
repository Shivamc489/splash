import * as THREE from 'three';

// Helper to check if we're in a browser environment with a document object
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Generates a cloud texture programmatically
 * @returns A canvas texture that can be used for clouds
 */
export function generateCloudTexture(): THREE.Texture {
  if (!isBrowser) {
    // Fallback for server-side rendering
    console.warn('Document not available, using fallback texture');
    const texture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 128]), // RGBA white with some transparency
      1, 1, 
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    return texture;
  }
  
  // Create a canvas for the cloud texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // Fill with transparent background
  context.fillStyle = 'rgba(255, 255, 255, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create a radial gradient for the cloud
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 3;
  
  // Draw multiple overlapping circles with varying opacity to create cloud effect
  for (let i = 0; i < 15; i++) {
    const offsetX = (Math.random() - 0.5) * canvas.width * 0.6;
    const offsetY = (Math.random() - 0.5) * canvas.height * 0.6;
    const size = radius * (0.5 + Math.random() * 0.5);
    const opacity = 0.6 + Math.random() * 0.2;
    
    const gradient = context.createRadialGradient(
      centerX + offsetX, centerY + offsetY, 0,
      centerX + offsetX, centerY + offsetY, size
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.8})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX + offsetX, centerY + offsetY, size, 0, Math.PI * 2);
    context.fill();
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Generates a simple color gradient texture
 * @param colorTop Top color of the gradient
 * @param colorBottom Bottom color of the gradient
 * @returns A canvas texture with a vertical gradient
 */
export function generateGradientTexture(colorTop: string, colorBottom: string): THREE.Texture {
  if (!isBrowser) {
    // Fallback for server-side rendering
    console.warn('Document not available, using fallback gradient texture');
    // Parse color to get RGB components
    const color = new THREE.Color(colorTop);
    const data = new Uint8Array([
      Math.floor(color.r * 255),
      Math.floor(color.g * 255), 
      Math.floor(color.b * 255), 
      255
    ]);
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  
  // Create gradient
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Generates a texture with random colored dots (for Holi powder)
 * @returns A canvas texture with colorful dots
 */
export function generateHoliPowderTexture(): THREE.Texture {
  if (!isBrowser) {
    // Fallback for server-side rendering
    console.warn('Document not available, using fallback powder texture');
    // Create a colorful fallback
    const data = new Uint8Array([255, 100, 200, 255]); // Pink
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // Fill with transparent background
  context.fillStyle = 'rgba(255, 255, 255, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Holi colors
  const colors = [
    '#ff3366', '#33ccff', '#ffcc33', '#ff33cc', '#33ffcc',
    '#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff'
  ];
  
  // Draw random colored dots
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 1 + Math.random() * 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Generates a texture for ground with some noise
 * @returns A canvas texture for ground
 */
export function generateGroundTexture(): THREE.Texture {
  if (!isBrowser) {
    // Fallback for server-side rendering
    console.warn('Document not available, using fallback ground texture');
    const data = new Uint8Array([145, 229, 95, 255]); // Green color
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.needsUpdate = true;
    return texture;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  
  // Base color
  context.fillStyle = '#91e55f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add noise
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 1 + Math.random() * 2;
    
    // Slightly darker or lighter than base color
    const variation = Math.random() > 0.5 ? 20 : -20;
    context.fillStyle = `rgb(${145 + variation}, ${229 + variation}, ${95 + variation})`;
    
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  
  return texture;
} 