#!/bin/bash
#
# OpenClaw Lite - Script de Instalación
# Uso: curl -fsSL https://raw.githubusercontent.com/eortizs/commandr/main/openclaw-lite/install.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INSTALL_DIR="${HOME}/.openclaw-lite"
REPO_URL="https://github.com/eortizs/commandr.git"
NODE_VERSION="20"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║       🦞 OpenClaw Lite Installer         ║"
echo "║   Asistente AI por WhatsApp - Simple     ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Funciones de utilidad
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar sistema
check_system() {
    print_status "Verificando sistema..."
    
    # OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "Sistema operativo no soportado: $OSTYPE"
        exit 1
    fi
    
    # Arquitectura
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        print_warning "Arquitectura no probada: $ARCH"
    fi
    
    print_success "Sistema compatible: $OS ($ARCH)"
}

# Verificar/instalar Node.js
install_node() {
    print_status "Verificando Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_CURRENT" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js $(node --version) ya instalado"
            return
        fi
    fi
    
    print_status "Instalando Node.js ${NODE_VERSION}..."
    
    if [[ "$OS" == "linux" ]]; then
        # Usar NodeSource
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install node@${NODE_VERSION}
        else
            print_error "Homebrew no encontrado. Instala Node.js manualmente."
            exit 1
        fi
    fi
    
    print_success "Node.js $(node --version) instalado"
}

# Verificar/instalar dependencias del sistema
install_system_deps() {
    print_status "Verificando dependencias del sistema..."
    
    if [[ "$OS" == "linux" ]]; then
        sudo apt-get update
        sudo apt-get install -y \
            git \
            curl \
            wget \
            python3 \
            python3-pip \
            python3-venv \
            ffmpeg \
            2>/dev/null || true
    elif [[ "$OS" == "macos" ]]; then
        brew install git curl wget python3 ffmpeg 2>/dev/null || true
    fi
    
    print_success "Dependencias del sistema instaladas"
}

# Clonar repositorio
clone_repo() {
    print_status "Descargando OpenClaw Lite..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        print_warning "Directorio existe. Actualizando..."
        cd "$INSTALL_DIR"
        git pull
    else
        git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        git sparse-checkout set openclaw-lite
    fi
    
    cd openclaw-lite
    print_success "OpenClaw Lite descargado en $INSTALL_DIR"
}

# Instalar dependencias npm
install_npm_deps() {
    print_status "Instalando dependencias npm..."
    
    npm install
    
    print_success "Dependencias npm instaladas"
}

# Configurar entorno
setup_env() {
    print_status "Configurando entorno..."
    
    if [[ ! -f ".env" ]]; then
        cp .env.example .env
        print_warning "Archivo .env creado. EDÍTALO para agregar tus API keys."
    fi
    
    # Crear directorios necesarios
    mkdir -p logs
    mkdir -p memory/sessions
    mkdir -p skills/user
    
    print_success "Estructura de directorios creada"
}

# Crear script de inicio
create_launcher() {
    print_status "Creando launcher..."
    
    LAUNCHER="${HOME}/.local/bin/openclaw-lite"
    mkdir -p "$(dirname "$LAUNCHER")"
    
    cat > "$LAUNCHER" << 'EOF'
#!/bin/bash
cd "${HOME}/.openclaw-lite/openclaw-lite"

# Cargar variables de entorno
if [[ -f ".env" ]]; then
    export $(grep -v '^#' .env | xargs)
fi

# Verificar API key
if [[ -z "$OPENAI_API_KEY" && -z "$OPENROUTER_API_KEY" ]]; then
    echo "❌ Error: Configura OPENAI_API_KEY o OPENROUTER_API_KEY en .env"
    exit 1
fi

echo "🦞 Iniciando OpenClaw Lite..."
echo "   WhatsApp: Escanea el QR code cuando aparezca"
echo ""
npm start
EOF
    
    chmod +x "$LAUNCHER"
    
    # Agregar a PATH si no está
    if [[ ":$PATH:" != *":${HOME}/.local/bin:"* ]]; then
        echo 'export PATH="${HOME}/.local/bin:${PATH}"' >> "${HOME}/.bashrc"
        print_warning "Agregado ${HOME}/.local/bin al PATH. Reinicia tu terminal."
    fi
    
    print_success "Launcher creado: openclaw-lite"
}

# Validar instalación
validate() {
    print_status "Validando instalación..."
    
    # Verificar Node
    if ! command -v node &> /dev/null; then
        print_error "Node.js no encontrado"
        return 1
    fi
    
    # Verificar estructura
    if [[ ! -f "package.json" ]]; then
        print_error "Estructura corrupta: package.json no encontrado"
        return 1
    fi
    
    # Verificar node_modules
    if [[ ! -d "node_modules" ]]; then
        print_error "node_modules no encontrado. Ejecuta: npm install"
        return 1
    fi
    
    print_success "Instalación validada"
}

# Mostrar siguiente pasos
next_steps() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     🎉 OpenClaw Lite instalado exitosamente!     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Próximos pasos:${NC}"
    echo ""
    echo "1. ${BLUE}Configurar API keys:${NC}"
    echo "   nano ${INSTALL_DIR}/openclaw-lite/.env"
    echo ""
    echo "   Opción A - OpenAI:"
    echo "   LLM_PROVIDER=openai"
    echo "   OPENAI_API_KEY=sk-..."
    echo ""
    echo "   Opción B - OpenRouter (más barato):"
    echo "   LLM_PROVIDER=openrouter"
    echo "   OPENROUTER_API_KEY=sk-or-v1-..."
    echo ""
    echo "2. ${BLUE}Iniciar:${NC}"
    echo "   openclaw-lite"
    echo ""
    echo "3. ${BLUE}Escanear QR con WhatsApp:${NC}"
    echo "   Abre WhatsApp → Configuración → Dispositivos vinculados"
    echo ""
    echo -e "${YELLOW}Documentación:${NC} https://github.com/eortizs/commandr/tree/main/openclaw-lite"
    echo ""
}

# Main
main() {
    check_system
    install_node
    install_system_deps
    clone_repo
    install_npm_deps
    setup_env
    create_launcher
    validate
    next_steps
}

main "$@"
