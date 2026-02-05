#!/bin/bash
# render-diagrams.sh
# Renders all PlantUML diagrams in this directory to PNG format

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "SALLY Architecture Diagram Renderer"
echo "================================================"
echo ""

# Check if plantuml is installed
if ! command -v plantuml &> /dev/null; then
    echo "❌ Error: plantuml is not installed"
    echo ""
    echo "Please install plantuml first:"
    echo ""
    echo "  macOS:    brew install plantuml"
    echo "  Ubuntu:   sudo apt-get install plantuml"
    echo "  Windows:  choco install plantuml"
    echo ""
    echo "Or use Docker:"
    echo "  docker run --rm -v \$(pwd):/data plantuml/plantuml -tpng \"/data/*.puml\""
    echo ""
    exit 1
fi

# Check if graphviz is installed (recommended for better rendering)
if ! command -v dot &> /dev/null; then
    echo "⚠️  Warning: graphviz is not installed (recommended)"
    echo "   Install with: brew install graphviz (macOS) or apt-get install graphviz (Linux)"
    echo ""
fi

# Count .puml files
puml_count=$(ls -1 *.puml 2>/dev/null | wc -l)

if [ "$puml_count" -eq 0 ]; then
    echo "❌ No .puml files found in this directory"
    exit 1
fi

echo "Found $puml_count PlantUML diagram(s) to render"
echo ""

# Create output directory for images
mkdir -p output
echo "Output directory: $SCRIPT_DIR/output"
echo ""

# Render each diagram
success_count=0
failed_count=0

for file in *.puml; do
    echo "🔄 Rendering: $file"

    if plantuml -tpng -o output "$file" 2>&1 | grep -i error; then
        echo "   ❌ Failed to render $file"
        ((failed_count++))
    else
        output_file="output/$(basename "$file" .puml).png"
        if [ -f "$output_file" ]; then
            file_size=$(du -h "$output_file" | cut -f1)
            echo "   ✅ Success: $output_file ($file_size)"
            ((success_count++))
        else
            echo "   ❌ Output file not created: $output_file"
            ((failed_count++))
        fi
    fi
    echo ""
done

echo "================================================"
echo "Rendering Summary"
echo "================================================"
echo "✅ Successfully rendered: $success_count diagram(s)"
echo "❌ Failed to render: $failed_count diagram(s)"
echo ""

if [ $success_count -gt 0 ]; then
    echo "Generated PNG files are in: $SCRIPT_DIR/output/"
    echo ""
    echo "You can also render to other formats:"
    echo "  SVG:  plantuml -tsvg *.puml"
    echo "  PDF:  plantuml -tpdf *.puml"
    echo ""
fi

exit 0
