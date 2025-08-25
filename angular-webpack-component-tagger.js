/**
 * Angular Webpack Component Tagger for Dyad.sh
 * Adds data-dyad-id and data-dyad-name attributes to Angular components
 * Compatible with Angular's AOT compilation and Ivy renderer
 */

const path = require('path');

class AngularComponentTagger {
  apply(compiler) {
    compiler.hooks.compilation.tap('AngularComponentTagger', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'AngularComponentTagger',
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
        },
        (assets) => {
          // Only run in development mode
          if (process.env.NODE_ENV !== 'development') {
            return;
          }

          Object.entries(assets).forEach(([pathname, source]) => {
            if (pathname.endsWith('.js')) {
              let content = source.source();
              
              // Pattern to match Angular component decorators and their metadata
              const componentPattern = /ɵɵdefineComponent\(\{[^}]*selectors:\s*\[\s*\[\s*["']([^"']+)["']\s*\]\s*\]/g;
              
              // Track components we've found
              const componentsFound = new Map();
              
              // Find all component definitions
              let match;
              while ((match = componentPattern.exec(content)) !== null) {
                const selector = match[1];
                const startIndex = match.index;
                
                // Extract component name from the context
                const beforeMatch = content.substring(Math.max(0, startIndex - 200), startIndex);
                const componentNameMatch = beforeMatch.match(/class\s+(\w+Component)\s*\{/);
                const componentName = componentNameMatch ? componentNameMatch[1] : selector;
                
                componentsFound.set(selector, componentName);
              }
              
              // Add tagging logic to component templates
              componentsFound.forEach((componentName, selector) => {
                // Pattern to match the component's template function
                const templatePattern = new RegExp(
                  `(ɵɵelementStart\\(\\d+,\\s*["']${selector}["'][^)]*\\))`,
                  'g'
                );
                
                content = content.replace(templatePattern, (match, elementStart) => {
                  // Extract the file path from source maps if available
                  const filePathMatch = pathname.match(/src[/\\](.+?)\.js$/);
                  const filePath = filePathMatch ? filePathMatch[1].replace(/\\/g, '/') + '.ts' : pathname;
                  
                  // Insert data attributes after the element start
                  const dataAttributes = `
                    ɵɵattribute("data-dyad-id", "${filePath}:0:0");
                    ɵɵattribute("data-dyad-name", "${componentName}");
                  `;
                  
                  return elementStart + ';' + dataAttributes;
                });
              });
              
              // Handle standalone component usage in templates
              const elementPattern = /<([a-z-]+)([^>]*)>/gi;
              content = content.replace(elementPattern, (match, tagName, attributes) => {
                if (componentsFound.has(tagName)) {
                  const componentName = componentsFound.get(tagName);
                  const filePathMatch = pathname.match(/src[/\\](.+?)\.js$/);
                  const filePath = filePathMatch ? filePathMatch[1].replace(/\\/g, '/') + '.ts' : pathname;
                  
                  // Add data attributes if not already present
                  if (!attributes.includes('data-dyad-id')) {
                    return `<${tagName} data-dyad-id="${filePath}:0:0" data-dyad-name="${componentName}"${attributes}>`;
                  }
                }
                return match;
              });
              
              compilation.updateAsset(pathname, new compiler.webpack.sources.RawSource(content));
            }
          });
        }
      );
    });
  }
}

module.exports = AngularComponentTagger;