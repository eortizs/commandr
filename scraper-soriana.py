#!/usr/bin/env python3
# Scraping de precios en Soriana - Versión específica
import asyncio
import re
from playwright.async_api import async_playwright

async def scrape_soriana(producto: str):
    """Scraper específico para Soriana con URL de categoría"""
    
    # URL con filtros de categoría
    url = f"https://www.soriana.com/buscar?productSuggestions__category=Verduras&q={producto.replace(' ', '+')}&search-button="
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            print(f"🔍 Buscando '{producto}' en Soriana...")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Esperar a que cargue el contenido
            await asyncio.sleep(5)
            
            # Intentar múltiples selectores de precios
            selectors = [
                "[data-testid='product-price']",
                ".vtex-product-price-1-x-currencyContainer",
                ".vtex-product-price-1-x-sellingPrice",
                ".price",
                "span[class*='price']",
                "div[class*='price']",
            ]
            
            for selector in selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    for element in elements:
                        text = await element.text_content()
                        # Buscar formato de precio mexicano
                        match = re.search(r'\$[\d,]+\.?\d*', text)
                        if match:
                            precio = match.group()
                            await browser.close()
                            return precio
                except:
                    continue
            
            # Si no encontramos, tomar screenshot para debug
            await page.screenshot(path=f"/tmp/soriana_{producto.replace(' ', '_')}.png")
            await browser.close()
            return None, f"Precio no encontrado. Screenshot: /tmp/soriana_{producto.replace(' ', '_')}.png"
            
        except Exception as e:
            await browser.close()
            return None, str(e)

async def main():
    producto = "jitomate saladet"
    
    resultado = await scrape_soriana(producto)
    
    if isinstance(resultado, tuple):
        print(f"❌ Error: {resultado[1]}")
    else:
        print(f"✅ Soriana - {producto}: {resultado}/kg")

if __name__ == "__main__":
    asyncio.run(main())
