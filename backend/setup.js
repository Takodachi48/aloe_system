#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🌿 Setting up AloeShield project...\n');

// Create required directories
const directories = [
    'uploads',
    'uploads/thumbnails',
    'database',
    'logs'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`📁 Directory already exists: ${dir}`);
    }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from template');
    console.log('⚠️  Please edit .env file with your configuration');
} else if (fs.existsSync(envPath)) {
    console.log('📄 .env file already exists');
} else {
    console.log('⚠️  env.example not found, creating basic .env file');
    const basicEnv = `# Server Configuration\nPORT=3000\nNODE_ENV=development\n\n# Security\nJWT_SECRET=change-this-to-a-secure-random-string\n\n# Database\nDATABASE_PATH=./database/aloeshield.db\n`;
    fs.writeFileSync(envPath, basicEnv);
    console.log('✅ Created basic .env file');
}

// Create .gitignore if it doesn't exist
const gitignorePath = path.join(__dirname, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# Dependencies\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# Environment variables\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n\n# Database\ndatabase/*.db\ndatabase/*.db-journal\n\n# Uploads\nuploads/*\n!uploads/.gitkeep\n\n# Logs\nlogs/\n*.log\n\n# Runtime data\npids\n*.pid\n*.seed\n*.pid.lock\n\n# Coverage directory used by tools like istanbul\ncoverage/\n\n# nyc test coverage\n.nyc_output\n\n# Dependency directories\nnode_modules/\njspm_packages/\n\n# Optional npm cache directory\n.npm\n\n# Optional REPL history\n.node_repl_history\n\n# Output of 'npm pack'\n*.tgz\n\n# Yarn Integrity file\n.yarn-integrity\n\n# dotenv environment variables file\n.env\n\n# parcel-bundler cache (https://parceljs.org/)\n.cache\n.parcel-cache\n\n# next.js build output\n.next\n\n# nuxt.js build output\n.nuxt\n\n# vuepress build output\n.vuepress/dist\n\n# Serverless directories\n.serverless\n\n# Operating System\n.DS_Store\n.DS_Store?\n._*\n.Spotlight-V100\n.Trashes\nehthumbs.db\nThumbs.db\n\n# IDE\n.vscode/\n.idea/\n*.swp\n*.swo\n*~\n\n# Temporary files\ntmp/\ntemp/\n`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ Created .gitignore file');
} else {
    console.log('📄 .gitignore file already exists');
}

// Create .gitkeep files for upload directories
const gitkeepDirs = ['uploads', 'uploads/thumbnails'];
gitkeepDirs.forEach(dir => {
    const gitkeepPath = path.join(__dirname, dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        console.log(`✅ Created .gitkeep in ${dir}`);
    }
});

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Review and edit the .env file with your configuration');
console.log('2. Run "npm install" to install dependencies');
console.log('3. Run "npm run dev" to start the development server');
console.log('4. Open http://localhost:3000 in your browser');
console.log('\n🌿 Happy plant disease detection!');
