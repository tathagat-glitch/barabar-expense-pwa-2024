#!/usr/bin/env node
/**
 * PWA Icon Generator Script
 * Converts your logo image to all required PWA icon sizes
 * 
 * Usage: node generate-pwa-icons.js [path-to-your-image]
 * 
 * Requirements: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Required PWA icon sizes
const ICON_SIZES = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon.ico': [16, 32, 48], // ICO format supports multiple sizes
  'icon-192x192.png': 192,
  'icon-512x512.png': 512,
  'apple-touch-icon.png': 180,
  'icon-72x72.png': 72,
  'icon-96x96.png': 96,
  'icon-128x128.png': 128,
  'icon-144x144.png': 144,
  'icon-152x152.png': 152,
  'icon-384x384.png': 384
};

async function generateIcons(inputPath, outputDir = './public') {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log('🎨 Generating PWA icons from:', inputPath);
    
    // Generate PNG icons
    for (const [filename, size] of Object.entries(ICON_SIZES)) {
      if (filename === 'favicon.ico') continue; // Handle ICO separately
      
      const outputPath = path.join(outputDir, filename);
      
      if (Array.isArray(size)) {
        // For ICO, we'll use the largest size
        await sharp(inputPath)
          .resize(Math.max(...size), Math.max(...size), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toFile(outputPath);
      } else {
        await sharp(inputPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toFile(outputPath);
      }
      
      console.log(`✅ Generated ${filename} (${size}px)`);
    }
    
    // Generate ICO file (using the largest size for simplicity)
    const icoPath = path.join(outputDir, 'favicon.ico');
    await sharp(inputPath)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(icoPath);
    console.log(`✅ Generated favicon.ico`);
    
    console.log('\n🎉 All PWA icons generated successfully!');
    console.log('📁 Icons saved to:', outputDir);
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log('Usage: node generate-pwa-icons.js <path-to-your-image>');
    console.log('Example: node generate-pwa-icons.js ./my-logo.png');
    process.exit(1);
  }
  generateIcons(inputPath);
}

module.exports = { generateIcons };
