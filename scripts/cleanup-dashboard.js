// Dashboard Component Cleanup Script

/**
 * This script identifies unused components and helps clean up the dashboard.
 * It cross-references imports with actual usage and suggests files that can be removed.
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.resolve(__dirname, '..', 'src', 'views', 'admin', 'default');
const COMPONENTS_ROOT = path.resolve(__dirname, '..', 'src', 'components', 'dashboard');

// Main dashboard file
const dashboardFile = path.join(DASHBOARD_ROOT, 'index.jsx');

// Read the dashboard file
const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

// Find all imports
const importRegex = /import\s+(\w+|\{\s*[\w\s,]+\s*\})\s+from\s+['"]([^'"]+)['"]/g;
const imports = [...dashboardContent.matchAll(importRegex)].map(match => {
    const importString = match[1];
    const importPath = match[2];

    // Extract imported names
    let importedNames = [];
    if (importString.startsWith('{')) {
        // Named imports
        importedNames = importString
            .replace(/[{}]/g, '')
            .split(',')
            .map(name => name.trim());
    } else {
        // Default import
        importedNames = [importString.trim()];
    }

    return {
        names: importedNames,
        path: importPath
    };
});

// Find component usages
const findComponentUsages = (content, componentName) => {
    // Look for JSX usage: <ComponentName
    const jsxRegex = new RegExp(`<${componentName}\\s`, 'g');
    const jsxMatches = content.match(jsxRegex) || [];

    // Look for references in code: ComponentName.
    const refRegex = new RegExp(`\\b${componentName}\\.`, 'g');
    const refMatches = content.match(refRegex) || [];

    // Look for variable assignments: = ComponentName
    const assignRegex = new RegExp(`=\\s*${componentName}\\b`, 'g');
    const assignMatches = content.match(assignRegex) || [];

    return jsxMatches.length + refMatches.length + assignMatches.length;
};

// Track the status of each component
const componentStatus = {};

// Process each dashboard component import
imports.forEach(importInfo => {
    if (importInfo.path.includes('components/dashboard') ||
        importInfo.path.includes('components\\dashboard')) {

        importInfo.names.forEach(name => {
            const usages = findComponentUsages(dashboardContent, name);
            componentStatus[name] = {
                usages,
                used: usages > 0,
                importPath: importInfo.path
            };
        });
    }
});

// Map import paths to actual files
const dashboardComponents = fs.readdirSync(COMPONENTS_ROOT)
    .filter(file => file.endsWith('.jsx') || file.endsWith('.tsx'));

// Find duplicated or unused components
console.log('Dashboard Component Analysis:');
console.log('--------------------------');

console.log('Components used in the dashboard:');
Object.entries(componentStatus)
    .filter(([_, status]) => status.used)
    .forEach(([name, status]) => {
        console.log(`- ${name}: ${status.usages} usages`);
    });

console.log('\nComponents imported but not used:');
Object.entries(componentStatus)
    .filter(([_, status]) => !status.used)
    .forEach(([name, status]) => {
        console.log(`- ${name} (imported from ${status.importPath})`);
    });

console.log('\nComponent files in directory but not imported:');
const importedFiles = new Set(
    Object.values(componentStatus)
        .map(status => {
            const parts = status.importPath.split('/');
            return parts[parts.length - 1] + '.jsx';
        })
);

dashboardComponents
    .filter(file => !importedFiles.has(file))
    .forEach(file => {
        console.log(`- ${file}`);
    });

console.log('\nOptimization Guidance:');
console.log('1. Remove unused imported components from index.jsx');
console.log('2. Consolidated similar functionality (e.g. ElectricalReadingsPanel now includes RealtimeDataMonitor)');
console.log('3. IkhtisarSection was optimized and simplified');
console.log('4. Delete unused component files if they are truly no longer needed');
