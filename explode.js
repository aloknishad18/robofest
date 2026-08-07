import * as THREE from 'three';
import { componentData } from './componentData.js';
import { spawnHUDLabels, clearHUD } from './hud.js';

let isExploded = false;
let currentExplodedMeshes = [];
let originalMaterials = new Map();

export function intelligentExplode(assemblyKey, model) {
    if (isExploded) resetExplode(model);
    
    const data = componentData[assemblyKey];
    if (!data || !data.subComponents) return;

    // Spawn HUD Labels in advance
    spawnHUDLabels(data, model);

    // Darken Background slightly via CSS
    document.getElementById('canvas-container').style.filter = 'brightness(0.7)';

    model.traverse((child) => {
        if (child.isMesh) {
            // Store original material state if not already stored
            if (!originalMaterials.has(child.uuid)) {
                if (Array.isArray(child.material)) {
                    originalMaterials.set(child.uuid, {
                        isArray: true,
                        materials: child.material.map(m => m.clone()),
                        transparents: child.material.map(m => m.transparent),
                        opacities: child.material.map(m => m.opacity)
                    });
                } else {
                    originalMaterials.set(child.uuid, {
                        isArray: false,
                        material: child.material.clone(),
                        transparent: child.material.transparent,
                        opacity: child.material.opacity
                    });
                }
            }

            // Determine if this mesh is part of the selected assembly
            let matchedSub = null;
            for (const sub of data.subComponents) {
                if (sub.meshNames.some(name => child.name.toLowerCase().includes(name.toLowerCase()))) {
                    matchedSub = sub;
                    break;
                }
            }

            if (matchedSub) {
                // This is an active component
                // Add glowing outline (emissive)
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => {
                        const clone = m.clone();
                        clone.emissive = new THREE.Color(0x00C2FF);
                        clone.emissiveIntensity = 0.2;
                        return clone;
                    });
                } else {
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0x00C2FF);
                    child.material.emissiveIntensity = 0.2;
                }

                // Animate Explosion (Using a small procedural bump since we removed explodeVector from componentData)
                if (!child.userData.originalPosition) {
                    child.userData.originalPosition = child.position.clone();
                }

                // Push outwards slightly from center of model
                const dir = child.position.clone().normalize();
                const targetPos = child.userData.originalPosition.clone().add(dir.multiplyScalar(0.2));

                gsap.to(child.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.5,
                    ease: "elastic.out(1, 0.5)",
                    delay: Math.random() * 0.2 // Stagger
                });

                currentExplodedMeshes.push(child);
            } else {
                // Non-selected component - make 15% transparent and darker
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => {
                        const clone = m.clone();
                        clone.transparent = true;
                        gsap.to(clone, { opacity: 0.15, duration: 0.5 });
                        if (clone.color) clone.color.lerp(new THREE.Color(0x111111), 0.5);
                        return clone;
                    });
                } else {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    
                    // Animate fade
                    gsap.to(child.material, { opacity: 0.15, duration: 0.5 });
                    if (child.material.color) child.material.color.lerp(new THREE.Color(0x111111), 0.5);
                }
            }
        }
    });

    isExploded = true;
}

export function resetExplode(model) {
    if (!isExploded) return;

    document.getElementById('canvas-container').style.filter = 'none';
    clearHUD();

    model.traverse((child) => {
        if (child.isMesh) {
            // Restore position
            if (child.userData.originalPosition) {
                gsap.to(child.position, {
                    x: child.userData.originalPosition.x,
                    y: child.userData.originalPosition.y,
                    z: child.userData.originalPosition.z,
                    duration: 1.0,
                    ease: "power3.inOut"
                });
            }

            // Restore material
            if (originalMaterials.has(child.uuid)) {
                const orig = originalMaterials.get(child.uuid);
                
                if (orig.isArray) {
                    child.material.forEach((mat, i) => {
                        gsap.to(mat, {
                            opacity: orig.opacities[i],
                            duration: 0.5,
                            onComplete: () => {
                                child.material = orig.materials;
                                child.material[i].transparent = orig.transparents[i];
                            }
                        });
                    });
                } else {
                    gsap.to(child.material, {
                        opacity: orig.opacity,
                        duration: 0.5,
                        onComplete: () => {
                            child.material = orig.material;
                            child.material.transparent = orig.transparent;
                        }
                    });
                }
            }
        }
    });

    currentExplodedMeshes = [];
    isExploded = false;
}
