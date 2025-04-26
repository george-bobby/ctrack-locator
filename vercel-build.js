const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
if (!fs.existsSync('out')) {
  fs.mkdirSync('out', { recursive: true });
}

try {
  // Run the Next.js build
  console.log('Building Next.js static site...');
  execSync('next build', { stdio: 'inherit' });
  
  // Create a simple index.html file for SPA fallback
  console.log('Creating SPA fallback index.html...');
  
  // Copy the index.html from the out directory to ensure it has all the right scripts
  if (fs.existsSync(path.join('out', 'index.html'))) {
    const indexContent = fs.readFileSync(path.join('out', 'index.html'), 'utf8');
    
    // Create a _redirects file for SPA fallback
    console.log('Creating _redirects file...');
    fs.writeFileSync(path.join('out', '_redirects'), '/* /index.html 200');
    
    console.log('Static build completed successfully!');
  } else {
    console.error('Error: index.html not found in the out directory');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
