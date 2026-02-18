/**
 * OpenClaw Lite - Dependency Manager
 * Gestiona dependencias de skills (npm, pip, system)
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs-extra');
const path = require('path');

class DependencyManager {
    constructor(skillsPath) {
        this.skillsPath = skillsPath || path.join(__dirname, '..', 'skills', 'user');
    }

    /**
     * Instala dependencias de una skill
     */
    async install(skillId, dependencies) {
        const skillPath = path.join(this.skillsPath, skillId);
        
        console.log(`📦 Instalando dependencias para ${skillId}...`);
        
        for (const dep of dependencies) {
            if (dep.type === 'npm') {
                await this.installNpm(skillPath, dep.package);
            } else if (dep.type === 'pip') {
                await this.installPip(skillPath, dep.package);
            } else if (dep.type === 'system') {
                await this.installSystem(dep.package);
            }
        }
        
        console.log(`✅ Dependencias instaladas`);
    }

    async installNpm(skillPath, packageName) {
        console.log(`   📦 npm: ${packageName}`);
        try {
            await execPromise(`npm install ${packageName}`, { 
                cwd: skillPath,
                timeout: 120000 
            });
        } catch (error) {
            console.error(`   ✗ Error instalando ${packageName}:`, error.message);
            throw error;
        }
    }

    async installPip(skillPath, packageName) {
        console.log(`   🐍 pip: ${packageName}`);
        try {
            // Crear virtualenv si no existe
            const venvPath = path.join(skillPath, '.venv');
            if (!await fs.pathExists(venvPath)) {
                await execPromise(`python3 -m venv ${venvPath}`);
            }
            
            // Instalar en virtualenv
            const pipPath = path.join(venvPath, 'bin', 'pip');
            await execPromise(`${pipPath} install ${packageName}`, { timeout: 120000 });
            
            // Guardar referencia
            await fs.writeFile(
                path.join(skillPath, '.python-env'), 
                `VENV_PATH=${venvPath}\nPYTHON=${path.join(venvPath, 'bin', 'python')}`
            );
        } catch (error) {
            console.error(`   ✗ Error instalando ${packageName}:`, error.message);
            throw error;
        }
    }

    async installSystem(packageName) {
        console.log(`   🔧 system: ${packageName}`);
        console.log(`   ⚠️  Requiere instalación manual: sudo apt install ${packageName}`);
        // No instalamos automáticamente por seguridad
    }

    /**
     * Ejecuta script Python con el virtualenv de la skill
     */
    async runPython(skillId, scriptPath, args = []) {
        const skillPath = path.join(this.skillsPath, skillId);
        const envFile = path.join(skillPath, '.python-env');
        
        if (!await fs.pathExists(envFile)) {
            throw new Error('No hay entorno Python configurado para esta skill');
        }
        
        const envContent = await fs.readFile(envFile, 'utf-8');
        const pythonPath = envContent.match(/PYTHON=(.+)/)?.[1];
        
        if (!pythonPath) {
            throw new Error('Python path no encontrado');
        }
        
        const command = `${pythonPath} ${scriptPath} ${args.join(' ')}`;
        const { stdout, stderr } = await execPromise(command, { timeout: 60000 });
        
        return { stdout, stderr };
    }

    /**
     * Verifica si una dependencia está instalada
     */
    async check(skillId, packageName, type = 'npm') {
        const skillPath = path.join(this.skillsPath, skillId);
        
        if (type === 'npm') {
            const pkgJson = path.join(skillPath, 'package.json');
            if (!await fs.pathExists(pkgJson)) return false;
            const pkg = await fs.readJson(pkgJson);
            return !!(pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]);
        }
        
        if (type === 'pip') {
            const envFile = path.join(skillPath, '.python-env');
            if (!await fs.pathExists(envFile)) return false;
            // Podríamos verificar con pip list
            return true;
        }
        
        return false;
    }
}

module.exports = DependencyManager;
