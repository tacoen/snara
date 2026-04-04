import { IconManager } from './ge-icon.js';
import icons from './icons.js';

class IconIndex extends IconManager {
    constructor(icons) {
        super();
        this.mergeIcons(icons);

        this.index = () => {
            const iconContainer = document.createElement('div');
            iconContainer.className = "index";

            for (const [key, value] of Object.entries(this.icons)) {
                const iconDiv = document.createElement('div');
                iconDiv.innerHTML = `${this.icons[key]}<span>${key}</span>`;
                iconDiv.setAttribute('onclick', `icxIndex.inspect("${key}")`);

                iconContainer.appendChild(iconDiv);
                iconDiv.addEventListener('click', () => {
                    const iconHTML = `<i data-icon="${key}"></i>`;
                    this.copyToClipboard(iconHTML);
                });
            }

            return iconContainer.outerHTML;
        };

        this.filterIcons = (searchTerm) => {
            const iconContainer = document.createElement('div');
            iconContainer.className = "index";

            for (const [key, value] of Object.entries(this.icons)) {
                if (key.toLowerCase().includes(searchTerm.toLowerCase())) {
                    const iconDiv = document.createElement('div');
                    iconDiv.innerHTML = `${this.icons[key]}<span>${key}</span>`;
                    iconDiv.setAttribute('onclick', `icxIndex.inspect("${key}")`);

                    iconContainer.appendChild(iconDiv);
                    iconDiv.addEventListener('click', () => {
                        const iconHTML = `<i data-icon="${key}"></i>`;
                        this.copyToClipboard(iconHTML);
                    });
                }
            }

            document.querySelector('#icon-index').innerHTML = iconContainer.outerHTML;
        };

        // Event listener for the search input
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', () => {
            this.filterIcons(searchInput.value);
        });
    }

    inspect(icon) {
        const existingDiv = document.querySelector('.icon-inspect-div');
        if (existingDiv) {
            existingDiv.remove();
        }

        const div = document.createElement('div');
        div.className = 'icon-inspect-div';
        const i = document.createElement('i');
        i.className = 'icon';
        i.dataset.icon = icon;

        const aclose = document.createElement('a');
        aclose.innerHTML = this.icons['x']; // Ensure 'cross' icon exists
        aclose.style.position = 'absolute';
        aclose.style.top = '0.5em';
        aclose.style.right = '0.5em';
        aclose.style.textDecoration = 'none';
        aclose.className = 'close';

        const copyButton = document.createElement('button');
        copyButton.textContent = icon;
        copyButton.onclick = () => this.copyIcon(icon);

        const strokeWidthInput = document.createElement('input');
        strokeWidthInput.type = 'number';
        strokeWidthInput.value = 2; // Default value
        strokeWidthInput.step = 0.5; 
        strokeWidthInput.min = 0.5;
        strokeWidthInput.max = 3;
        strokeWidthInput.style.marginTop = '0.5rem';
		strokeWidthInput.style.fontSize = '.7rem';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#0000ff'; // Default color
        colorInput.style.marginTop = '0.5rem';
		
        const fcolorInput = document.createElement('input');
        fcolorInput.type = 'color';
        fcolorInput.value = '#ffffff'; // Default color
        fcolorInput.style.marginTop = '0.5rem';

        // Readonly textbox for styles
        const styleTextbox = document.createElement('input');
        styleTextbox.type = 'text';
        styleTextbox.readOnly = true;
        styleTextbox.style.width = '100%';
        styleTextbox.style.marginTop = '0.5rem';
		styleTextbox.style.fontSize = '.7rem';

        const inputWidth = document.createElement('input');
        inputWidth.type = 'number';
        inputWidth.style.width = '25%';
        inputWidth.style.marginTop = '0.5rem';
		inputWidth.value = 96
		
        const inputHeight = document.createElement('input');
        inputHeight.type = 'number';
        inputHeight.style.width = '25%';
        inputHeight.style.marginTop = '0.5rem';
		inputHeight.value = 96
        // Apply styles on change

        const applyStyles = () => {
			const iconElement = document.querySelector(`.icon-inspect-div svg.icon`);			
            const strokeWidth = strokeWidthInput.value;
            const color = colorInput.value;
            const fcolor = fcolorInput.value; // Retrieve the foreground color
            const iheight = inputWidth.value;
            const iwidth = inputHeight.value;
			styleTextbox.value = `width: ${iwidth};height: ${iheight}; stroke-width: ${strokeWidth}px; fill: ${color}; color: ${fcolor};`;        
			
			if (iconElement) {
				console.log(iconElement);
				iconElement.style.strokeWidth = strokeWidth; // Set stroke width
				iconElement.style.fill = fcolor; // Use fill for color
				iconElement.style.color = color; // Use for foreground color
				iconElement.style.stroke = color; // Use for foreground color
				iconElement.style.width = iwidth ||  '96px'; // Use for foreground color
				iconElement.style.height = iheight || '96px'; // Use for foreground color
			}
		};

        strokeWidthInput.onchange = applyStyles;
        colorInput.onchange = applyStyles;
        fcolorInput.onchange = applyStyles
        inputWidth.onchange = applyStyles;
        inputHeight.onchange = applyStyles;

        div.appendChild(aclose);
        div.appendChild(i);
        
        const div2 = document.createElement('div');
        div2.className = "inspect-tool";
		
        div2.appendChild(styleTextbox);		
        div2.appendChild(inputWidth);		
        div2.appendChild(inputHeight);		
        div2.appendChild(strokeWidthInput);
        div2.appendChild(colorInput);
		div2.appendChild(fcolorInput);

        div.appendChild(div2);
        div.appendChild(copyButton);

        document.body.prepend(div);

        aclose.addEventListener('click', () => {
            div.remove();
        });

        this.replace();
    }

/*
    applyStyles(icon, strokeWidth, color, fcolor) {
        const iconElement = document.querySelector(`.icon-inspect-div svg.icon`);
        console.log(iconElement);
        if (iconElement) {
            iconElement.style.strokeWidth = strokeWidth; // Assuming the icons support stroke width
            iconElement.style.color = color; 
			iconElement.style.fill = fcolor; // Use fill for color instead of color
        }
    }
*/

    copyIcon(icon) {
        const text = icon;
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = `<i data-icon="${text}"></i>`;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        console.log('Copied to clipboard:', text);
    }
}

// Example usage
document.addEventListener('DOMContentLoaded', () => {
    const icxIndex = new IconIndex(icons);
    document.querySelector('#icon-index').innerHTML = icxIndex.index();
    window.icxIndex = icxIndex; // Expose to global scope if needed
});