import { componentData } from './componentData.js';

export function openInfoPanel(assemblyKey) {
    const data = componentData[assemblyKey];
    if (!data) return;

    const panel = document.getElementById('right-panel');
    
    // Header
    document.getElementById('info-number').innerText = data.number || '00';
    document.getElementById('info-title').innerText = data.name;
    document.getElementById('info-desc').innerText = data.description;
    
    // Specifications Table
    const specsContainer = document.getElementById('info-specs');
    specsContainer.innerHTML = '';
    
    if (data.specs) {
        for (const [key, value] of Object.entries(data.specs)) {
            specsContainer.innerHTML += `
                <div class="flex justify-between border-b border-brand-border/20 pb-1 mb-1 last:border-0 last:mb-0 last:pb-0">
                    <span class="text-brand-textSecondary text-xs tracking-wide uppercase">${key}</span>
                    <span class="text-white text-xs font-mono text-right ml-4">${value}</span>
                </div>
            `;
        }
    }

    // Function
    document.getElementById('info-function').innerText = data.function || 'N/A';
    
    // Related Components Pills
    const relatedContainer = document.getElementById('info-related');
    relatedContainer.innerHTML = '';
    if (data.relatedComponents) {
        data.relatedComponents.forEach(rel => {
            relatedContainer.innerHTML += `<span class="px-2 py-1 border border-brand-border rounded text-[10px] font-mono text-brand-primary uppercase">${rel}</span>`;
        });
    }
    
    // Update Active Assembly Tree in Bottom Panel
    updateAssemblyTree(data);

    // Slide and fade in Right Panel
    gsap.to(panel, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
}

export function closeInfoPanel() {
    const panel = document.getElementById('right-panel');
    gsap.to(panel, { x: "120%", opacity: 0, duration: 0.5, ease: "power3.in" });
    
    // Reset Assembly Tree
    document.getElementById('assembly-tree').innerText = "Robot\n └── Standby";
}

export function setupInfoPanel() {
    document.getElementById('btn-close-info').addEventListener('click', closeInfoPanel);
}

function updateAssemblyTree(data) {
    let treeStr = `Robot\n └── ${data.name}\n`;
    if (data.subComponents) {
        data.subComponents.forEach((sub, index) => {
            const isLast = index === data.subComponents.length - 1;
            const prefix = isLast ? '      └─ ' : '      ├─ ';
            treeStr += `${prefix}${sub.name}\n`;
        });
    }
    document.getElementById('assembly-tree').innerText = treeStr;
}
