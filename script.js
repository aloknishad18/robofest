import { initViewer, getModel, getScene } from './viewer.js';
import { hideLoadingScreen } from './animations.js';
import { componentData } from './componentData.js';
import { openInfoPanel, setupInfoPanel, closeInfoPanel } from './infoPanel.js';
import { intelligentExplode, resetExplode } from './explode.js';
import { triggerComponentInteractions, resetInteractions, createHolographicReticle } from './interactions.js';
import { focusOnAssembly, resetCamera } from './camera.js';
import * as THREE from 'three';
import { camera } from './viewer.js';

let activeAssemblyKey = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Loading Events first to catch immediate cached loads
    document.addEventListener('modelProgress', (e) => {
        const percent = e.detail;
        document.getElementById('loading-bar').style.width = `${percent}%`;
        document.getElementById('loading-text').innerText = `${percent}%`;
    });

    document.addEventListener('modelLoaded', () => {
        document.getElementById('loading-bar').style.width = `100%`;
        document.getElementById('loading-text').innerText = `100%`;
        setTimeout(hideLoadingScreen, 500); // Small delay for smooth transition
    });

    // 2. Initialize 3D Viewer
    initViewer();
    // 3. Setup Right Panel
    setupInfoPanel();

    // 4. Populate Left Panel Tree
    populateComponentTree();

    // 5. Setup Search and Reset
    setupSearch();
    setupReset();

    // 6. Setup 3D Raycasting (Clicking on model)
    setupRaycasting();
    
    // 7. Setup Action Buttons (X-RAY, AI MODE, EXPLODE)
    setupActionButtons();
});

function populateComponentTree() {
    const tree = document.getElementById('component-tree');
    let html = '';

    const categories = ['MECHANICAL', 'ELECTRONICS'];
    
    categories.forEach(cat => {
        html += `<div class="mb-4">
            <h4 class="text-xs font-mono text-brand-textSecondary mb-2 uppercase tracking-widest pl-2">${cat}</h4>
            <ul class="space-y-1">`;
        
        for (const [key, data] of Object.entries(componentData)) {
            if (data.category === cat) {
                html += `
                    <li>
                        <button class="w-full text-left px-3 py-2 rounded border border-transparent hover:border-brand-border/50 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-all flex items-center gap-3 component-btn" data-key="${key}">
                            <i data-lucide="cpu" class="w-4 h-4 text-brand-primary"></i> ${data.name}
                        </button>
                    </li>
                `;
            }
        }
        html += `</ul></div>`;
    });

    tree.innerHTML = html;
    
    // Initialize icons if using lucide
    if (window.lucide) lucide.createIcons();

    // Attach events
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            triggerCinematicInspection(key);
        });
    });
}

function triggerCinematicInspection(assemblyKey) {
    if (activeAssemblyKey === assemblyKey) return;
    activeAssemblyKey = assemblyKey;

    const model = getModel();
    const scene = getScene();
    if (!model || !scene) return;

    // 1. Explode Assembly
    intelligentExplode(assemblyKey, model);

    // 2. Camera Focus
    focusOnAssembly(assemblyKey, model);

    // 3. Mechanical Animations & Reticles
    triggerComponentInteractions(assemblyKey, model, scene);
    
    // We need bounding box for reticles
    const targetMeshes = [];
    model.traverse((child) => {
        if (child.isMesh) {
            const data = componentData[assemblyKey];
            if (data && data.subComponents) {
                const isPart = data.subComponents.some(sub => 
                    sub.meshNames.some(name => child.name.toLowerCase().includes(name.toLowerCase()))
                );
                if (isPart) targetMeshes.push(child);
            }
        }
    });
    
    if (targetMeshes.length > 0) {
        const box = new THREE.Box3();
        targetMeshes.forEach(m => box.expandByObject(m));
        createHolographicReticle(model, scene, box);
    }

    // 4. Open UI Panel
    openInfoPanel(assemblyKey);
}

function setupReset() {
    document.getElementById('btn-reset-center').addEventListener('click', fullReset);
    document.getElementById('nav-home').addEventListener('click', fullReset);
    
    // Also reset if clicking background
    document.getElementById('canvas-container').addEventListener('click', (e) => {
        // We only want to reset if they didn't click a mesh (handled in raycaster)
    });
}

