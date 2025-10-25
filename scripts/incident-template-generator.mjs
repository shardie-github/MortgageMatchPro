#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class IncidentTemplateGenerator {
  constructor() {
    this.templateDir = path.join(projectRoot, 'docs', 'incidents');
  }

  async generateTemplate(incidentData) {
    console.log('📝 Generating incident template...\n');

    try {
      // Ensure incidents directory exists
      await fs.mkdir(this.templateDir, { recursive: true });

      const template = this.buildIncidentTemplate(incidentData);
      const filename = `incident-${incidentData.id || Date.now()}.md`;
      const filepath = path.join(this.templateDir, filename);

      await fs.writeFile(filepath, template);
      console.log(`✅ Incident template generated: ${filepath}`);

      return filepath;
    } catch (error) {
      console.error('❌ Error generating incident template:', error.message);
      process.exit(1);
    }
  }

  buildIncidentTemplate(incidentData) {
    const now = new Date();
    const timestamp = now.toISOString();

    return `# Incident Report - ${incidentData.title || 'Untitled Incident'}

**Incident ID:** ${incidentData.id || 'TBD'}  
**Severity:** ${incidentData.severity || 'TBD'}  
**Status:** ${incidentData.status || 'open'}  
**Created:** ${incidentData.createdAt || timestamp}  
**Last Updated:** ${incidentData.updatedAt || timestamp}  

## Summary

${incidentData.description || 'Incident description to be filled in...'}

## Impact

- **Services Affected:** ${incidentData.services?.join(', ') || 'TBD'}
- **Users Affected:** ${incidentData.usersAffected || 'TBD'}
- **Duration:** ${incidentData.duration || 'TBD'}
- **Business Impact:** ${incidentData.businessImpact || 'TBD'}

## Timeline

| Time | Event | Description |
|------|-------|-------------|
| ${timestamp} | Incident Created | Initial incident report |
| TBD | Investigation Started | Team began investigating |
| TBD | Root Cause Identified | Root cause discovered |
| TBD | Fix Deployed | Resolution implemented |
| TBD | Incident Resolved | Issue resolved and verified |

## Root Cause Analysis

### What Happened
${incidentData.whatHappened || 'Description of what occurred...'}

### Why It Happened
${incidentData.whyItHappened || 'Analysis of why the incident occurred...'}

### Contributing Factors
${incidentData.contributingFactors || 'Factors that contributed to the incident...'}

## Resolution

### Immediate Actions Taken
${incidentData.immediateActions || 'Steps taken to resolve the incident...'}

### Long-term Fixes
${incidentData.longTermFixes || 'Permanent solutions implemented...'}

### Prevention Measures
${incidentData.preventionMeasures || 'Measures to prevent similar incidents...'}

## Lessons Learned

### What Went Well
${incidentData.whatWentWell || 'Positive aspects of the incident response...'}

### What Could Be Improved
${incidentData.improvements || 'Areas for improvement in incident response...'}

### Action Items
${incidentData.actionItems || 'Specific actions to take based on lessons learned...'}

## Technical Details

### Error Messages
\`\`\`
${incidentData.errorMessages || 'Error messages and logs...'}
\`\`\`

### Configuration Changes
${incidentData.configChanges || 'Any configuration changes made...'}

### Monitoring Alerts
${incidentData.alerts?.map(alert => `- ${alert}`).join('\n') || 'No alerts triggered'}

## Communication

### Internal Notifications
${incidentData.internalNotifications || 'Internal team notifications sent...'}

### External Communications
${incidentData.externalCommunications || 'Customer or external communications...'}

### Stakeholder Updates
${incidentData.stakeholderUpdates || 'Updates provided to stakeholders...'}

## Metrics

### Response Time
- **Detection Time:** ${incidentData.detectionTime || 'TBD'}
- **Response Time:** ${incidentData.responseTime || 'TBD'}
- **Resolution Time:** ${incidentData.resolutionTime || 'TBD'}

### Impact Metrics
- **Downtime:** ${incidentData.downtime || 'TBD'}
- **Error Rate:** ${incidentData.errorRate || 'TBD'}
- **Performance Impact:** ${incidentData.performanceImpact || 'TBD'}

## Follow-up Actions

### Immediate (Next 24 hours)
${incidentData.immediateFollowUp || 'Actions to take immediately...'}

### Short-term (Next week)
${incidentData.shortTermFollowUp || 'Actions to take in the next week...'}

### Long-term (Next month)
${incidentData.longTermFollowUp || 'Actions to take in the next month...'}

## Sign-off

**Incident Commander:** ${incidentData.incidentCommander || 'TBD'}  
**Technical Lead:** ${incidentData.technicalLead || 'TBD'}  
**Product Owner:** ${incidentData.productOwner || 'TBD'}  

**Resolution Date:** ${incidentData.resolvedAt || 'TBD'}  
**Post-mortem Date:** ${incidentData.postMortemDate || 'TBD'}  

---

*This incident report was generated automatically by the MortgageMatchPro Incident Template Generator v1.4.0*
`;
  }

  async generateGenericTemplate() {
    const genericIncident = {
      id: 'template',
      title: 'Incident Template',
      severity: 'medium',
      status: 'open',
      description: 'This is a template for incident reports. Replace the placeholder text with actual incident details.',
      services: ['service1', 'service2'],
      usersAffected: 'Unknown',
      duration: 'TBD',
      businessImpact: 'TBD'
    };

    return await this.generateTemplate(genericIncident);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new IncidentTemplateGenerator();

  if (args.length === 0) {
    // Generate generic template
    await generator.generateGenericTemplate();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node incident-template-generator.mjs [options]

Options:
  --help, -h          Show this help message
  --generic           Generate a generic incident template
  --data <file>       Generate template from JSON data file

Examples:
  node incident-template-generator.mjs --generic
  node incident-template-generator.mjs --data incident-data.json
    `);
  } else if (args[0] === '--generic') {
    await generator.generateGenericTemplate();
  } else if (args[0] === '--data' && args[1]) {
    try {
      const dataFile = path.resolve(args[1]);
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
      await generator.generateTemplate(data);
    } catch (error) {
      console.error('❌ Error reading data file:', error.message);
      process.exit(1);
    }
  } else {
    console.error('❌ Invalid arguments. Use --help for usage information.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { IncidentTemplateGenerator };
