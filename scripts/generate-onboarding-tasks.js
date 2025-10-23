#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const developerUsername = process.env.DEVELOPER_USERNAME;

// Onboarding tasks configuration
const onboardingTasks = [
  {
    title: "Set up local development environment",
    description: `## Environment Setup Task

Welcome @${developerUsername}! Let's get your development environment ready.

### Tasks:
- [ ] Clone the repository
- [ ] Install Node.js 18+
- [ ] Run \`npm install\`
- [ ] Copy \`.env.example\` to \`.env.local\`
- [ ] Configure environment variables
- [ ] Run \`npm run dev\`
- [ ] Verify application loads at http://localhost:3000

### Success Criteria:
- [ ] Development server starts without errors
- [ ] Application loads successfully
- [ ] No TypeScript errors
- [ ] All tests pass

### Resources:
- [Setup Guide](docs/developer_onboarding_checklist.md#phase-1-environment-setup)
- [Environment Variables](docs/environment-setup.md)

### Need Help?
Ask the AI assistant or your mentor for guidance!`,
    labels: ['onboarding-task', 'beginner', 'environment'],
    assignees: [developerUsername],
    milestone: 'Onboarding Phase 1'
  },
  {
    title: "Understand the codebase structure",
    description: `## Codebase Exploration Task

Let's explore the MortgageMatch Pro codebase structure.

### Tasks:
- [ ] Read the main README.md
- [ ] Explore the \`/app\` directory (Next.js app)
- [ ] Check out \`/components\` directory
- [ ] Look at \`/lib\` directory and AI agents
- [ ] Examine \`/pages/api\` for API routes
- [ ] Review \`/supabase\` for database schema

### Key Files to Examine:
- \`app/page.tsx\` - Main application entry
- \`lib/agents/affordability-agent.ts\` - AI agent example
- \`pages/api/affordability.ts\` - API route example
- \`components/canvas/AffordabilityInputPanel.tsx\` - React component

### Success Criteria:
- [ ] Can explain the overall architecture
- [ ] Understands the AI agent framework
- [ ] Knows where to find different types of code
- [ ] Can navigate the project structure

### Resources:
- [Architecture Overview](docs/architecture.md)
- [AI Agent Framework](docs/ai-agents.md)
- [Component Guide](docs/components.md)`,
    labels: ['onboarding-task', 'beginner', 'learning'],
    assignees: [developerUsername],
    milestone: 'Onboarding Phase 1'
  },
  {
    title: "Make your first contribution",
    description: `## First Contribution Task

Time to make your first contribution to MortgageMatch Pro!

### Suggested Tasks (choose one):
1. **Documentation Fix**
   - Fix a typo in README.md
   - Add missing information
   - Improve code comments

2. **Test Enhancement**
   - Add a unit test for an existing function
   - Improve test coverage
   - Add edge case tests

3. **UI Improvement**
   - Fix a responsive design issue
   - Improve accessibility
   - Add loading states

4. **Bug Fix**
   - Fix a minor bug
   - Improve error handling
   - Optimize performance

### Process:
- [ ] Create a feature branch: \`git checkout -b feature/your-feature-name\`
- [ ] Make your changes
- [ ] Write tests if applicable
- [ ] Run \`npm test\` and \`npm run type-check\`
- [ ] Commit your changes: \`git commit -m "feat: your description"\`
- [ ] Push to remote: \`git push origin feature/your-feature-name\`
- [ ] Create a pull request

### Success Criteria:
- [ ] Code follows project conventions
- [ ] Tests pass
- [ ] TypeScript checks pass
- [ ] Pull request created
- [ ] Code review completed

### Resources:
- [Contributing Guide](CONTRIBUTING.md)
- [Code Style Guide](docs/code-style.md)
- [Testing Guide](docs/testing.md)`,
    labels: ['onboarding-task', 'beginner', 'contribution'],
    assignees: [developerUsername],
    milestone: 'Onboarding Phase 2'
  },
  {
    title: "Learn the AI agent framework",
    description: `## AI Agent Framework Learning Task

Dive deep into the AI agent framework that powers MortgageMatch Pro.

### Tasks:
- [ ] Read the AI agent documentation
- [ ] Examine existing agents in \`/lib/agents\`
- [ ] Understand the agent lifecycle
- [ ] Learn about event-driven processing
- [ ] Explore integration patterns

### Key Agents to Study:
- \`affordability-agent.ts\` - Mortgage affordability calculations
- \`rate-intelligence-agent.ts\` - Rate analysis and recommendations
- \`scenario-simulator.ts\` - Scenario modeling and simulation
- \`explainability-agent.ts\` - AI decision explanations

### Hands-on Exercise:
- [ ] Create a simple test agent
- [ ] Implement basic event handling
- [ ] Add logging and monitoring
- [ ] Write tests for your agent

### Success Criteria:
- [ ] Understands agent architecture
- [ ] Can create a basic agent
- [ ] Knows how agents communicate
- [ ] Understands error handling patterns

### Resources:
- [AI Agent Framework](docs/ai-agents.md)
- [Agent Development Guide](docs/agent-development.md)
- [Event System](docs/event-system.md)`,
    labels: ['onboarding-task', 'intermediate', 'ai-agents'],
    assignees: [developerUsername],
    milestone: 'Onboarding Phase 2'
  },
  {
    title: "Complete onboarding survey",
    description: `## Onboarding Survey Task

Help us improve the onboarding experience by sharing your feedback.

### Survey Questions:
1. How long did it take to set up your environment?
2. What was the most challenging part of onboarding?
3. What resources were most helpful?
4. What could be improved?
5. Rate your overall onboarding experience (1-5)
6. Any suggestions for future developers?

### Tasks:
- [ ] Complete the onboarding survey
- [ ] Provide honest feedback
- [ ] Suggest improvements
- [ ] Share what you learned

### Success Criteria:
- [ ] Survey completed
- [ ] Feedback provided
- [ ] Suggestions shared
- [ ] Onboarding marked as complete

### Resources:
- [Survey Link](https://forms.gle/your-survey-link)
- [Feedback Guidelines](docs/feedback.md)`,
    labels: ['onboarding-task', 'feedback', 'completion'],
    assignees: [developerUsername],
    milestone: 'Onboarding Phase 3'
  }
];

