/**
 * TooltipController - Manages dynamic tooltips based on JSON data
 */
class TooltipController {
    constructor(dataUrl) {
        this.tooltipData = {};
        this.tooltipElement = this.createTooltipElement();
        this.loadData(dataUrl);
    }

    // Create the tooltip div and inject it into the body
    createTooltipElement() {
        const el = document.createElement('div');
        el.id = 'dynamic-tooltip';
        el.style.position = 'fixed';
        el.style.display = 'none';
        el.style.pointerEvents = 'none'; // Prevents flickering
        el.style.zIndex = '1000';
        document.body.appendChild(el);
        return el;
    }

    async loadData(url) {
        try {
            const response = await fetch(url);
            this.tooltipData = await response.json();
            this.initEventListeners();
        } catch (error) {
            console.error("Failed to load tooltip data:", error);
        }
    }

    initEventListeners() {
        // Listen for mouseover on any element with data-tooltip attribute
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                const key = target.getAttribute('data-tooltip');
                this.show(key, e);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.tooltipElement.style.display === 'block') {
                this.position(e);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('[data-tooltip]')) {
                this.hide();
            }
        });
    }

    show(path, event) {
        if (!path.includes('.')) {
            console.warn(`Path "${path}" is missing a dot (format: section.item)`);
            return;
        }
    
        const parts = path.split('.');
        const sectionKey = parts[0];
        const itemKey = parts[1];
    
        // Zbytek tvého kódu je v pořádku...
        const item = (this.tooltipData[sectionKey] && this.tooltipData[sectionKey][itemKey]) 
                 ? this.tooltipData[sectionKey][itemKey] 
                 : null;

        if (!item) {
            console.warn(`Tooltip not found for path: ${path}`);
            return;
        }

        this.tooltipElement.innerHTML = `
            <div class="tooltip-desc">${item.description}</div>
            ${item.category ? `<div class="tooltip-cat">${item.category}</div>` : ''}
        `;

        this.tooltipElement.style.display = 'block';
        this.position(event);
    }

    position(e) {
        const offsetX = 0; // Střed
        const offsetY = 20; // Mezera nad kurzorem

        // Získáme rozměry tooltipu
        const tooltipWidth = this.tooltipElement.offsetWidth;
        const tooltipHeight = this.tooltipElement.offsetHeight;

        // Výpočet: Pozice kurzoru - polovina šířky tooltipu (pro vycentrování)
        let left = e.clientX - (tooltipWidth / 2);
        // Výpočet: Pozice kurzoru - výška tooltipu - mezera (pro umístění nad)
        let top = e.clientY - tooltipHeight - offsetY;

        // Prevence přetečení mimo obrazovku (dobrovolné)
        if (left < 10) left = 10;
        if (top < 10) top = e.clientY + 20; // Pokud je nahoře málo místa, skočí pod kurzor

        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
    }

    hide() {
        this.tooltipElement.style.display = 'none';
    }
}

// Initialize the controller
const tooltips = new TooltipController('js/level_editor/dataEditorDescription.json');