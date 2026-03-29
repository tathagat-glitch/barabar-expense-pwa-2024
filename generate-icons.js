#!/usr/bin/env node

// Simple icon generation script
// In a real project, you'd use a proper icon generation tool like sharp or puppeteer
// For now, this creates placeholder files with the correct sizes

const fs = require('fs');
const path = require('path');

const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create placeholder icon files
iconSizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}.png`);
  if (!fs.existsSync(iconPath)) {
    // Create a simple placeholder - in reality you'd generate actual PNG files
    fs.writeFileSync(iconPath, `PLACEHOLDER_ICON_${size}x${size}`);
    console.log(`Created placeholder icon: icon-${size}.png`);
  }
});

console.log('Icon generation complete!');
console.log('Note: Replace placeholder files with actual PNG icons for production.');
