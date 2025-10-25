#!/usr/bin/env node

/**
 * Lighthouse Audit Script
 * Comprehensive performance, accessibility, and SEO audit
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Lighthouse configuration
const LIGHTHOUSE_CONFIG = {
  thresholds: {
    performance: 95,
    accessibility: 95,
    bestPractices: 95,
    seo: 95,
    pwa: 90
  },
  categories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  output: ['json', 'html'],
  viewport: {
    width: 1280,
    height: 720
  },
  throttling: {
    rttMs: 40,
    throughputKbps: 10240,
    cpuSlowdownMultiplier: 1
  }
};

class LighthouseAuditor {
  constructor() {
    this.results = {
      summary: {},
      details: {},
      recommendations: [],
      scores: {}
    };
  }

  async run() {
    console.log('🔍 Starting Lighthouse audit...\n');
    
    try {
      // Check if Lighthouse is installed
      await this.checkLighthouseInstallation();
      
      // Run audit for different pages
      const pages = await this.getAuditPages();
      
      for (const page of pages) {
        console.log(`📊 Auditing ${page.name}...`);
        const result = await this.auditPage(page);
        this.results.details[page.name] = result;
      }
      
      // Generate summary
      this.generateSummary();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Save reports
      await this.saveReports();
      
      console.log('\n✅ Lighthouse audit completed!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Lighthouse audit failed:', error);
      process.exit(1);
    }
  }

  async checkLighthouseInstallation() {
    try {
      execSync('lighthouse --version', { stdio: 'pipe' });
      console.log('✅ Lighthouse is installed');
    } catch (error) {
      console.log('📦 Installing Lighthouse...');
      execSync('npm install -g lighthouse', { cwd: projectRoot });
    }
  }

  async getAuditPages() {
    return [
      {
        name: 'homepage',
        url: 'http://localhost:3000',
        description: 'Main landing page'
      },
      {
        name: 'dashboard',
        url: 'http://localhost:3000/dashboard',
        description: 'User dashboard'
      },
      {
        name: 'calculator',
        url: 'http://localhost:3000/calculator',
        description: 'Mortgage calculator'
      },
      {
        name: 'rates',
        url: 'http://localhost:3000/rates',
        description: 'Rate comparison page'
      }
    ];
  }

  async auditPage(page) {
    const outputDir = path.join(projectRoot, 'reports', 'lighthouse');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputFile = path.join(outputDir, `${page.name}-audit`);
    
    try {
      const command = `lighthouse ${page.url} \
        --output=json,html \
        --output-path=${outputFile} \
        --chrome-flags="--headless" \
        --view \
        --quiet`;
      
      execSync(command, { cwd: projectRoot, stdio: 'pipe' });
      
      // Read JSON results
      const jsonFile = `${outputFile}.report.json`;
      const jsonContent = await fs.readFile(jsonFile, 'utf8');
      const data = JSON.parse(jsonContent);
      
      return this.parseLighthouseResults(data, page);
      
    } catch (error) {
      console.warn(`⚠️  Failed to audit ${page.name}:`, error.message);
      return this.generateErrorResult(page);
    }
  }

  parseLighthouseResults(data, page) {
    const scores = {};
    const audits = {};
    
    // Extract scores
    for (const category of LIGHTHOUSE_CONFIG.categories) {
      if (data.categories[category]) {
        scores[category] = Math.round(data.categories[category].score * 100);
      }
    }
    
    // Extract key audits
    const keyAudits = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'first-input-delay',
      'speed-index',
      'total-blocking-time',
      'interactive',
      'color-contrast',
      'image-alt',
      'label',
      'meta-description',
      'document-title'
    ];
    
    for (const auditId of keyAudits) {
      if (data.audits[auditId]) {
        audits[auditId] = {
          score: data.audits[auditId].score,
          displayValue: data.audits[auditId].displayValue,
          description: data.audits[auditId].description,
          details: data.audits[auditId].details
        };
      }
    }
    
    return {
      page: page.name,
      url: page.url,
      scores,
      audits,
      timestamp: new Date().toISOString(),
      lighthouseVersion: data.lighthouseVersion,
      userAgent: data.userAgent
    };
  }

  generateErrorResult(page) {
    return {
      page: page.name,
      url: page.url,
      scores: {},
      audits: {},
      timestamp: new Date().toISOString(),
      error: 'Audit failed - page may not be accessible'
    };
  }

  generateSummary() {
    const pages = Object.values(this.results.details);
    const summary = {
      totalPages: pages.length,
      averageScores: {},
      overallHealth: 'unknown',
      criticalIssues: [],
      recommendations: []
    };
    
    // Calculate average scores
    for (const category of LIGHTHOUSE_CONFIG.categories) {
      const scores = pages
        .filter(page => page.scores && page.scores[category])
        .map(page => page.scores[category]);
      
      if (scores.length > 0) {
        summary.averageScores[category] = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
      }
    }
    
    // Determine overall health
    const thresholds = LIGHTHOUSE_CONFIG.thresholds;
    const meetsThresholds = Object.entries(summary.averageScores).every(
      ([category, score]) => score >= (thresholds[category] || 0)
    );
    
    summary.overallHealth = meetsThresholds ? 'excellent' : 'needs-improvement';
    
    this.results.summary = summary;
  }

  generateRecommendations() {
    const recommendations = [];
    const pages = Object.values(this.results.details);
    
    // Performance recommendations
    const performancePages = pages.filter(page => 
      page.scores && page.scores.performance < LIGHTHOUSE_CONFIG.thresholds.performance
    );
    
    if (performancePages.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Improve Performance Scores',
        description: `${performancePages.length} pages below ${LIGHTHOUSE_CONFIG.thresholds.performance}% performance threshold`,
        pages: performancePages.map(p => p.page),
        actions: [
          'Optimize images and use modern formats (WebP, AVIF)',
          'Implement lazy loading for below-the-fold content',
          'Minify CSS, JavaScript, and HTML',
          'Enable compression (gzip/brotli)',
          'Use a CDN for static assets',
          'Implement service worker for caching'
        ]
      });
    }
    
    // Accessibility recommendations
    const accessibilityPages = pages.filter(page => 
      page.scores && page.scores.accessibility < LIGHTHOUSE_CONFIG.thresholds.accessibility
    );
    
    if (accessibilityPages.length > 0) {
      recommendations.push({
        category: 'accessibility',
        priority: 'high',
        title: 'Improve Accessibility Scores',
        description: `${accessibilityPages.length} pages below ${LIGHTHOUSE_CONFIG.thresholds.accessibility}% accessibility threshold`,
        pages: accessibilityPages.map(p => p.page),
        actions: [
          'Add alt text to all images',
          'Ensure proper heading hierarchy (h1, h2, h3)',
          'Add labels to all form inputs',
          'Ensure sufficient color contrast ratios',
          'Add focus indicators for keyboard navigation',
          'Implement ARIA labels where needed'
        ]
      });
    }
    
    // SEO recommendations
    const seoPages = pages.filter(page => 
      page.scores && page.scores.seo < LIGHTHOUSE_CONFIG.thresholds.seo
    );
    
    if (seoPages.length > 0) {
      recommendations.push({
        category: 'seo',
        priority: 'medium',
        title: 'Improve SEO Scores',
        description: `${seoPages.length} pages below ${LIGHTHOUSE_CONFIG.thresholds.seo}% SEO threshold`,
        pages: seoPages.map(p => p.page),
        actions: [
          'Add unique meta descriptions to all pages',
          'Ensure all pages have unique, descriptive titles',
          'Add structured data markup',
          'Implement proper heading structure',
          'Add canonical URLs',
          'Optimize page loading speed'
        ]
      });
    }
    
    // PWA recommendations
    const pwaPages = pages.filter(page => 
      page.scores && page.scores.pwa < LIGHTHOUSE_CONFIG.thresholds.pwa
    );
    
    if (pwaPages.length > 0) {
      recommendations.push({
        category: 'pwa',
        priority: 'medium',
        title: 'Improve PWA Scores',
        description: `${pwaPages.length} pages below ${LIGHTHOUSE_CONFIG.thresholds.pwa}% PWA threshold`,
        pages: pwaPages.map(p => p.page),
        actions: [
          'Add web app manifest',
          'Implement service worker',
          'Add offline functionality',
          'Ensure responsive design',
          'Add app icons in multiple sizes',
          'Implement install prompts'
        ]
      });
    }
    
    this.results.recommendations = recommendations;
  }

  async saveReports() {
    const reportsDir = path.join(projectRoot, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Save JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      config: LIGHTHOUSE_CONFIG,
      results: this.results
    };
    
    await fs.writeFile(
      path.join(reportsDir, 'lighthouse-audit.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    
    // Save markdown report
    const markdownReport = this.generateMarkdownReport();
    await fs.writeFile(
      path.join(projectRoot, 'LIGHTHOUSE_AUDIT_REPORT.md'),
      markdownReport
    );
    
    console.log('📄 Reports saved to reports/lighthouse-audit.json and LIGHTHOUSE_AUDIT_REPORT.md');
  }

  generateMarkdownReport() {
    const { summary, details, recommendations } = this.results;
    
    return `# Lighthouse Audit Report

**Generated:** ${new Date().toISOString()}

## Executive Summary

| Metric | Score | Status |
|--------|-------|--------|
| Overall Health | ${summary.overallHealth} | ${summary.overallHealth === 'excellent' ? '✅' : '⚠️'} |
| Pages Audited | ${summary.totalPages} | ✅ |

## Average Scores

| Category | Score | Threshold | Status |
|----------|-------|-----------|--------|
${Object.entries(summary.averageScores).map(([category, score]) => {
  const threshold = LIGHTHOUSE_CONFIG.thresholds[category] || 0;
  const status = score >= threshold ? '✅' : '⚠️';
  return `| ${category.charAt(0).toUpperCase() + category.slice(1)} | ${score}% | ${threshold}% | ${status} |`;
}).join('\n')}

## Page Details

${Object.entries(details).map(([pageName, pageData]) => `
### ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}

**URL:** ${pageData.url}  
**Audited:** ${pageData.timestamp}

| Category | Score |
|----------|-------|
${Object.entries(pageData.scores || {}).map(([category, score]) => 
  `| ${category.charAt(0).toUpperCase() + category.slice(1)} | ${score}% |`
).join('\n')}
`).join('\n')}

## Recommendations

${recommendations.map(rec => `
### ${rec.title} (${rec.priority})

${rec.description}

**Affected Pages:** ${rec.pages.join(', ')}

**Actions:**
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## Next Steps

1. Address high-priority recommendations immediately
2. Implement performance optimizations
3. Fix accessibility issues
4. Improve SEO elements
5. Consider PWA implementation

## Detailed Reports

Individual HTML reports are available in the \`reports/lighthouse/\` directory.
`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LIGHTHOUSE AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Health: ${this.results.summary.overallHealth}`);
    console.log(`Pages Audited: ${this.results.summary.totalPages}`);
    console.log('\nAverage Scores:');
    
    for (const [category, score] of Object.entries(this.results.summary.averageScores)) {
      const threshold = LIGHTHOUSE_CONFIG.thresholds[category] || 0;
      const status = score >= threshold ? '✅' : '⚠️';
      console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: ${score}% ${status}`);
    }
    
    console.log(`\nRecommendations: ${this.results.recommendations.length}`);
    console.log('='.repeat(60));
  }
}

// Run the audit
const auditor = new LighthouseAuditor();
auditor.run().catch(console.error);