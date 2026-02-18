#!/usr/bin/env node
/**
 * OpenClaw Lite - Validador de Instalación
 * Verifica que todo esté configurado correctamente
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const CHECKS = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function printCheck(name, status, message = '') {
    const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
    const colors = { pass: '\x1b[32m', fail: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
    
    console.log(`${colors[status]}${icons[status]}${colors.reset} ${name}${message ? ': ' + message : ''}`);
    
    if (status === 'pass') CHECKS.passed++;
    else if (status === 'fail') CHECKS.failed++;
    else if (status === 'warn') CHECKS.warnings++;
}

async function checkNode() {
    try {
        const { stdout } = await execPromise('node --version');
        const version = stdout.trim();
        const major = parseInt(version.slice(1).split('.')[0]);
        
        if (major >= 18) {
            printCheck('Node.js', 'pass', version);
        } else {
            printCheck('Node.js', 'warn', `${version} (recomendado: 18+)`);
        }
    } catch (error) {
        printCheck('Node.js', 'fail', 'No instalado');
    }
}

async function checkNpm() {
    try {
        const { stdout } = await execPromise('npm --version');
        printCheck('npm', 'pass', stdout.trim());
    } catch (error) {
        printCheck('npm', 'fail', 'No instalado');
    }
}

async function checkGit() {
    try {
        const { stdout } = await execPromise('git --version');
        printCheck('Git', 'pass', stdout.trim().split('\n')[0]);
    } catch (error) {
        printCheck('Git', 'warn', 'No instalado (opcional)');
    }
}

async function checkPython() {
    try {
        const { stdout } = await execPromise('python3 --version');
        printCheck('Python 3', 'pass', stdout.trim());
    } catch (error) {
        printCheck('Python 3', 'warn', 'No instalado (necesario para skills con pandas)');
    }
}

async function checkFfmpeg() {
    try {
        const { stdout } = await execPromise('ffmpeg -version');
        const version = stdout.split('\n')[0];
        printCheck('ffmpeg', 'pass', version.split(' ')[2]);
    } catch (error) {
        printCheck('ffmpeg', 'warn', 'No instalado (necesario para video-processor)');
    }
}

async function checkStructure() {
    const required = [
        'package.json',
        'agent/index.js',
        'gateway/index.js',
        'channel/whatsapp/baileys-adapter.js',
        'skills/core/memory/index.js',
        '.env.example'
    ];
    
    for (const file of required) {
        const exists = await fs.pathExists(file);
        if (exists) {
            printCheck(`Estructura: ${file}`, 'pass');
        } else {
            printCheck(`Estructura: ${file}`, 'fail', 'No encontrado');
        }
    }
}

async function checkNodeModules() {
    const exists = await fs.pathExists('node_modules');
    if (!exists) {
        printCheck('node_modules', 'fail', 'Ejecuta: npm install');
        return;
    }
    
    printCheck('node_modules', 'pass', 'Instalado');
    
    // Verificar Baileys específicamente
    const baileysPaths = [
        'node_modules/@whiskeysockets/baileys',
        'node_modules/baileys'
    ];
    
    let baileysFound = false;
    for (const bp of baileysPaths) {
        if (await fs.pathExists(bp)) {
            baileysFound = true;
            break;
        }
    }
    
    if (baileysFound) {
        printCheck('WhatsApp (Baileys)', 'pass', 'Instalado');
    } else {
        printCheck('WhatsApp (Baileys)', 'fail', 'No instalado. Ejecuta: npm install @whiskeysockets/baileys');
    }
}

async function checkEnv() {
    const envPath = '.env';
    const envExamplePath = '.env.example';
    
    if (!await fs.pathExists(envPath)) {
        if (await fs.pathExists(envExamplePath)) {
            printCheck('Configuración', 'fail', 'Copia .env.example a .env y configura tus API keys');
        } else {
            printCheck('Configuración', 'fail', '.env.example no encontrado');
        }
        return;
    }
    
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    // Verificar LLM provider
    const provider = envContent.match(/LLM_PROVIDER=(.+)/)?.[1];
    if (provider === 'openai') {
        const key = envContent.match(/OPENAI_API_KEY=(.+)/)?.[1];
        if (key && key !== 'sk-your-openai-key-here' && key.startsWith('sk-')) {
            printCheck('OpenAI API Key', 'pass', 'Configurada');
        } else {
            printCheck('OpenAI API Key', 'fail', 'No configurada o inválida');
        }
    } else if (provider === 'openrouter') {
        const key = envContent.match(/OPENROUTER_API_KEY=(.+)/)?.[1];
        if (key && key !== 'sk-or-v1-your-openrouter-key-here' && key.startsWith('sk-or-')) {
            printCheck('OpenRouter API Key', 'pass', 'Configurada');
        } else {
            printCheck('OpenRouter API Key', 'fail', 'No configurada o inválida');
        }
    } else {
        printCheck('LLM Provider', 'fail', 'No configurado (openai u openrouter)');
    }
}

async function checkPorts() {
    try {
        const { stdout } = await execPromise('netstat -tlnp 2>/dev/null || ss -tlnp');
        const gatewayPort = 18789;
        
        if (stdout.includes(`:${gatewayPort}`)) {
            printCheck(`Puerto ${gatewayPort}`, 'warn', 'Ya está en uso');
        } else {
            printCheck(`Puerto ${gatewayPort}`, 'pass', 'Disponible');
        }
    } catch (error) {
        printCheck('Puertos', 'warn', 'No se pudo verificar');
    }
}

async function main() {
    console.log('\n🦞 OpenClaw Lite - Validador\n');
    console.log('Verificando instalación...\n');
    
    await checkNode();
    await checkNpm();
    await checkGit();
    await checkPython();
    await checkFfmpeg();
    
    console.log('');
    
    await checkStructure();
    await checkNodeModules();
    await checkEnv();
    await checkPorts();
    
    console.log('\n' + '='.repeat(50));
    console.log(`Resultado: ${CHECKS.passed} ✅  ${CHECKS.failed} ❌  ${CHECKS.warnings} ⚠️`);
    console.log('='.repeat(50));
    
    if (CHECKS.failed > 0) {
        console.log('\n❌ Hay errores que debes corregir antes de iniciar.');
        process.exit(1);
    } else if (CHECKS.warnings > 0) {
        console.log('\n⚠️  Hay advertencias. Puedes iniciar pero algunas features no funcionarán.');
        process.exit(0);
    } else {
        console.log('\n✅ Todo listo! Ejecuta: npm start');
        process.exit(0);
    }
}

main().catch(console.error);
