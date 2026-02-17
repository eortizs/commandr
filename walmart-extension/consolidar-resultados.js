const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

// Configuración
const RESULTADOS_DIR = path.join(__dirname, '..', 'price-scraper', 'resultados');
const OUTPUT_DIR = RESULTADOS_DIR;

async function consolidarResultados() {
    console.log('🔄 Consolidando resultados de todas las tiendas...\n');
    
    // Verificar directorio
    if (!await fs.pathExists(RESULTADOS_DIR)) {
        console.error('❌ Directorio de resultados no encontrado:', RESULTADOS_DIR);
        return;
    }
    
    // Buscar todos los archivos JSON
    const jsonFiles = await glob.glob('*.json', { cwd: RESULTADOS_DIR });
    
    if (jsonFiles.length === 0) {
        console.log('⚠️ No hay archivos JSON para consolidar');
        return;
    }
    
    console.log(`📁 Encontrados ${jsonFiles.length} archivos JSON`);
    
    // Leer y combinar todos los JSON
    const todosLosResultados = [];
    
    for (const file of jsonFiles) {
        try {
            const filePath = path.join(RESULTADOS_DIR, file);
            const data = await fs.readJson(filePath);
            
            // Si tiene array de productos, agregar cada uno
            if (data.productos && Array.isArray(data.productos)) {
                todosLosResultados.push(...data.productos);
            } else if (Array.isArray(data)) {
                // Formato array directo
                todosLosResultados.push(...data);
            }
            
            console.log(`  ✅ ${file}: ${data.productos?.length || data.length || 0} productos`);
        } catch (e) {
            console.error(`  ❌ Error leyendo ${file}:`, e.message);
        }
    }
    
    if (todosLosResultados.length === 0) {
        console.log('⚠️ No hay productos para consolidar');
        return;
    }
    
    // Obtener fecha actual
    const fecha = new Date().toISOString().split('T')[0];
    
    // Guardar JSON consolidado
    const jsonOutput = path.join(OUTPUT_DIR, `consolidado-${fecha}.json`);
    await fs.writeJson(jsonOutput, todosLosResultados, { spaces: 2 });
    console.log(`\n💾 JSON consolidado: ${jsonOutput}`);
    console.log(`   Total: ${todosLosResultados.length} productos`);
    
    // Generar CSV consolidado
    const csvOutput = path.join(OUTPUT_DIR, `consolidado-${fecha}.csv`);
    await generarCSV(todosLosResultados, csvOutput);
    console.log(`💾 CSV consolidado: ${csvOutput}`);
    
    // Estadísticas por tienda
    console.log('\n📊 Estadísticas por tienda:');
    const porTienda = {};
    todosLosResultados.forEach(p => {
        const tienda = p.tienda || 'Desconocida';
        porTienda[tienda] = (porTienda[tienda] || 0) + 1;
    });
    
    Object.entries(porTienda).forEach(([tienda, count]) => {
        console.log(`   • ${tienda}: ${count} productos`);
    });
    
    // Estadísticas por producto
    console.log('\n📊 Productos buscados:');
    const porProducto = {};
    todosLosResultados.forEach(p => {
        const prod = p.producto || 'Desconocido';
        if (!porProducto[prod]) {
            porProducto[prod] = { count: 0, tiendas: new Set() };
        }
        porProducto[prod].count++;
        porProducto[prod].tiendas.add(p.tienda);
    });
    
    Object.entries(porProducto).forEach(([prod, data]) => {
        console.log(`   • ${prod}: ${data.count} resultados en ${data.tiendas.size} tienda(s)`);
    });
}

async function generarCSV(productos, outputPath) {
    if (productos.length === 0) return;
    
    // Obtener todas las columnas posibles
    const columnas = ['tienda', 'producto', 'nombre', 'precio', 'fecha', 'url'];
    
    // Headers
    const headers = columnas.join(',');
    
    // Filas
    const rows = productos.map(p => {
        return columnas.map(col => {
            const valor = p[col] || '';
            // Escapar comillas y envolver en comillas si es necesario
            if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"') || valor.includes('\n'))) {
                return `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
        }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    await fs.writeFile(outputPath, csv);
}

// Uso
async function main() {
    try {
        await consolidarResultados();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { consolidarResultados };
