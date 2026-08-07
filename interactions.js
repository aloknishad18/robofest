import * as THREE from 'three';


// Store references to animations so we can kill them on reset
let activeAnimations = [];
let activeParticles = [];

export function triggerComponentInteractions(assemblyKey, model, scene) {
    resetInteractions(model, scene);

    switch(assemblyKey) {
        case 'wheelAssembly':
            animateWheels(model);
            break;
        case 'upperCameraAssembly':
            animateCamera(model);
            break;
        case 'sprayNozzleAssembly':
            animateSprayCone(model, scene);
            break;
        case 'chassisAssembly':
            hideOuterShell(model);
            break;
        case 'motorAssembly':
            animateMotorShaft(model);
            break;
    }
}

function animateWheels(model) {
    model.traverse((child) => {
        if (child.isMesh && (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire'))) {
            // Spin wheel infinitely
            const anim = gsap.to(child.rotation, {
                x: child.rotation.x + Math.PI * 2,
                duration: 2,
                repeat: -1,
                ease: "none"
            });
            activeAnimations.push(anim);
        }
    });
}

function animateCamera(model) {
    model.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('mast')) {
            // Rotate mast 45 degrees
            const anim = gsap.to(child.rotation, {
                y: Math.PI / 4,
                duration: 1.5,
                ease: "power2.inOut"
            });
            activeAnimations.push(anim);
        }
        if (child.isMesh && child.name.toLowerCase().includes('lens')) {
            // Glow lens
            child.material = child.material.clone();
            const anim = gsap.to(child.material.emissive, {
                r: 0, g: 0.8, b: 1,
                duration: 0.5,
                yoyo: true,
                repeat: -1
            });
            child.material.emissiveIntensity = 0.8;
            activeAnimations.push(anim);
        }
    });
}

function animateSprayCone(model, scene) {
    // Find nozzle position
    let nozzlePos = new THREE.Vector3();
    model.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('nozzle')) {
            child.getWorldPosition(nozzlePos);
        }
    });

    if (nozzlePos.lengthSq() === 0) return; // Not found

    // Create a synthetic spray cone
    const geometry = new THREE.ConeGeometry( 0.5, 1.5, 32 );
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00C2FF, 
        transparent: true, 
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const cone = new THREE.Mesh(geometry, material);
    
    // Position below nozzle
    cone.position.copy(nozzlePos);
    cone.position.y -= 0.75; // Half height
    
    scene.add(cone);
    activeParticles.push(cone);

    // Animate spray pulse
    const anim = gsap.to(cone.material, {
        opacity: 0.8,
        duration: 0.1,
        yoyo: true,
        repeat: -1
    });
    activeAnimations.push(anim);
}

function hideOuterShell(model) {
    model.traverse((child) => {
        if (child.isMesh && (child.name.toLowerCase().includes('panel') || child.name.toLowerCase().includes('cover'))) {
            gsap.to(child.material, {
                opacity: 0,
                duration: 1,
                onComplete: () => { child.visible = false; }
            });
        }
    });
}

function animateMotorShaft(model) {
    model.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('shaft')) {
            const anim = gsap.to(child.rotation, {
                z: child.rotation.z + Math.PI * 2,
                duration: 0.5,
                repeat: -1,
                ease: "none"
            });
            activeAnimations.push(anim);
        }
    });
}

export function resetInteractions(model, scene) {
    // Kill all GSAP tweens on specific parts
    activeAnimations.forEach(anim => anim.kill());
    activeAnimations = [];

    // Remove synthetic particles (like spray cone)
    activeParticles.forEach(p => scene.remove(p));
    activeParticles = [];

    // Restore visibilities (like outer shell)
    model.traverse((child) => {
        if (child.isMesh) {
            child.visible = true;
        }
    });
}

export function createHolographicReticle(model, scene, boundingBox) {
    if (activeParticles.length > 0) {
        // We can reuse activeParticles for reticles to clean them up on reset
    }

    const reticleGroup = new THREE.Group();
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    reticleGroup.position.copy(center);
    
    // 1. Rotating scanning ring
    const ringGeo = new THREE.TorusGeometry(maxDim * 0.6, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.5,
        wireframe: true 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    reticleGroup.add(ring);
    
    gsap.to(ring.rotation, {
        z: Math.PI * 2,
        duration: 10,
        repeat: -1,
        ease: "linear"
    });

    // 2. Bounding Box Corners
    const cornerGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const cornerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    
    const extents = [
        [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1],
        [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]
    ];
    
    extents.forEach(ext => {
        const corner = new THREE.Mesh(cornerGeo, cornerMat);
        corner.position.set(
            (size.x / 2 + 0.1) * ext[0],
            (size.y / 2 + 0.1) * ext[1],
            (size.z / 2 + 0.1) * ext[2]
        );
        reticleGroup.add(corner);
        
        // Pulse corner
        gsap.to(corner.scale, {
            x: 1.5, y: 1.5, z: 1.5,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut"
        });
    });

    scene.add(reticleGroup);
    activeParticles.push(reticleGroup); // So it gets cleaned up by resetInteractions
}
