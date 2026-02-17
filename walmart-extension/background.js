// Background script - Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('Walmart Price Scraper instalado');
});

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'guardarResultado') {
        chrome.storage.local.get(['resultados'], (data) => {
            const resultados = data.resultados || [];
            resultados.push(request.producto);
            chrome.storage.local.set({ resultados });
        });
    }
});
