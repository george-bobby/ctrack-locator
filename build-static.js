const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the Next.js build
console.log('Building Next.js static site...');
execSync('npm run build', { stdio: 'inherit' });

// Create a simple _redirects file for SPA fallback if needed
console.log('Creating SPA fallback redirects...');
const redirectsContent = '/* /index.html 200';
fs.writeFileSync(path.join(__dirname, 'out', '_redirects'), redirectsContent);

console.log('Static build completed successfully!');
