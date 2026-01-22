# Quick Visualization Guide for REST-OS Architecture Diagrams

This guide provides the fastest ways to visualize the C4 model diagrams.

## 🚀 Fastest Methods

### Method 1: VS Code Extension (Best for Development)

**Setup (One-time)**:
1. Install VS Code extension: `PlantUML` by jebbs
2. Install Java: `brew install openjdk` (required by PlantUML)

**Usage**:
1. Open any `.puml` file in VS Code
2. Press `Alt + D` (Windows/Linux) or `Option + D` (Mac)
3. Preview appears side-by-side

**Export**:
- Press `Alt + Shift + E` to export as PNG/SVG

**Pros**: Live preview, easy export, integrated with editor
**Cons**: Requires VS Code and Java

---

### Method 2: Online PlantUML Server (No Installation)

**Usage**:
1. Go to: http://www.plantuml.com/plantuml/uml/
2. Copy entire contents of any `.puml` file
3. Paste into the text area
4. Diagram renders automatically
5. Download via the "PNG", "SVG", or "TXT" buttons

**Pros**: No installation, works anywhere, instant
**Cons**: Requires internet, manual copy-paste

**Quick Links**:
- PlantUML Editor: http://www.plantuml.com/plantuml/uml/
- Alternative: https://plantuml-editor.kkeisuke.com/

---

### Method 3: Command Line (For Batch Rendering)

**Setup**:
```bash
# macOS
brew install plantuml graphviz

# Ubuntu/Debian
sudo apt-get install plantuml graphviz

# Windows (with Chocolatey)
choco install plantuml graphviz
```

**Render All Diagrams**:
```bash
cd /Users/ajay-admin/rest-os/docs/architecture
./render-diagrams.sh
```

This creates PNG files in `output/` directory.

**Manual Rendering**:
```bash
# Single file
plantuml c4-level1-context.puml

# All files
plantuml *.puml

# To SVG
plantuml -tsvg *.puml

# To PDF
plantuml -tpdf *.puml
```

**Pros**: Batch processing, scriptable, high quality
**Cons**: Requires installation

---

### Method 4: Docker (No Local Installation)

**Render All Diagrams**:
```bash
cd /Users/ajay-admin/rest-os/docs/architecture

docker run --rm -v $(pwd):/data plantuml/plantuml -tpng "/data/*.puml"
```

PNG files are created in the current directory.

**Pros**: No local installation (except Docker), consistent environment
**Cons**: Requires Docker, slower than native

---

## 📊 Available Diagrams

| Diagram | File | What It Shows |
|---------|------|---------------|
| **System Context** | `c4-level1-context.puml` | Users, external systems, system boundary |
| **Containers** | `c4-level2-container.puml` | Frontend, Backend, Database, Redis |
| **Backend Components** | `c4-level3-component-backend.puml` | API endpoints, engines, repositories |
| **Frontend Components** | `c4-level3-component-frontend.puml` | Dashboard, forms, state management |
| **HOS Engine Code** | `c4-level4-code-hos-engine.puml` | HOS validation class structure |
| **Optimization Engine** | `c4-level4-code-optimization-engine.puml` | Rest recommendation logic |
| **Sequence Flow** | `sequence-rest-optimization.puml` | End-to-end request flow |
| **Deployment** | `deployment-diagram.puml` | Docker containers and networking |
| **Data Flow** | `data-flow-diagram.puml` | Data transformation pipeline |

---

## 🎨 Viewing Pre-Rendered Images

If PNG files are already generated in `output/`:

```bash
# macOS - Open all images
open output/*.png

# Linux
xdg-open output/*.png

# Windows
start output/*.png
```

---

## 🔧 Troubleshooting

### "plantuml: command not found"

**Solution**: Install PlantUML
```bash
# macOS
brew install plantuml

# Ubuntu
sudo apt-get install plantuml
```

### "Error: Cannot find Java"

**Solution**: Install Java runtime
```bash
# macOS
brew install openjdk

# Ubuntu
sudo apt-get install default-jre
```

### Diagrams look pixelated or low quality

**Solution**: Install Graphviz for better rendering
```bash
# macOS
brew install graphviz

# Ubuntu
sudo apt-get install graphviz
```

### "Error reading file"

**Solution**: Ensure you're in the correct directory
```bash
cd /Users/ajay-admin/rest-os/docs/architecture
ls *.puml  # Should list all diagram files
```

---

## 📝 Editing Diagrams

### Syntax Basics

PlantUML uses simple text syntax:

```plantuml
@startuml
Person(user, "User", "Description")
System(app, "Application", "What it does")

Rel(user, app, "Uses", "HTTPS")
@enduml
```

### Key Elements

**C4 Context/Container**:
- `Person()` - External user
- `System()` - Main system
- `System_Ext()` - External system
- `Container()` - Application container
- `ContainerDb()` - Database container
- `Rel()` - Relationship/arrow

**Component**:
- `Component()` - Internal component
- Different arrow types show different relationships

**Code**:
- `class` - Class definition
- `+` - Public method
- `-` - Private method
- `-->` - Dependency arrow
- `*--` - Composition

### Live Preview While Editing

Use VS Code with PlantUML extension for the best experience:
1. Open `.puml` file
2. Press `Alt + D` for preview
3. Edit file - preview updates automatically

---

## 🎯 Recommended Workflow

**For Quick Review**:
→ Use Online PlantUML Server (no installation)

**For Development**:
→ Use VS Code Extension (live preview while editing)

**For Documentation**:
→ Use Command Line to generate PNGs for commit

**For CI/CD** (Future):
→ Use Docker in GitHub Actions to auto-generate diagrams

---

## 📦 Export Options

### PNG (Recommended for Documentation)
```bash
plantuml -tpng *.puml
```
Best for: README files, wikis, presentations

### SVG (Recommended for Web)
```bash
plantuml -tsvg *.puml
```
Best for: Scalable graphics, high-DPI displays

### PDF (Recommended for Print)
```bash
plantuml -tpdf *.puml
```
Best for: Documentation PDFs, architecture reviews

### ASCII Art
```bash
plantuml -ttxt *.puml
```
Best for: Terminal viewing, plain text docs

---

## 🔗 Useful Resources

- **PlantUML Official**: https://plantuml.com/
- **C4 Model**: https://c4model.com/
- **PlantUML C4 Library**: https://github.com/plantuml-stdlib/C4-PlantUML
- **Online Editor**: http://www.plantuml.com/plantuml/uml/
- **Cheat Sheet**: https://plantuml.com/guide

---

## 💡 Tips

1. **Start with Level 1** (System Context) to understand the big picture
2. **Drill down progressively** through levels 2, 3, 4
3. **Use sequence diagrams** to understand runtime behavior
4. **Refer to data flow diagram** to trace data transformations
5. **Check deployment diagram** to understand infrastructure

---

## 🤝 Contributing

When updating architecture:
1. Update the relevant `.puml` file
2. Regenerate diagrams with `./render-diagrams.sh`
3. Commit both `.puml` source and generated PNGs
4. Update `README.md` if architecture changes significantly

---

**Quick Start**: Just want to see the diagrams?
→ Go to http://www.plantuml.com/plantuml/uml/ and paste any `.puml` file!
