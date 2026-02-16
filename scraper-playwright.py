#!/usr/bin/env python3
# Scraping de precios con Playwright - Versión mejorada
import sys
import asyncio
import re
from playwright.async_api import async_playwright

async def scrape_chedraui(producto: str):
    """Scraper específico para Chedraui"""
    url = f"https://www.chedraui.com.mx/{producto.replace(' ', '%20')}?_q={producto.replace(' ', '%20')}&map=ft"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navegar con timeout más largo y esperar solo DOM
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Esperar un poco para que cargue JavaScript
            await asyncio.sleep(3)
            
            # Intentar múltiples selectores comunes de precios
            selectors = [
                "[data-testid='product-price']",
                ".vtex-product-price-1-x-currencyContainer",
                ".vtex-product-price-1-x-sellingPrice",
                ".price",
                "[class*='price']",
                "span:has-text('$')",
            ]
            
            for selector in selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        text = await element.text_content()
                        # Buscar formato de precio mexicano
                        match = re.search(r'\$[\d,]+\.?\d*', text)
                        if match:
                            await browser.close()
                            return match.group(), None
                except:
                    continue
            
            # Si no encontramos, tomar screenshot para debug
            await page.screenshot(path="/tmp/debug_chedraui.png")
            await browser.close()
            return None, "Precio no encontrado (screenshot guardado en /tmp/debug_chedraui.png)"
            
        except Exception as e:
            await browser.close()
            return None, str(e)

async def main():
    if len(sys.argv) < 2:
        print("Uso: python3 scraper-playwright.py 'producto'")
        print("Ejemplo: python3 scraper-playwright.py 'cebolla blanca'")
        sys.exit(1)
    
    producto = sys.argv[1]
    
    print(f"🔍 Buscando '{producto}' en Chedraui...\n")
    precio, error = await scrape_chedraui(producto)
    
    if error:
        print(f"❌ Error: {error}")
    else:
        print(f"✅ Precio encontrado: {precio}")

if __name__ == "__main__":
    asyncio.run(main())
