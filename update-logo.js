const fs = require('fs');
const path = require('path');

// Old logo text to find
const oldLogo = '<span class="logo-text">Marendal<span class="logo-accent">Satu</span></span>';

// New logo image
const newLogo = '<a href="/" class="logo-link"><img src="/assets/marendallogo.png" alt="MarendalSatu" class="logo-img"></a>';

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

// Update files
const rootDir = 'd:/situsberita_marendal';
const htmlFiles = findHtmlFiles(rootDir);

let updated = 0;
for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldLogo)) {
        content = content.split(oldLogo).join(newLogo);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
        updated++;
    }
}

console.log(`\nTotal updated: ${updated} files`);
