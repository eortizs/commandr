#!/usr/bin/env node
/**
 * CLI para Skill Generator
 * Uso: ocl-generate "crea una skill para consultar el clima"
 */

const SkillGeneratorEngine = require('./index');

const description = process.argv.slice(2).join(' ');

if (!description) {
    console.log(`
🦞 OpenClaw Lite - Skill Generator

Uso:
  node generate-skill.js "descripción de la skill"

Ejemplos:
  node generate-skill.js "skill para consultar clima por ciudad"
  node generate-skill.js "monitorea precio de bitcoin y alerta"
  node generate-skill.js "lee archivos CSV y muestra estadísticas"
`);
    process.exit(1);
}

console.log('\n🔧 OpenClaw Lite - Skill Generator\n');

const generator = new SkillGeneratorEngine();

generator.generate(description)
    .then(result => {
        console.log('\n' + '='.repeat(50));
        console.log('🎉 SKILL GENERADA EXITOSAMENTE');
        console.log('='.repeat(50));
        console.log(`\n📋 Información:`);
        console.log(`   ID: ${result.id}`);
        console.log(`   Tipo: ${result.intent.type}`);
        console.log(`   Ubicación: ${result.path}`);
        console.log(`\n📝 Uso:`);
        console.log(`   ${result.id} ${result.intent.params.map(p => `[${p}]`).join(' ')}`);
        console.log(`\n✅ La skill está lista para usar!`);
    })
    .catch(err => {
        console.error('\n❌ Error generando skill:', err.message);
        process.exit(1);
    });
