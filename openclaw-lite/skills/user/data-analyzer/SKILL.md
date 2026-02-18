# Skill: data-analyzer

Analiza datos CSV usando Python y pandas.

## Dependencias

```json
{
  "pip": ["pandas", "numpy", "matplotlib"]
}
```

## Estructura

```
data-analyzer/
├── index.js          # Entry point
├── analyze.py        # Script Python
└── SKILL.md
```

## Código JavaScript (index.js)

```javascript
const path = require('path');

class DataAnalyzerSkill {
    async execute(args, tools) {
        const [csvPath, analysisType] = args;
        
        // Usar el dependency manager para ejecutar Python
        const scriptPath = path.join(__dirname, 'analyze.py');
        
        const result = await tools.runPython(
            'data-analyzer',
            scriptPath,
            [csvPath, analysisType]
        );
        
        return result.stdout;
    }
}

module.exports = new DataAnalyzerSkill();
```

## Código Python (analyze.py)

```python
import pandas as pd
import sys

def analyze(csv_path, analysis_type):
    df = pd.read_csv(csv_path)
    
    if analysis_type == 'summary':
        return df.describe().to_string()
    elif analysis_type == 'correlation':
        return df.corr().to_string()
    elif analysis_type == 'missing':
        return df.isnull().sum().to_string()
    else:
        return "Tipo de análisis no soportado"

if __name__ == '__main__':
    csv_path = sys.argv[1]
    analysis_type = sys.argv[2]
    print(analyze(csv_path, analysis_type))
```

## Uso

```
data-analyzer /path/data.csv summary
data-analyzer /path/data.csv correlation
data-analyzer /path/data.csv missing
```
