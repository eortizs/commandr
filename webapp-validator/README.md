# WebApp Validator

Validación automatizada de webapps usando Playwright.

## Instalación

```bash
npm install
npx playwright install chromium
```

## Uso

```bash
# Ejecutar validación de login
node validate-login.js
```

## Qué hace

1. Abre Chrome visible
2. Navega al sitio
3. Llena email y password
4. Click en login
5. Captura screenshots en cada paso
6. Reporta resultado

## Screenshots generados

- `/tmp/01-initial.png` - Página inicial
- `/tmp/02-email-filled.png` - Email ingresado
- `/tmp/03-password-filled.png` - Password ingresado
- `/tmp/04-after-login.png` - Resultado post-login

## Notas

- El navegador se abre visible (`headless: false`) para ver el proceso
- Si hay error, se guarda screenshot en `/tmp/error-screenshot.png`
