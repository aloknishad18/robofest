import { camera, controls, initialCameraPosition, initialTargetPosition } from './viewer.js';

export function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    const leftPanel = document.getElementById('left-panel');
    const bottomPanel = document.getElementById('bottom-panel');
    const bottomToolbar = document.getElementById('bottom-toolbar');
    
    gsap.to(loader, {
        opacity: 0,
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => {
            loader.style.display = 'none';

            // Slide in left panel
            gsap.to(leftPanel, {
                x: 0,
                opacity: 1,
                duration: 1,
                delay: 0.2,
                ease: "power3.out"
            });
            
            // Slide up bottom panel
            gsap.to(bottomPanel, {
                y: 0,
                opacity: 1,
                duration: 1,
                delay: 0.4,
                ease: "power3.out"
            });
            
            // Fade in bottom toolbar
            gsap.to(bottomToolbar, {
                opacity: 1,
                duration: 1,
                delay: 0.6,
                ease: "power3.out"
            });
            
            // Animate Camera from far away into the calculated perfect framing position
            gsap.to(camera.position, {
                x: initialCameraPosition.x,
                y: initialCameraPosition.y,
                z: initialCameraPosition.z,
                duration: 2.5,
                ease: "power4.out"
            });
            
            gsap.to(controls.target, {
                x: initialTargetPosition.x,
                y: initialTargetPosition.y,
                z: initialTargetPosition.z,
                duration: 2.5,
                ease: "power4.out",
                onUpdate: () => controls.update()
            });
        }
    });
}

export function openSectionModal(contentHtml) {
    // Legacy support if needed, but not heavily used in cinematic HUD
}

export function closeSectionModal() {
    // Legacy support if needed
}