function fullReset() {
    activeAssemblyKey = null;
    const model = getModel();
    const scene = getScene();
    if (!model) return;

    resetExplode(model);
    resetInteractions(model, scene);
    resetCamera();
    closeInfoPanel();
}

function setupSearch() {
    const search = document.getElementById('search-input');
    search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 3) return;

        for (const [key, data] of Object.entries(componentData)) {
            if (data.name.toLowerCase().includes(query) || 
                (data.subComponents && data.subComponents.some(sub => sub.name.toLowerCase().includes(query)))) {
                triggerCinematicInspection(key);
                break;
            }
        }
    });
}

function setupRaycasting() {
    const container = document.getElementById('canvas-container');
    
    container.addEventListener('click', (event) => {
        const model = getModel();
        if (!model) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Find intersections
        const intersects = raycaster.intersectObject(model, true);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            
            // Find which assembly this mesh belongs to
            let foundKey = null;
            for (const [key, data] of Object.entries(componentData)) {
                if (data.subComponents) {
                    const match = data.subComponents.some(sub => 
                        sub.meshNames.some(name => clickedMesh.name.toLowerCase().includes(name.toLowerCase()))
                    );
                    if (match) {
                        foundKey = key;
                        break;
                    }
                }
            }

            if (foundKey) {
                triggerCinematicInspection(foundKey);
            }
        } else {
            // Clicked empty space
            fullReset();
        }
    });
}

function setupActionButtons() {
    let xrayEnabled = false;
    let isGloballyExploded = false;

    // ASSEMBLE/EXPLODE toggle
    const explodeBtn = document.getElementById('btn-explode');
    if (explodeBtn) {
        explodeBtn.addEventListener('click', () => {
            isGloballyExploded = !isGloballyExploded;
            const model = getModel();
            
            if (isGloballyExploded) {
                explodeBtn.innerHTML = `<i data-lucide="minimize-2" class="w-4 h-4 inline-block mr-2"></i> ASSEMBLE`;
                // Just trigger one for visual effect or explode all
                triggerCinematicInspection('pumpAssembly'); 
            } else {
                explodeBtn.innerHTML = `<i data-lucide="maximize-2" class="w-4 h-4 inline-block mr-2"></i> EXPLODE`;
                fullReset();
            }
            if (window.lucide) lucide.createIcons();
        });
    }

    // X-RAY and AI Mode
    const bottomBtns = document.querySelectorAll('#bottom-toolbar button');
    bottomBtns.forEach(btn => {
        if (btn.innerText.includes('X-RAY')) {
            btn.addEventListener('click', () => {
                xrayEnabled = !xrayEnabled;
                btn.classList.toggle('text-brand-primary');
                btn.classList.toggle('text-white');
                const model = getModel();
                if (model) {
                    model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.wireframe = xrayEnabled;
                            child.material.needsUpdate = true;
                        }
                    });
                }
            });
        }
        
        if (btn.innerText.includes('AI MODE')) {
            btn.addEventListener('click', () => {
                btn.classList.toggle('text-brand-primary');
                btn.classList.toggle('text-white');
                // Trigger a cool spin and zoom for AI analysis
                const model = getModel();
                const scene = getScene();
                if (model) {
                    resetExplode(model);
                    resetInteractions(model, scene);
                    resetCamera();
                    // Just to give it some life
                    model.rotation.z += Math.PI; 
                }
            });
        }
    });

    // Nav Links (Top Menu)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Reset active states
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('text-brand-primary', 'border-b-2', 'border-brand-primary', 'pb-1'));
            e.currentTarget.classList.add('text-brand-primary', 'border-b-2', 'border-brand-primary', 'pb-1');
            
            const target = e.currentTarget.getAttribute('data-target');
            if (target === 'Robot') fullReset();
            if (target === 'Mechanical') triggerCinematicInspection('wheelAssembly_FL');
            if (target === 'Electronics') triggerCinematicInspection('upperCameraAssembly');
            if (target === 'Working') triggerCinematicInspection('pumpAssembly');
        });
    });
}
