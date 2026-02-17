// Content script - Se ejecuta en walmart.com.mx
console.log('Walmart Price Scraper: Content script cargado');

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Mensaje recibido:', request);
    
    if (request.action === 'buscar') {
        buscarProducto(request.producto)
            .then(() => {
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error('Error en búsqueda:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Mantener canal abierto para respuesta async
    }
});

// Función de búsqueda
async function buscarProducto(producto) {
    return new Promise((resolve, reject) => {
        console.log('Buscando producto:', producto);
        
        // Buscar input
        const findInput = () => {
            const selectores = [
                'input[data-automation-id="header-input-search"]',
                'input[placeholder*="Buscar" i]',
                'input[type="search"]',
                'input[name="q"]',
                'input[aria-label*="Buscar" i]',
                'input.search-bar',
                'header input',
                'nav input'
            ];
            
            for (const selector of selectores) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    console.log('Input encontrado con selector:', selector);
                    return el;
                }
            }
            
            // Buscar cualquier input visible
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                const placeholder = (input.placeholder || '').toLowerCase();
                if ((placeholder.includes('buscar') || placeholder.includes('search')) && input.offsetParent !== null) {
                    console.log('Input encontrado por placeholder:', input);
                    return input;
                }
            }
            
            return null;
        };
        
        const input = findInput();
        
        if (!input) {
            console.error('Input no encontrado');
            reject(new Error('Input de búsqueda no encontrado'));
            return;
        }
        
        console.log('Input encontrado:', input);
        
        // Scroll al input
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            try {
                // Focus y click
                input.focus();
                input.click();
                
                // Limpiar
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log('Input limpiado, empezando a escribir...');
                
                // Escribir letra por letra
                let i = 0;
                const typeChar = () => {
                    if (i < producto.length) {
                        input.value += producto[i];
                        
                        // Eventos
                        input.dispatchEvent(new InputEvent('input', {
                            bubbles: true,
                            inputType: 'insertText',
                            data: producto[i]
                        }));
                        
                        i++;
                        setTimeout(typeChar, 150 + Math.random() * 200);
                    } else {
                        console.log('Terminó de escribir, presionando Enter...');
                        
                        // Presionar Enter
                        setTimeout(() => {
                            const enterEvent = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            input.dispatchEvent(enterEvent);
                            
                            // También keypress y keyup
                            input.dispatchEvent(new KeyboardEvent('keypress', {
                                key: 'Enter',
                                code: 'Enter',
                                charCode: 13,
                                bubbles: true
                            }));
                            
                            input.dispatchEvent(new KeyboardEvent('keyup', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            }));
                            
                            // Submit form
                            const form = input.closest('form');
                            if (form) {
                                setTimeout(() => {
                                    console.log('Submitiendo form...');
                                    form.dispatchEvent(new Event('submit', { bubbles: true }));
                                }, 100);
                            }
                            
                            resolve();
                        }, 500);
                    }
                };
                
                typeChar();
            } catch (error) {
                reject(error);
            }
        }, 1000);
    });
}
