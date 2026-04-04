<?php

/**
 * Configuration
 */
define('TARGET_SIZE', 32);
define('PADDING', 4);
define('TARGET_STROKE', 2);
define('SVG_DIR', 'svg');
define('OUTPUT_FILE', 'icons.js');

function processSvg($svgContent) {
    // 1. Clean up whitespace and line breaks
    $svgContent = preg_replace("/\r|\n/", '', $svgContent);
    $svgContent = preg_replace("/\s+|\t/", ' ', $svgContent);

    $dom = new DOMDocument();
    // Suppress errors for SVGs with custom tags or namespaces
    @$dom->loadXML($svgContent);

    if (!$dom->documentElement) return null;

    $svg = $dom->documentElement;

    // 2. Extract original dimensions for math
    $oldVb = $svg->getAttribute('viewBox');
    $vbParts = preg_split('/[\s,]+/', trim($oldVb));
    
    $minX = (count($vbParts) === 4) ? (float)$vbParts[0] : 0;
    $minY = (count($vbParts) === 4) ? (float)$vbParts[1] : 0;
    $oldW = (count($vbParts) === 4) ? (float)$vbParts[2] : 24;
    $oldH = (count($vbParts) === 4) ? (float)$vbParts[3] : 24;

    // 3. Calculate Scaling and Positioning
    $innerSize = TARGET_SIZE - (PADDING * 2);
    $scale = min($innerSize / $oldW, $innerSize / $oldH);
    
    $newWidth = $oldW * $scale;
    $newHeight = $oldH * $scale;
    $dx = (TARGET_SIZE - $newWidth) / 2 - ($minX * $scale);
    $dy = (TARGET_SIZE - $newHeight) / 2 - ($minY * $scale);

    // 4. Process all elements (Colors, Strokes, and Cleanup)
    $elements = $dom->getElementsByTagName('*');
    foreach ($elements as $element) {
        cleanElement($element, $scale);
    }

    // 5. Transform the SVG structure
    $group = $dom->createElement('g');
    $transform = sprintf('translate(%.4f, %.4f) scale(%.4f)', $dx, $dy, $scale);
    $group->setAttribute('transform', $transform);

    // Move all current children into the new centered/scaled group
    while ($svg->hasChildNodes()) {
        $child = $svg->firstChild;
        $svg->removeChild($child);
        $group->appendChild($child);
    }
    $svg->appendChild($group);

    // 6. Set final Root Attributes
    $svg->setAttribute('width', (string)TARGET_SIZE);
    $svg->setAttribute('height', (string)TARGET_SIZE);
    $svg->setAttribute('viewBox', "0 0 " . TARGET_SIZE . " " . TARGET_SIZE);
    $svg->setAttribute('class', 'ge');
    $svg->removeAttribute('style');

    // Final sorting of root attributes
    sortAttributes($svg);

    // Return XML without the <?xml declaration
    return $dom->saveXML($svg);
}

function cleanElement($element, $scale) {
    // Remove class and style
    if ($element->hasAttribute('class')) $element->removeAttribute('class');
    if ($element->hasAttribute('style')) $element->removeAttribute('style');

    // Color and Stroke Normalization
    $colorAttribs = ['fill', 'stroke'];
    foreach ($colorAttribs as $attr) {
        if ($element->hasAttribute($attr)) {
            $value = strtolower(trim($element->getAttribute($attr)));
            if ($value !== 'none' && $value !== 'transparent') {
                $element->setAttribute($attr, 'currentColor');
                
                if ($attr === 'stroke') {
                    // Correct stroke weight based on scale
                    $normalizedStroke = TARGET_STROKE / $scale;
                    $element->setAttribute('stroke-width', (string)round($normalizedStroke, 2));
                    $element->setAttribute('stroke-linecap', 'round');
                    $element->setAttribute('stroke-linejoin', 'round');
                }
            }
        }
    }
    
    if ($element->nodeName !== 'svg') {
        sortAttributes($element);
    }
}

function sortAttributes($element) {
    $attrs = [];
    foreach ($element->attributes as $attr) {
        $attrs[$attr->name] = $attr->value;
    }
    ksort($attrs);
    foreach ($attrs as $name => $value) {
        $element->removeAttribute($name);
        $element->setAttribute($name, $value);
    }
}

function generateIconsJs($directory) {
    $icons = [];
    if (!is_dir($directory)) {
        die("Directory '$directory' not found.");
    }

    $files = glob($directory . '/*.svg');
    sort($files);

    foreach ($files as $file) {
        $iconName = basename($file, '.svg');
        $rawContent = file_get_contents($file);
        $processed = processSvg($rawContent);

        if ($processed) {
            // Remove comments and metadata
            $processed = preg_replace('//s', '', $processed);
            $processed = preg_replace('/<\?xml.*?\?>/s', '', $processed);
            $icons[$iconName] = $processed;
        }
    }

    $jsContent = 'const icons = ' . json_encode($icons, JSON_PRETTY_PRINT) . ';' . PHP_EOL;
    $jsContent .= "export default icons;";

    file_put_contents(OUTPUT_FILE, $jsContent);
    echo "Success! " . count($icons) . " icons processed into " . OUTPUT_FILE . PHP_EOL;
}

// Execute
generateIconsJs(SVG_DIR);

// Redirect to the referring page
//$referrer = $_SERVER['HTTP_REFERER'] ?? '/'; // Fallback to root if no referrer
//header("Location: index.html");
exit();
?>