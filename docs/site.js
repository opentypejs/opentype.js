function throttleDebounce(func, wait) {
    let timeout = null;
    let lastFunc;
    let lastRan;

    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= wait) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(wait - (Date.now() - lastRan), 0));
        }
    };
}

function arrayBufferToBase64(buffer) {
    const CHUNK_SIZE = 8192;
    let result = '';
    const uintArray = new Uint8Array(buffer);

    for (let i = 0; i < uintArray.length; i += CHUNK_SIZE) {
        const chunk = uintArray.subarray(i, i + CHUNK_SIZE);
        result += String.fromCharCode.apply(null, chunk);
    }

    return btoa(result);
}

function base64ToArrayBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

function isFloat(value) {
    return parseInt(value) !== value;
}

function updateVariationOptions() {
    const variationsDiv = document.getElementById('variation-options');
    variationsDiv.innerHTML = '';
    if (!window?.font?.variation) return;
    
    const markup = `
        <div>
                ${window.font.tables.fvar.axes.map((a,idx) => {
                    const currentValue = (window.fontOptions.variation||{})[a.tag] || a.defaultValue;
                    // decide whether to allow float steps for the range slider
                    // always enable for uppercase tags or tags ending with spaces
                    const floatSteps = isFloat(a.minValue) || isFloat(a.defaultValue) || isFloat(a.maxValue) || /^[A-Z]{0,4}\s*$/.test(a.tag);
                    let label = a.name?.en;
                    if(label) {
                        label += ` (${a.tag.trim()})`;
                    } else {
                        label = a.tag.trim();
                    }
                    return `<p><label><strong>${label}</strong>
                        <input type="range" id="variation-tag-${a.tag}" step="${floatSteps ? 0.01 : 1}" min="${a.minValue}" max="${a.maxValue}" value="${currentValue}" oninput="onVariationChange(event)"></label> <span>${currentValue}</span></p>`;
                }).join('')}
        </div>
        <div>
            <p><label><strong>Variation Instance:</strong>
            <select id="variation-instance" oninput="changeVariationInstance(event)">
                ${window.font.tables.fvar.instances.map((i,idx) => {
                    const selected = window.font.variation.getInstanceIndex(window.font.defaultRenderOptions.variation) === idx ? ' selected' : '';
                    return `<option value="${idx}"${selected}>${i.name?.en || JSON.stringify(i.coordinates)}</option>`
                }).join('')}
                <option${!window.font.tables.fvar.instances.length ? ' selected' : ''} disabled>custom</option>
            </select></label></p>
        </div>
    `;
    variationsDiv.innerHTML = markup;
}

function onVariationChange(event) {
    const input = event.target;
    input.parentNode.nextElementSibling.innerText = input.value;
    const instanceIndex = window.font.variation.getInstanceIndex(getCurrentCoords());
    document.getElementById('variation-instance').value = instanceIndex > -1 ? instanceIndex : 'custom';
    window.fontOptions.variation = getCurrentCoords();
    window.font.variation.set(getCurrentCoords());
    throttledRedraw({withVariations: false});
};

function conditionalSampleText(font, textToRender) {
    const fontSampleText = font.getEnglishName('sampleText');
    const isEmpty = !font.stringToGlyphs(textToRender).filter((g) => !!g && g.name !== '.notdef' && g.unicode !== 32 && !g.unicodes.includes(32)).length;
    if(fontSampleText && isEmpty) {
        textToRender = font.getEnglishName('sampleText');
        if(document.forms.demo?.textField?.value) {
            document.forms.demo.textField.value = textToRender;
        }
    }
    return textToRender;
}

function changeVariationInstance(event) {
    const selected = event.target.value;
    if (selected !== 'custom') {
        Object.entries(window.font.tables.fvar.instances[selected].coordinates).forEach(([tag, value]) => {
            const slider = document.getElementById(`variation-tag-${tag}`);
            slider.value = value;
            slider.parentElement.nextElementSibling.innerText = value;
        });
        window.font.variation.set(parseInt(event.target.value));
    }
    window.fontOptions.variation = getCurrentCoords();
    window.font.variation.set(getCurrentCoords());
    window.redraw({withVariations: false});
};

function getCurrentCoords() {
    return Array.from(document.querySelectorAll('input[id^="variation-tag-"]')).reduce((acc, input) => {
        const tag = input.id.substring("variation-tag-".length);
        acc[tag] = parseFloat(input.value);
        return acc;
    }, {});
}