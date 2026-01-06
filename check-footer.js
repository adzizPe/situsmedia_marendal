const fs = require('fs');
const path = require('path');

// Find all HTML files recursively
function findHtmlFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findHtmlFiles(fullPath, files);
        } else if (item.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

// Check files
const rootDir = 'd:/situsberita_marendal';
const htmlFiles = findHtmlFiles(rootDir);

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');

    // Check for text-based logo in footer-brand that's NOT an image
    if (content.includes('footer-brand')) {
        // Check if footer-brand section still has text instead of image
        const footerMatch = content.match(/footer-brand[\s\S]{0,500}/);
        if (footerMatch && !footerMatch[0].includes('marendallogo.png')) {
            console.log('Footer needs update:', file);
        }
    }
}

console.log('Check complete.');
