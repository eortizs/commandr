# Skill: video-processor

Procesa videos usando ffmpeg.

## Dependencias

```json
{
  "system": ["ffmpeg"],
  "npm": ["fluent-ffmpeg"]
}
```

## Instalación

```bash
# 1. Instalar ffmpeg (sistema)
sudo apt install ffmpeg

# 2. Instalar dependencias npm
npm install fluent-ffmpeg
```

## Uso

```javascript
// En la skill
const ffmpeg = require('fluent-ffmpeg');

async execute(args, tools) {
    const [inputPath, operation] = args;
    
    switch(operation) {
        case 'extract-audio':
            return await this.extractAudio(inputPath);
        case 'compress':
            return await this.compressVideo(inputPath);
        default:
            throw new Error('Operación no soportada');
    }
}

async extractAudio(inputPath) {
    const outputPath = inputPath.replace('.mp4', '.mp3');
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .output(outputPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .on('end', () => {
                resolve(`Audio extraído: ${outputPath}`);
            })
            .on('error', reject)
            .run();
    });
}
```

## Ejemplo

```
video-processor /path/video.mp4 extract-audio
```
