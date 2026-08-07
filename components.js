import * as THREE from 'three';
import { componentData } from './componentData.js';
import { camera, scene } from './viewer.js';
import { focusOnComponent } from './camera.js';
import { openInfoPanel, closeInfoPanel } from './infoPanel.js';

let mappedComponents = {};
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredMesh = null;
export let selectedMesh = null;

const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00C2FF,
    emissive: 0x00C2FF,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.9
});

export function initializeComponents(model) {
    mappedComponents = {};
    
    model.traverse((child) => {
        if (child.isMesh) {
            for (const [key, data] of Object.entries(componentData)) {
                if (data.meshNames.some(name => child.name.toLowerCase().includes(name.toLowerCase()))) {
                    if (!mappedComponents[key]) mappedComponents[key] = { data: data, meshes: [] };
                    mappedComponents[key].meshes.push(child);
                    child.userData.componentKey = key;
                }
            }
        }
    });

    buildComponentTree();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
}

function onMouseMove(event) {
    if(event.target.tagName !== 'CANVAS') return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(scene, true);
    
    let found = false;
    if (intersects.length > 0) {
        const intersect = intersects.find(i => i.object.userData.componentKey);
        if (intersect) {
            found = true;
            const mesh = intersect.object;
            if (hoveredMesh !== mesh && mesh !== selectedMesh) {
                if (hoveredMesh && hoveredMesh !== selectedMesh) hoveredMesh.material = hoveredMesh.userData.originalMaterial;
                hoveredMesh = mesh;
                hoveredMesh.material = highlightMaterial;
                document.body.style.cursor = 'pointer';
            }
        }
    }
    if (!found && hoveredMesh) {
        if (hoveredMesh !== selectedMesh) hoveredMesh.material = hoveredMesh.userData.originalMaterial;
        hoveredMesh = null;
        document.body.style.cursor = 'default';
    }
}

function onClick(event) {
    if (event.target.tagName !== 'CANVAS') return;
    if (hoveredMesh) {
        selectComponent(hoveredMesh.userData.componentKey);
        focusOnComponent(hoveredMesh);
    } else {
        clearSelection();
        closeInfoPanel();
    }
}

export function selectComponent(key) {
    clearSelection();
    if (!mappedComponents[key]) return;

    // Dim others
    scene.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial && child.userData.componentKey !== key) {
            child.material.transparent = true;
            gsap.to(child.material, { opacity: 0.1, duration: 0.5 });
        }
    });

    const comp = mappedComponents[key];
    comp.meshes.forEach(mesh => {
        selectedMesh = mesh;
        mesh.material = highlightMaterial;
    });

    openInfoPanel(comp.data);
    
    document.querySelectorAll('.tree-item').forEach(el => {
        el.classList.toggle('active', el.dataset.key === key);
    });
}

export function clearSelection() {
    if (selectedMesh) {
        const key = selectedMesh.userData.componentKey;
        if (mappedComponents[key]) mappedComponents[key].meshes.forEach(mesh => mesh.material = mesh.userData.originalMaterial);
        selectedMesh = null;
    }
    scene.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
            gsap.to(child.material, { opacity: 1, duration: 0.5 });
            child.material.transparent = child.userData.originalMaterial.transparent;
        }
    });
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
}

function buildComponentTree() {
    const tree = document.getElementById('component-tree');
    tree.innerHTML = '';
    const categories = {};
    
    for (const key in mappedComponents) {
        const cat = mappedComponents[key].data.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(mappedComponents[key].data);
    }
    
    for (const cat in categories) {
        tree.innerHTML += `<div class="text-gray-500 font-display font-semibold text-xs mt-4 mb-2 uppercase tracking-widest">${cat}</div>`;
        categories[cat].forEach(data => {
            const div = document.createElement('div');
            div.className = 'tree-item';
            div.innerText = data.name;
            div.dataset.key = data.id;
            div.onclick = () => { 
                selectComponent(data.id); 
                if(mappedComponents[data.id].meshes.length) focusOnComponent(mappedComponents[data.id].meshes[0]); 
            };
            tree.appendChild(div);
        });
    }
}

export function getMappedComponents() { return mappedComponents; }
