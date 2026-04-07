import icons from './icons.js';

export class IconManager {
    constructor() {
        this.icons = {
            "blank": `<svg xmlns="http://www.w3.org/2000/svg" class='ge' width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/></svg>`
        };
    }

    mergeIcons(newIcons) {
        Object.assign(this.icons, newIcons);
    }

    icon(iconId, classes = '') {
        if (typeof this.icons[iconId] === "undefined") {
			console.warn('icx - notfound:'+iconId);
            this.icons[iconId] = '<svg></svg>';
			classes = "nan " + classes;
        }
		
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.icons[iconId];
		
        const svgElement = tempDiv.firstChild;
		
        if (svgElement) {
            svgElement.setAttribute('class', classes);
        }

        return svgElement.outerHTML;
    }

    replace() {

		setTimeout(() => {
	 
        document.querySelectorAll('[data-icon]').forEach((element) => {
            const id = element.dataset.icon;

            const classes = element.className;
			
			//console.log(classes);
			
            const iconElement = document.createElement('div');
            iconElement.innerHTML = this.icon(id, classes);

            // Copy all attributes from the original element to the SVG
            Array.from(element.attributes).forEach(attr => {
                if (attr.name !== 'data-icon') {
                    iconElement.firstChild.setAttribute(attr.name, attr.value);
                }
            });

            element.outerHTML = iconElement.innerHTML;
        });
		},3);
	}
	
    delayreplace(selector = '[data-icon]') {
    // Cari elemen berdasarkan selector (default atau custom)
    document.querySelectorAll(selector).forEach((element) => {
        const attrName = selector.includes('safe') ? 'safeicon' : 'icon';
        const id = element.dataset[attrName];
        const classes = element.className;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.icon(id, classes);
        const newSvg = tempDiv.firstChild;

        if (newSvg) {
            // Copy attributes
            Array.from(element.attributes).forEach(attr => {
                if (attr.name !== `data-${attrName}`) {
                    newSvg.setAttribute(attr.name, attr.value);
                }
            });
            // Gunakan replaceWith untuk keamanan DOM
            element.replaceWith(newSvg);
        }
    });
	}
}

let icx = new IconManager();
icx.mergeIcons(icons);

export default icx;