async function generateOnboardingTasks() {
  try {
    console.log(`Generating onboarding tasks for ${developerUsername}...`);

    for (const task of onboardingTasks) {
      const issue = await octokit.rest.issues.create({
        owner,
        repo,
        title: task.title,
        body: task.description,
        labels: task.labels,
        assignees: task.assignees,
        milestone: task.milestone
      });

      console.log(`Created issue: ${issue.data.title} (#${issue.data.number})`);
    }

    console.log(`Successfully created ${onboardingTasks.length} onboarding tasks for ${developerUsername}`);

    // Create a summary issue
    const summaryIssue = await octokit.rest.issues.create({
      owner,
      repo,
      title: `Onboarding Summary for @${developerUsername}`,
      body: `## 🎯 Onboarding Progress Tracker

Welcome @${developerUsername}! Here's your personalized onboarding journey.

### 📋 Tasks Created:
${onboardingTasks.map((task, index) => `- [ ] ${task.title}`).join('\n')}

### 📊 Progress:
- **Phase 1 (Environment)**: 0/2 tasks completed
- **Phase 2 (Learning)**: 0/2 tasks completed  
- **Phase 3 (Completion)**: 0/1 tasks completed

### 🎯 Next Steps:
1. Start with "Set up local development environment"
2. Work through tasks in order
3. Ask questions in task comments
4. Update progress as you complete tasks

### 🤖 AI Assistant:
I'm here to help! Ask me about:
- Code explanations
- Implementation guidance
- Best practices
- Troubleshooting

### 👥 Your Mentor:
Your mentor will be assigned shortly and will help guide you through the process.

Good luck! 🚀`,
      labels: ['onboarding-summary', 'tracker'],
      assignees: [developerUsername]
    });

    console.log(`Created summary issue: ${summaryIssue.data.title} (#${summaryIssue.data.number})`);

  } catch (error) {
    console.error('Error generating onboarding tasks:', error);
    process.exit(1);
  }
}

// Run the script
generateOnboardingTasks();