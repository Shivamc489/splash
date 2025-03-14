
import * as THREE from 'three';

export class NPC {
  model: THREE.Group | null = null;
  scene: THREE.Scene;
  position: THREE.Vector3 = new THREE.Vector3();
  colorLevel: number = 0;
  isColored: boolean = false;
  moveDirection: THREE.Vector3 = new THREE.Vector3();
  moveSpeed: number = 0.02;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createModel();
    this.setRandomDirection();
  }
  
  createModel(): void {
    this.model = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.5
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    this.model.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffeedd,
      roughness: 0.5
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.35;
    head.castShadow = true;
    this.model.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.5
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(0.4, 0.8, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.castShadow = true;
    this.model.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(-0.4, 0.8, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.castShadow = true;
    this.model.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.5
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(0.15, 0.1, 0);
    leftLeg.castShadow = true;
    this.model.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(-0.15, 0.1, 0);
    rightLeg.castShadow = true;
    this.model.add(rightLeg);
    
    // Add to scene
    this.scene.add(this.model);
  }
  
  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    if (this.model) {
      this.model.position.copy(this.position);
    }
  }
  
  setRandomDirection(): void {
    this.moveDirection.set(
      Math.random() * 2 - 1,
      0,
      Math.random() * 2 - 1
    ).normalize();
  }
  
  update(): void {
    if (!this.model) return;
    
    // Move the NPC
    this.position.add(this.moveDirection.clone().multiplyScalar(this.moveSpeed));
    this.model.position.copy(this.position);
    
    // Make NPC look in the direction of movement
    if (this.moveDirection.length() > 0) {
      const lookTarget = this.position.clone().add(this.moveDirection);
      this.model.lookAt(lookTarget);
    }
    
    // Change direction randomly or when approaching boundaries
    if (Math.random() < 0.005 || 
        this.position.x > 15 || this.position.x < -15 ||
        this.position.z > 15 || this.position.z < -15) {
      this.setRandomDirection();
    }
    
    // Ensure NPC stays within boundaries
    if (this.position.x > 15) this.position.x = 15;
    if (this.position.x < -15) this.position.x = -15;
    if (this.position.z > 15) this.position.z = 15;
    if (this.position.z < -15) this.position.z = -15;
  }
  
  getColored(): void {
    if (!this.model || this.colorLevel >= 3) return;
    
    this.colorLevel++;
    this.isColored = true;
    
    // Apply color to the model based on colorLevel
    const colors = [0xff3366, 0x33ccff, 0xffcc33];
    const intensity = Math.min(this.colorLevel / 3, 1);
    
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Skip coloring the face and certain parts
        if (child === this.model?.children[1]) return; // Skip head
        
        // Mix original color with new color based on intensity
        const originalColor = new THREE.Color(child.material.color.getHex());
        const newColor = new THREE.Color(colors[this.colorLevel - 1]);
        
        child.material.color.set(
          originalColor.lerp(newColor, intensity)
        );
      }
    });
    
    // Create a splash effect
    this.createColorSplash();
  }
  
  createColorSplash(): void {
    if (!this.model) return;
    
    // Create splash particles
    const particles = new THREE.Group();
    const colors = [0xff3366, 0x33ccff, 0xffcc33, 0xff33cc, 0x33ffcc];
    
    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(this.position);
      particle.position.y += 0.8; // Center on the body
      
      // Add random velocity
      (particle as any).velocity = new THREE.Vector3(
        Math.random() * 0.1 - 0.05,
        Math.random() * 0.1,
        Math.random() * 0.1 - 0.05
      );
      
      particles.add(particle);
    }
    
    this.scene.add(particles);
    
    // Animate the particles
    const animateParticles = () => {
      particles.children.forEach(particle => {
        particle.position.add((particle as any).velocity);
        (particle as any).velocity.y -= 0.002; // gravity
        (particle as any).scale += -0.01; // shrink
        
        if ((particle as any).scale < 0.01) {
          particles.remove(particle);
        }
      });
      
      if (particles.children.length === 0) {
        clearInterval(animation);
        this.scene.remove(particles);
      }
    };
    
    const animation = setInterval(animateParticles, 16);
    
    // Remove after some time regardless
    setTimeout(() => {
      clearInterval(animation);
      this.scene.remove(particles);
    }, 2000);
  }
}
