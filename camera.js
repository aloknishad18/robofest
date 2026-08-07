import * as THREE from 'three';

import { camera, controls, initialCameraPosition, initialTargetPosition } from './viewer.js';
import { componentData } from './componentData.js';

export function focusOnAssembly(assemblyKey, model) {
    const data = componentData[assemblyKey];
    if (!data || !data.subComponents) return;

    // 1. Calculate bounding box of all meshes in this assembly
    const box = new THREE.Box3();
    let found = false;

    model.traverse((child) => {
        if (child.isMesh) {
            for (const sub of data.subComponents) {
                if (sub.meshNames.some(name => child.name.toLowerCase().includes(name.toLowerCase()))) {
                    box.expandByObject(child);
                    found = true;
                    break;
                }
            }
        }
    });

    if (!found) return; // Fallback if no meshes match

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // 2. Calculate ideal camera distance
    const fov = camera.fov * (Math.PI / 180);
    // Get closer than 70% viewport for zoomed inspection (e.g. 50%)
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5; 

    // 3. Cinematic Orbit Angle
    // We want to look at the component from a 45 degree angle slightly above it
    const angleX = Math.PI / 4; // 45 degrees
    const angleY = Math.PI / 6; // 30 degrees up
    
    const targetCameraPos = new THREE.Vector3(
        center.x + Math.sin(angleX) * distance,
        center.y + Math.sin(angleY) * distance,
        center.z + Math.cos(angleX) * distance
    );

    // 4. Animate Camera Position
    gsap.to(camera.position, {
        x: targetCameraPos.x,
        y: targetCameraPos.y,
        z: targetCameraPos.z,
        duration: 2,
        ease: "power3.inOut"
    });

    // 5. Animate Target (OrbitControls center)
    gsap.to(controls.target, {
        x: center.x,
        y: center.y,
        z: center.z,
        duration: 2,
        ease: "power3.inOut",
        onUpdate: () => controls.update()
    });
}

export function resetCamera() {
    gsap.to(camera.position, {
        x: initialCameraPosition.x,
        y: initialCameraPosition.y,
        z: initialCameraPosition.z,
        duration: 1.5,
        ease: "power2.inOut"
    });

    gsap.to(controls.target, {
        x: initialTargetPosition.x,
        y: initialTargetPosition.y,
        z: initialTargetPosition.z,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => controls.update()
    });
}
