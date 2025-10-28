#!/usr/bin/env node

/**
 * AI-Powered Release Notes Generator
 * Uses commit diffs and AI summarization to create human-readable release notes
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ReleaseNotesGenerator {
  constructor() {
    this.version = this.getVersion();
    this.previousVersion = this.getPreviousVersion();
  }

  /**
   * Main function to generate release notes
   */
  async generateReleaseNotes() {
    console.log('🤖 Generating AI-powered release notes...');

    try {
      // 1. Get commit history
      const commits = await this.getCommits();
      
      // 2. Get file changes
      const fileChanges = await this.getFileChanges();
      
      // 3. Get pull requests
      const pullRequests = await this.getPullRequests();
      
      // 4. Analyze changes with AI
      const analysis = await this.analyzeChanges(commits, fileChanges, pullRequests);
      
      // 5. Generate release notes
      const releaseNotes = await this.generateNotes(analysis);
      
      // 6. Save release notes
      await this.saveReleaseNotes(releaseNotes);
      
      // 7. Update changelog
      await this.updateChangelog(releaseNotes);
      
      console.log('✅ Release notes generated successfully');
      return releaseNotes;

    } catch (error) {
      console.error('❌ Error generating release notes:', error);
      throw error;
    }
  }

  /**
   * Get current version from package.json
   */
  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version;
    } catch (error) {
      console.error('Error reading package.json:', error);
      return '1.0.0';
    }
  }

  /**
   * Get previous version from git tags
   */
  getPreviousVersion() {
    try {
      const tags = execSync('git tag --sort=-version:refname', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(tag => tag && tag.match(/^\d+\.\d+\.\d+$/));
      
      return tags[1] || '0.0.0'; // Second most recent tag
    } catch (error) {
      console.log('No previous version found, using 0.0.0');
      return '0.0.0';
    }
  }

  /**
   * Get commits since previous version
   */
  async getCommits() {
    try {
      const range = `${this.previousVersion}..HEAD`;
      const commits = execSync(`git log --pretty=format:"%h|%s|%an|%ad" --date=short ${range}`, { 
        encoding: 'utf8' 
      }).trim().split('\n').filter(commit => commit);

      return commits.map(commit => {
        const [hash, message, author, date] = commit.split('|');
        return { hash, message, author, date };
      });
    } catch (error) {
      console.error('Error getting commits:', error);
      return [];
    }
  }

  /**
   * Get file changes since previous version
   */
  async getFileChanges() {
    try {
      const range = `${this.previousVersion}..HEAD`;
      const changes = execSync(`git diff --name-status ${range}`, { 
        encoding: 'utf8' 
      }).trim().split('\n').filter(change => change);

      return changes.map(change => {
        const [status, file] = change.split('\t');
        return { status, file };
      });
    } catch (error) {
      console.error('Error getting file changes:', error);
      return [];
    }
  }

  /**
   * Get pull requests merged since previous version
   */
  async getPullRequests() {
    try {
      // This would typically use GitHub API
      // For now, we'll simulate with commit messages
      const commits = await this.getCommits();
      return commits
        .filter(commit => commit.message.includes('Merge pull request'))
        .map(commit => ({
          number: this.extractPRNumber(commit.message),
          title: commit.message.replace(/Merge pull request #\d+ from .*? /, ''),
          author: commit.author,
          date: commit.date
        }));
    } catch (error) {
      console.error('Error getting pull requests:', error);
      return [];
    }
  }

  /**
   * Extract PR number from merge commit message
   */
  extractPRNumber(message) {
    const match = message.match(/Merge pull request #(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Analyze changes with AI
   */
  async analyzeChanges(commits, fileChanges, pullRequests) {
    const prompt = `
Analyze the following changes for version ${this.version}:

COMMITS (${commits.length}):
${commits.map(c => `- ${c.hash}: ${c.message} (${c.author}, ${c.date})`).join('\n')}

FILE CHANGES (${fileChanges.length}):
${fileChanges.map(f => `- ${f.status}: ${f.file}`).join('\n')}

PULL REQUESTS (${pullRequests.length}):
${pullRequests.map(pr => `- #${pr.number}: ${pr.title} (${pr.author}, ${pr.date})`).join('\n')}

Please categorize these changes into:
1. Features (new functionality)
2. Bug Fixes (bug fixes and improvements)
3. Performance (performance improvements)
4. Security (security updates)
5. Dependencies (dependency updates)
6. Documentation (documentation changes)
7. Breaking Changes (breaking changes)
8. Other (miscellaneous changes)

For each category, provide:
- A brief description
- Impact level (High, Medium, Low)
- Affected areas
- User-facing changes

Format as JSON with the following structure:
{
  "features": [...],
  "bug_fixes": [...],
  "performance": [...],
  "security": [...],
  "dependencies": [...],
  "documentation": [...],
  "breaking_changes": [...],
  "other": [...],
  "summary": "Overall summary of the release",
  "migration_notes": "Any migration steps needed"
}
    `.trim();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software release manager. Analyze code changes and create structured release notes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing changes with AI:', error);
      return this.generateFallbackAnalysis(commits, fileChanges, pullRequests);
    }
  }

  /**
   * Generate fallback analysis if AI fails
   */
  generateFallbackAnalysis(commits, fileChanges, pullRequests) {
    const features = [];
    const bugFixes = [];
    const performance = [];
    const security = [];
    const dependencies = [];
    const documentation = [];
    const breakingChanges = [];
    const other = [];

    // Simple keyword-based categorization
    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      
      if (message.includes('feat') || message.includes('feature') || message.includes('add')) {
        features.push({
          description: commit.message,
          impact: 'Medium',
          areas: ['Core'],
          user_facing: true
        });
      } else if (message.includes('fix') || message.includes('bug')) {
        bugFixes.push({
          description: commit.message,
          impact: 'Medium',
          areas: ['Core'],
          user_facing: true
        });
      } else if (message.includes('perf') || message.includes('performance')) {
        performance.push({
          description: commit.message,
          impact: 'High',
          areas: ['Core'],
          user_facing: true
        });
      } else if (message.includes('security') || message.includes('vulnerability')) {
        security.push({
          description: commit.message,
          impact: 'High',
          areas: ['Security'],
          user_facing: false
        });
      } else if (message.includes('dep') || message.includes('depend')) {
        dependencies.push({
          description: commit.message,
          impact: 'Low',
          areas: ['Dependencies'],
          user_facing: false
        });
      } else if (message.includes('doc') || message.includes('readme')) {
        documentation.push({
          description: commit.message,
          impact: 'Low',
          areas: ['Documentation'],
          user_facing: false
        });
      } else if (message.includes('breaking') || message.includes('major')) {
        breakingChanges.push({
          description: commit.message,
          impact: 'High',
          areas: ['Core'],
          user_facing: true
        });
      } else {
        other.push({
          description: commit.message,
          impact: 'Low',
          areas: ['Other'],
          user_facing: false
        });
      }
    });

    return {
      features,
      bug_fixes: bugFixes,
      performance,
      security,
      dependencies,
      documentation,
      breaking_changes: breakingChanges,
      other,
      summary: `Release ${this.version} includes ${commits.length} commits with ${features.length} features, ${bugFixes.length} bug fixes, and ${performance.length} performance improvements.`,
      migration_notes: breakingChanges.length > 0 ? 'Please review breaking changes section for migration steps.' : 'No migration steps required.'
    };
  }

  /**
   * Generate formatted release notes
   */
  async generateNotes(analysis) {
    const releaseNotes = {
      version: this.version,
      date: new Date().toISOString().split('T')[0],
      summary: analysis.summary,
      migration_notes: analysis.migration_notes,
      changes: {
        features: analysis.features,
        bug_fixes: analysis.bug_fixes,
        performance: analysis.performance,
        security: analysis.security,
        dependencies: analysis.dependencies,
        documentation: analysis.documentation,
        breaking_changes: analysis.breaking_changes,
        other: analysis.other
      },
      statistics: {
        total_commits: analysis.features.length + analysis.bug_fixes.length + analysis.performance.length + 
                      analysis.security.length + analysis.dependencies.length + analysis.documentation.length + 
                      analysis.breaking_changes.length + analysis.other.length,
        features: analysis.features.length,
        bug_fixes: analysis.bug_fixes.length,
        performance: analysis.performance.length,
        security: analysis.security.length,
        dependencies: analysis.dependencies.length,
        documentation: analysis.documentation.length,
        breaking_changes: analysis.breaking_changes.length,
        other: analysis.other.length
      }
    };

    return releaseNotes;
  }

  /**
   * Save release notes to file
   */
  async saveReleaseNotes(releaseNotes) {
    const filename = `RELEASE_NOTES_${this.version.replace(/\./g, '_')}.md`;
    const filepath = path.join(process.cwd(), filename);
    
    const markdown = this.formatMarkdown(releaseNotes);
    
    await fs.writeFile(filepath, markdown, 'utf8');
    console.log(`📝 Release notes saved to ${filename}`);
  }

  /**
   * Format release notes as Markdown
   */
  formatMarkdown(releaseNotes) {
    const { version, date, summary, migration_notes, changes, statistics } = releaseNotes;
    
    let markdown = `# Release Notes v${version}\n\n`;
    markdown += `**Release Date:** ${date}\n\n`;
    markdown += `## Summary\n\n${summary}\n\n`;
    
    if (migration_notes) {
      markdown += `## Migration Notes\n\n${migration_notes}\n\n`;
    }
    
    markdown += `## Statistics\n\n`;
    markdown += `- Total Changes: ${statistics.total_commits}\n`;
    markdown += `- Features: ${statistics.features}\n`;
    markdown += `- Bug Fixes: ${statistics.bug_fixes}\n`;
    markdown += `- Performance: ${statistics.performance}\n`;
    markdown += `- Security: ${statistics.security}\n`;
    markdown += `- Dependencies: ${statistics.dependencies}\n`;
    markdown += `- Documentation: ${statistics.documentation}\n`;
    markdown += `- Breaking Changes: ${statistics.breaking_changes}\n`;
    markdown += `- Other: ${statistics.other}\n\n`;
    
    if (changes.features.length > 0) {
      markdown += `## ✨ Features\n\n`;
      changes.features.forEach(feature => {
        markdown += `- **${feature.impact} Impact:** ${feature.description}\n`;
        if (feature.areas) {
          markdown += `  - Areas: ${feature.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.bug_fixes.length > 0) {
      markdown += `## 🐛 Bug Fixes\n\n`;
      changes.bug_fixes.forEach(fix => {
        markdown += `- **${fix.impact} Impact:** ${fix.description}\n`;
        if (fix.areas) {
          markdown += `  - Areas: ${fix.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.performance.length > 0) {
      markdown += `## ⚡ Performance\n\n`;
      changes.performance.forEach(perf => {
        markdown += `- **${perf.impact} Impact:** ${perf.description}\n`;
        if (perf.areas) {
          markdown += `  - Areas: ${perf.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.security.length > 0) {
      markdown += `## 🔒 Security\n\n`;
      changes.security.forEach(sec => {
        markdown += `- **${sec.impact} Impact:** ${sec.description}\n`;
        if (sec.areas) {
          markdown += `  - Areas: ${sec.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.breaking_changes.length > 0) {
      markdown += `## ⚠️ Breaking Changes\n\n`;
      changes.breaking_changes.forEach(breaking => {
        markdown += `- **${breaking.impact} Impact:** ${breaking.description}\n`;
        if (breaking.areas) {
          markdown += `  - Areas: ${breaking.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.dependencies.length > 0) {
      markdown += `## 📦 Dependencies\n\n`;
      changes.dependencies.forEach(dep => {
        markdown += `- **${dep.impact} Impact:** ${dep.description}\n`;
        if (dep.areas) {
          markdown += `  - Areas: ${dep.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.documentation.length > 0) {
      markdown += `## 📚 Documentation\n\n`;
      changes.documentation.forEach(doc => {
        markdown += `- **${doc.impact} Impact:** ${doc.description}\n`;
        if (doc.areas) {
          markdown += `  - Areas: ${doc.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    if (changes.other.length > 0) {
      markdown += `## 🔧 Other Changes\n\n`;
      changes.other.forEach(other => {
        markdown += `- **${other.impact} Impact:** ${other.description}\n`;
        if (other.areas) {
          markdown += `  - Areas: ${other.areas.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    markdown += `---\n\n`;
    markdown += `*This release was automatically generated using AI-powered analysis of commit history and code changes.*\n`;
    
    return markdown;
  }

  /**
   * Update changelog file
   */
  async updateChangelog(releaseNotes) {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    try {
      let changelog = '';
      try {
        changelog = await fs.readFile(changelogPath, 'utf8');
      } catch (error) {
        // Changelog doesn't exist, create it
        changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
      }
      
      const newEntry = this.formatMarkdown(releaseNotes);
      const updatedChangelog = changelog + '\n' + newEntry;
      
      await fs.writeFile(changelogPath, updatedChangelog, 'utf8');
      console.log('📝 Changelog updated');
    } catch (error) {
      console.error('Error updating changelog:', error);
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ReleaseNotesGenerator();
  
  generator.generateReleaseNotes()
    .then((releaseNotes) => {
      console.log('✅ Release notes generated successfully');
      console.log(`Version: ${releaseNotes.version}`);
      console.log(`Total changes: ${releaseNotes.statistics.total_commits}`);
      console.log(`Features: ${releaseNotes.statistics.features}`);
      console.log(`Bug fixes: ${releaseNotes.statistics.bug_fixes}`);
    })
    .catch((error) => {
      console.error('❌ Error generating release notes:', error);
      process.exit(1);
    });
}