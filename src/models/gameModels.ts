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
    
    // Array of skin tones (ranging from lighter to darker)
    const skinTones = [
      0xffe0bd, // Light
      0xf1c27d, // Light tan
      0xe0ac69, // Medium-light
      0xc68642, // Medium
      0x8d5524, // Medium-dark
      0x503335, // Dark
    ];
    
    // Array of clothing colors
    const clothingColors = [
      0xff5555, // Red
      0x55ff55, // Green
      0x5555ff, // Blue
      0xffff55, // Yellow
      0xff55ff, // Pink
      0x55ffff, // Cyan
      0xff9955, // Orange
      0x9955ff, // Purple
      0xf5f5f5, // White
      0x555555, // Gray
    ];
    
    // Select random skin tone
    const skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
    
    // Random clothing colors
    const topColor = clothingColors[Math.floor(Math.random() * clothingColors.length)];
    const bottomColor = clothingColors[Math.floor(Math.random() * clothingColors.length)];
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: topColor,
      roughness: 0.5
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    this.model.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: skinTone,
      roughness: 0.5
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.35;
    head.castShadow = true;
    this.model.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: skinTone,
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
      color: bottomColor,
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
  
  getColored(hitPoint?: THREE.Vector3): void {
    if (!this.model || this.colorLevel >= 3) return;
    
    this.colorLevel++;
    this.isColored = true;
    
    // Only create a splash effect at the impact point
    if (hitPoint) {
      this.createColorSplash(hitPoint);
    } else {
      // Fallback to center if no hit point provided
      this.createColorSplash(this.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
    }
  }
  
  createColorSplash(hitPoint: THREE.Vector3): void {
    if (!this.model) return;
    
    // Create splash particles
    const particles = new THREE.Group();
    const colors = [0xff3366, 0x33ccff, 0xffcc33, 0xff33cc, 0x33ffcc];
    
    // Create more particles for a better splash effect
    for (let i = 0; i < 30; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particles at the hit point
      particle.position.copy(hitPoint);
      
      // Add random velocity - use userData for type safety
      particle.userData.velocity = new THREE.Vector3(
        Math.random() * 0.15 - 0.075,
        Math.random() * 0.15,
        Math.random() * 0.15 - 0.075
      );
      
      particles.add(particle);
    }
    
    // Create permanent color splash marks on the NPC at the impact point
    this.createPermanentSplashMarks(hitPoint, colors);
    
    this.scene.add(particles);
    
    // Animate the particles
    const animateParticles = () => {
      particles.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData.velocity) {
          // Update position
          child.position.add(child.userData.velocity);
          
          // Apply gravity
          child.userData.velocity.y -= 0.002;
          
          // Scale down particles over time
          if (!child.userData.scale) {
            child.userData.scale = 1.0;
          } else {
            child.userData.scale *= 0.97;
            child.scale.set(
              child.userData.scale,
              child.userData.scale,
              child.userData.scale
            );
            
            if (child.userData.scale < 0.01) {
              particles.remove(child);
            }
          }
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
  
  // Create permanent color splash marks on the NPC
  private createPermanentSplashMarks(hitPoint: THREE.Vector3, colors: number[]): void {
    if (!this.model) return;
    
    // Create different types of splash marks for variety
    
    // 1. Circular splatter spots
    this.createCircularSplatterSpots(hitPoint, colors);
    
    // 2. Dripping color effect (optional)
    if (Math.random() > 0.3) {
      this.createDrippingEffect(hitPoint, colors);
    }
  }
  
  // Create circular splatter spots around the hit point
  private createCircularSplatterSpots(hitPoint: THREE.Vector3, colors: number[]): void {
    if (!this.model) return;
    
    // Make more spots for better visibility
    const spotCount = Math.floor(Math.random() * 5) + 5; // 5-9 spots
    
    // Convert the hit point from world space to the NPC's local space
    const localHitPoint = this.model.worldToLocal(hitPoint.clone());
    console.log(`Hit point in world space: ${hitPoint.x.toFixed(2)}, ${hitPoint.y.toFixed(2)}, ${hitPoint.z.toFixed(2)}`);
    console.log(`Hit point in NPC local space: ${localHitPoint.x.toFixed(2)}, ${localHitPoint.y.toFixed(2)}, ${localHitPoint.z.toFixed(2)}`);
    
    for (let i = 0; i < spotCount; i++) {
      // Randomize size for more natural look - make them larger
      const size = 0.07 + Math.random() * 0.12;
      const spotGeometry = new THREE.CircleGeometry(size, 16);
      const spotMaterial = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      
      const spot = new THREE.Mesh(spotGeometry, spotMaterial);
      
      // Create smaller random offsets to keep splashes closer to the hit point
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      
      // Position spot at local hit point with offset
      spot.position.copy(localHitPoint.clone().add(offset));
      
      // Find the closest body part to this position for better mapping
      const closestBodyPartIndex = this.findClosestBodyPart(spot.position);
      
      if (closestBodyPartIndex >= 0) {
        // Add the spot to the specific body part instead of the whole model
        const bodyPart = this.model.children[closestBodyPartIndex] as THREE.Mesh;
        
        // Convert to body part's local space
        const bodyPartLocalPos = bodyPart.worldToLocal(this.model.localToWorld(spot.position.clone()));
        spot.position.copy(bodyPartLocalPos);
        
        // Create rotation to align with the surface
        // For cylindrical parts, orient perpendicular to the radial direction
        // For spherical parts, orient along the radius
        
        // Step 1: Define an "up" vector based on the geometry
        const upVector = new THREE.Vector3(0, 1, 0);
        let normalVector = new THREE.Vector3(0, 1, 0);
        
        if (bodyPart.geometry instanceof THREE.CylinderGeometry) {
          // For cylindrical parts, normal points outward from the center axis
          normalVector.set(spot.position.x, 0, spot.position.z).normalize();
        } else if (bodyPart.geometry instanceof THREE.SphereGeometry) {
          // For spherical parts, normal is along the radius
          normalVector.copy(spot.position).normalize();
        }
        
        // Step 2: Create a quaternion that rotates from (0,1,0) to the normal vector
        const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normalVector);
        
        // Step 3: Apply the quaternion to the spot
        spot.quaternion.copy(quaternion);
        
        // Step 4: Add a small random rotation around the normal axis for variety
        const randomRotation = new THREE.Euler(
          Math.random() * Math.PI * 2, // Random rotation around X
          Math.random() * Math.PI * 2, // Random rotation around Y
          0                            // No Z rotation
        );
        const randomQuaternion = new THREE.Quaternion().setFromEuler(randomRotation);
        spot.quaternion.multiply(randomQuaternion);
        
        // Add a small offset to prevent z-fighting
        spot.position.add(normalVector.multiplyScalar(0.003));
        
        // Log for debugging
        console.log(`Added spot to body part ${closestBodyPartIndex} at local position: ${spot.position.x.toFixed(2)}, ${spot.position.y.toFixed(2)}, ${spot.position.z.toFixed(2)}`);
        
        bodyPart.add(spot);
      } else {
        // Fallback: add to model directly
        console.log("Using fallback: Adding spot directly to model");
        this.model.add(spot);
      }
    }
  }
  
  // Create dripping effect below the hit point
  private createDrippingEffect(hitPoint: THREE.Vector3, colors: number[]): void {
    if (!this.model) return;
    
    // Convert the hit point from world space to the NPC's local space
    const localHitPoint = this.model.worldToLocal(hitPoint.clone());
    
    // More drips for visibility
    const dripsCount = Math.floor(Math.random() * 3) + 1; // 1-3 drips
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Find the closest body part to add drips to
    const closestBodyPartIndex = this.findClosestBodyPart(localHitPoint);
    if (closestBodyPartIndex < 0) return;
    
    const bodyPart = this.model.children[closestBodyPartIndex] as THREE.Mesh;
    
    // Convert to body part's local space
    const bodyPartLocalPos = bodyPart.worldToLocal(this.model.localToWorld(localHitPoint.clone()));
    
    for (let i = 0; i < dripsCount; i++) {
      const drip = new THREE.Group();
      
      // Main drip line - make it wider and longer
      const height = 0.15 + Math.random() * 0.2; // Shorter drip to avoid floating
      const dripGeometry = new THREE.PlaneGeometry(0.05, height); // Wider drip
      const dripMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9, // More visible
        side: THREE.DoubleSide
      });
      
      const dripMesh = new THREE.Mesh(dripGeometry, dripMaterial);
      dripMesh.position.y = -height / 2;
      drip.add(dripMesh);
      
      // Drip end (larger circle)
      const dropGeometry = new THREE.CircleGeometry(0.07, 8); // Larger drop
      const dropMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9, // More visible
        side: THREE.DoubleSide
      });
      
      const dropMesh = new THREE.Mesh(dropGeometry, dropMaterial);
      dropMesh.position.y = -height;
      drip.add(dropMesh);
      
      // Position with small random offset
      const posWithOffset = bodyPartLocalPos.clone();
      posWithOffset.x += (Math.random() - 0.5) * 0.1;
      posWithOffset.z += (Math.random() - 0.5) * 0.1;
      drip.position.copy(posWithOffset);
      
      // Define gravity direction (world down)
      const worldDown = new THREE.Vector3(0, -1, 0);
      
      // Convert world down to local space of the body part
      const worldMatrix = new THREE.Matrix4().extractRotation(bodyPart.matrixWorld);
      const localDown = worldDown.clone().applyMatrix4(worldMatrix.invert());
      
      // Modify down direction based on body part shape
      if (bodyPart.geometry instanceof THREE.CylinderGeometry) {
        // For cylindrical parts, use a direction that combines
        // radial outward movement with downward movement
        const radialOut = new THREE.Vector3(drip.position.x, 0, drip.position.z).normalize();
        localDown.add(radialOut.multiplyScalar(0.3)).normalize();
      } else if (bodyPart.geometry instanceof THREE.SphereGeometry) {
        // For spherical parts, combine outward radial direction with down
        const radialOut = drip.position.clone().normalize();
        localDown.add(radialOut.multiplyScalar(0.3)).normalize();
      }
      
      // Set the up vector to be opposite of the final down direction
      const upVector = new THREE.Vector3(0, 1, 0);
      const targetVector = localDown.clone().negate();
      
      // Create quaternion that rotates from up to target vector
      const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, targetVector.normalize());
      drip.quaternion.copy(quaternion);
      
      // Add a small offset to prevent z-fighting
      const normal = drip.position.clone().normalize();
      drip.position.add(normal.multiplyScalar(0.01));
      
      // Log for debugging
      console.log(`Added drip to body part ${closestBodyPartIndex} at ${drip.position.x.toFixed(2)}, ${drip.position.y.toFixed(2)}, ${drip.position.z.toFixed(2)}`);
      
      bodyPart.add(drip);
    }
  }
  
  // Helper method to find the closest body part to a given local position
  private findClosestBodyPart(localPosition: THREE.Vector3): number {
    if (!this.model || this.model.children.length === 0) return -1;
    
    let closestIndex = -1;
    let minDistance = Infinity;
    
    // Check each child (body parts) to find the closest one
    this.model.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const distance = child.position.distanceTo(localPosition);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });
    
    return closestIndex;
  }
}
