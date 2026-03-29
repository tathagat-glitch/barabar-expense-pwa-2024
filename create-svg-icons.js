const fs = require('fs');
const path = require('path');

const ICON_SIZES = {
    'favicon-16x16.svg': 16,
    'favicon-32x32.svg': 32,
    'icon-72x72.svg': 72,
    'icon-96x96.svg': 96,
    'icon-128x128.svg': 128,
    'icon-144x144.svg': 144,
    'icon-152x152.svg': 152,
    'icon-192x192.svg': 192,
    'icon-384x384.svg': 384,
    'icon-512x512.svg': 512,
    'apple-touch-icon.svg': 180
};

function createSVGIcon(size, outputPath) {
    // Create a professional SVG icon with gradient
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow${size}">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/>
        </filter>
    </defs>
    <rect width="${size}" height="${size}" rx="${size/8}" fill="url(#grad${size})" filter="url(#shadow${size})"/>
    ${size >= 72 ? `
    <text x="${size/2}" y="${size/2}" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="${size/3}" 
          font-weight="bold" 
          fill="white" 
          text-anchor="middle" 
          dominant-baseline="middle">B</text>
    ` : ''}
</svg>`;
    
    fs.writeFileSync(outputPath, svg);
}

console.log('🎨 Generating PWA SVG icons...');

// Ensure icons directory exists
const iconsDir = './public/icons';
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

Object.entries(ICON_SIZES).forEach(([filename, size]) => {
    const outputPath = path.join(iconsDir, filename);
    createSVGIcon(size, outputPath);
    console.log(`✅ Generated ${filename} (${size}px)`);
});

// Create a simple favicon.ico (SVG-based)
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="32" height="32" rx="4" fill="url(#grad)"/>
    <text x="16" y="20" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">B</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('✅ Generated favicon.svg');

console.log('\n🎉 All PWA icons generated successfully!');
console.log('📁 Icons saved to: ./public/icons/');
console.log('\n💡 Note: These are SVG placeholder icons with a "B" for "Barabar"');
console.log('   To use your actual image, visit: https://realfavicongenerator.net/');
