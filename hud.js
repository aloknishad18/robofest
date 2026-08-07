import * as THREE from 'three';
import { camera, renderer } from './viewer.js';

let activeLabels = [];
let svgContainer = null;
const repulsionForce = 0.5;
const centerPullForce = 0.05;

// Create SVG layer for bezier curves
function initSVG() {
    if (svgContainer) return;
    const container = document.getElementById('canvas-container');
    svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.setAttribute('id', 'hud-svg-layer');
    container.appendChild(svgContainer);
}

export function spawnHUDLabels(assemblyData, model) {
    clearHUD();
    initSVG();
    
    if (!assemblyData.subComponents) return;
    
    assemblyData.subComponents.forEach((sub, index) => {
        // Find meshes for this sub-component
        let targetMeshes = [];
        model.traverse((child) => {
            if (child.isMesh && sub.meshNames.some(name => child.name.toLowerCase().includes(name.toLowerCase()))) {
                targetMeshes.push(child);
            }
        });

        if (targetMeshes.length > 0) {
            // Calculate center of this sub-component
            const box = new THREE.Box3();
            targetMeshes.forEach(m => box.expandByObject(m));
            const center = box.getCenter(new THREE.Vector3());

            createSmartLabel(sub, center, index, assemblyData.id);
        }
    });
}

function createSmartLabel(subData, worldPos, index, parentId) {
    const container = document.getElementById('canvas-container');
    
    // 1. Create the anchor dot
    const anchor = document.createElement('div');
    anchor.className = 'smart-anchor';
    container.appendChild(anchor);

    // 2. Create the label box
    const labelBox = document.createElement('div');
    labelBox.className = 'smart-label-box';
    labelBox.innerHTML = `
        <div class="smart-label-number">${subData.id}</div>
        <div class="smart-label-text">${subData.name}</div>
    `;
    
    // Offset label initially in a circle around the center
    const angle = (index / 5) * Math.PI * 2;
    const distance = 150; // pixels
    
    container.appendChild(labelBox);

    // 3. Create the SVG Bezier path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "leader-line");
    svgContainer.appendChild(path);

    // Interactive Hover
    labelBox.addEventListener('mouseenter', () => {
        path.classList.add('highlight');
        // Dispatch event so interactions.js can highlight the mesh
        document.dispatchEvent(new CustomEvent('labelHover', { detail: subData.id }));
    });
    labelBox.addEventListener('mouseleave', () => {
        path.classList.remove('highlight');
        document.dispatchEvent(new CustomEvent('labelLeave', { detail: subData.id }));
    });
    
    // Click updates info panel
    labelBox.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('labelClick', { detail: subData }));
    });

    activeLabels.push({
        worldPos: worldPos,
        anchorEl: anchor,
        labelEl: labelBox,
        pathEl: path,
        screenX: 0,
        screenY: 0,
        targetX: window.innerWidth / 2 + Math.cos(angle) * distance,
        targetY: window.innerHeight / 2 + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        id: subData.id
    });
}

export function updateHUD() {
    if (activeLabels.length === 0) return;
    
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    // 1. Update 3D anchors to 2D screen space
    activeLabels.forEach(label => {
        const vector = label.worldPos.clone();
        vector.project(camera);
        
        label.screenX = (vector.x * widthHalf) + widthHalf;
        label.screenY = -(vector.y * heightHalf) + heightHalf;
        
        // Hide if behind camera
        if (vector.z > 1) {
            label.anchorEl.style.display = 'none';
            label.labelEl.style.display = 'none';
            label.pathEl.style.display = 'none';
            return;
        } else {
            label.anchorEl.style.display = 'block';
            label.labelEl.style.display = 'flex';
            label.pathEl.style.display = 'block';
        }

        label.anchorEl.style.left = `${label.screenX}px`;
        label.anchorEl.style.top = `${label.screenY}px`;
    });

    // 2. Physics simulation for label repulsion (Anti-overlap)
    for (let i = 0; i < activeLabels.length; i++) {
        let l1 = activeLabels[i];
        
        // Pull towards anchor
        const dxAnchor = l1.screenX - l1.targetX;
        const dyAnchor = l1.screenY - l1.targetY;
        const distAnchor = Math.sqrt(dxAnchor*dxAnchor + dyAnchor*dyAnchor);
        
        // Want to maintain a certain distance (e.g., 100px) from anchor
        if (distAnchor > 150) {
            l1.vx += (dxAnchor / distAnchor) * 0.1;
            l1.vy += (dyAnchor / distAnchor) * 0.1;
        } else if (distAnchor < 80) {
            l1.vx -= (dxAnchor / distAnchor) * 0.2;
            l1.vy -= (dyAnchor / distAnchor) * 0.2;
        }

        // Repel from other labels
        for (let j = i + 1; j < activeLabels.length; j++) {
            let l2 = activeLabels[j];
            const dx = l2.targetX - l1.targetX;
            const dy = l2.targetY - l1.targetY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 120 && dist > 0) { // Overlapping
                const f = (120 - dist) * repulsionForce;
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;
                
                l1.vx -= fx;
                l1.vy -= fy;
                l2.vx += fx;
                l2.vy += fy;
            }
        }
        
        // Damping and integration
        l1.vx *= 0.8;
        l1.vy *= 0.8;
        l1.targetX += l1.vx;
        l1.targetY += l1.vy;
        
        // Keep inside bounds
        l1.targetX = Math.max(100, Math.min(window.innerWidth - 100, l1.targetX));
        l1.targetY = Math.max(100, Math.min(window.innerHeight - 100, l1.targetY));

        l1.labelEl.style.left = `${l1.targetX}px`;
        l1.labelEl.style.top = `${l1.targetY}px`;

        // 3. Draw Bezier Curve
        // Anchor point
        const startX = l1.screenX;
        const startY = l1.screenY;
        // Label point (center left of the box)
        const endX = l1.targetX; 
        const endY = l1.targetY;
        
        // Control points for a smooth curve
        const cp1X = startX + (endX - startX) * 0.5;
        const cp1Y = startY;
        const cp2X = startX + (endX - startX) * 0.5;
        const cp2Y = endY;

        const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
        l1.pathEl.setAttribute('d', d);
    }
}

export function clearHUD() {
    activeLabels.forEach(l => {
        l.anchorEl.remove();
        l.labelEl.remove();
        l.pathEl.remove();
    });
    activeLabels = [];
}
