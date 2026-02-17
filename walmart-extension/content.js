// Content script - Se ejecuta en walmart.com.mx
console.log('Walmart Price Scraper activo');

// Detectar si estamos en página de resultados
if (window.location.href.includes('/buscar?q=')) {
    console.log('Página de búsqueda detectada');
    
    // Esperar a que carguen los productos
    const observer = new MutationObserver((mutations) => {
        const productos = document.querySelectorAll('[data-automation-id="product-tile"]');
        if (productos.length > 0) {
            console.log(`${productos.length} productos encontrados`);
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}
