#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const developerUsername = process.env.DEVELOPER_USERNAME;

// Mentor configuration
const mentors = [
  {
    username: 'senior-frontend-dev',
    name: 'Senior Frontend Developer',
    expertise: ['react', 'nextjs', 'ui', 'typescript', 'tailwind'],
    availability: 'high',
    timezone: 'EST'
  },
  {
    username: 'backend-expert',
    name: 'Backend Expert',
    expertise: ['api', 'database', 'auth', 'supabase', 'nodejs'],
    availability: 'high',
    timezone: 'PST'
  },
  {
    username: 'ai-ml-specialist',
    name: 'AI/ML Specialist',
    expertise: ['ai', 'ml', 'agents', 'openai', 'machine-learning'],
    availability: 'medium',
    timezone: 'EST'
  },
  {
    username: 'devops-engineer',
    name: 'DevOps Engineer',
    expertise: ['deployment', 'ci-cd', 'monitoring', 'security', 'infrastructure'],
    availability: 'medium',
    timezone: 'CST'
  },
  {
    username: 'full-stack-lead',
    name: 'Full Stack Lead',
    expertise: ['react', 'nodejs', 'api', 'database', 'architecture'],
    availability: 'high',
    timezone: 'EST'
  }
];

// Specialization mapping based on common interests
const specializationMap = {
  'frontend': ['senior-frontend-dev', 'full-stack-lead'],
  'backend': ['backend-expert', 'full-stack-lead'],
  'ai': ['ai-ml-specialist'],
  'devops': ['devops-engineer'],
  'fullstack': ['full-stack-lead', 'senior-frontend-dev', 'backend-expert']
};

async function assignMentor() {
  try {
    console.log(`Assigning mentor for ${developerUsername}...`);

    // Get developer's GitHub profile to determine interests
    let developerProfile;
    try {
      developerProfile = await octokit.rest.users.getByUsername({
        username: developerUsername
      });
    } catch (error) {
      console.log('Could not fetch developer profile, using default assignment');
    }

    // Determine specialization based on profile or use default
    let specialization = 'fullstack'; // default
    if (developerProfile) {
      // Simple heuristic based on bio, location, or other factors
      const bio = developerProfile.data.bio?.toLowerCase() || '';
      if (bio.includes('frontend') || bio.includes('react') || bio.includes('ui')) {
        specialization = 'frontend';
      } else if (bio.includes('backend') || bio.includes('api') || bio.includes('database')) {
        specialization = 'backend';
      } else if (bio.includes('ai') || bio.includes('ml') || bio.includes('machine learning')) {
        specialization = 'ai';
      } else if (bio.includes('devops') || bio.includes('deployment') || bio.includes('infrastructure')) {
        specialization = 'devops';
      }
    }

    // Get available mentors for this specialization
    const availableMentors = specializationMap[specialization] || specializationMap['fullstack'];
    
    // Find the best available mentor
    let selectedMentor = null;
    for (const mentorUsername of availableMentors) {
      const mentor = mentors.find(m => m.username === mentorUsername);
      if (mentor && mentor.availability === 'high') {
        selectedMentor = mentor;
        break;
      }
    }

    // Fallback to any available mentor
    if (!selectedMentor) {
      selectedMentor = mentors.find(m => m.availability === 'high') || mentors[0];
    }

    console.log(`Selected mentor: ${selectedMentor.name} (${selectedMentor.username})`);

    // Create mentor assignment issue
    const mentorIssue = await octokit.rest.issues.create({
      owner,
      repo,
      title: `Mentor Assignment for @${developerUsername}`,
      body: `## 👥 Mentor Assignment

Hello @${developerUsername}!

I've assigned **@${selectedMentor.username}** as your mentor for the onboarding process.

### Your Mentor: ${selectedMentor.name}
- **Expertise**: ${selectedMentor.expertise.join(', ')}
- **Availability**: ${selectedMentor.availability}
- **Timezone**: ${selectedMentor.timezone}

### What Your Mentor Will Help With:
- [ ] Code reviews and feedback
- [ ] Architecture explanations
- [ ] Best practices guidance
- [ ] Troubleshooting issues
- [ ] Career development advice

### How to Connect:
1. **Slack**: Join the #dev-help channel and mention @${selectedMentor.username}
2. **GitHub**: Tag @${selectedMentor.username} in issue comments
3. **1:1 Meetings**: Schedule regular check-ins
4. **Code Reviews**: Your mentor will review your PRs

### Mentor Responsibilities:
- [ ] Review your onboarding progress
- [ ] Provide timely feedback on contributions
- [ ] Answer technical questions
- [ ] Guide you through complex features
- [ ] Help with career development

### Your Responsibilities:
- [ ] Ask questions when you need help
- [ ] Be proactive in seeking guidance
- [ ] Implement feedback promptly
- [ ] Respect your mentor's time
- [ ] Prepare for meetings and reviews

### First Steps:
1. Introduce yourself to your mentor
2. Share your learning goals
3. Ask about their preferred communication style
4. Schedule your first check-in

Welcome to the team! 🚀`,
      labels: ['mentor-assignment', 'onboarding'],
      assignees: [developerUsername, selectedMentor.username]
    });

    console.log(`Created mentor assignment issue: ${mentorIssue.data.title} (#${mentorIssue.data.number})`);

    // Create a mentor notification
    const mentorNotification = await octokit.rest.issues.create({
      owner,
      repo,
      title: `New Mentee: @${developerUsername}`,
      body: `## 👋 New Mentee Assignment

Hello @${selectedMentor.username}!

You've been assigned as a mentor for **@${developerUsername}** who is starting their onboarding journey.

### About Your Mentee:
- **Username**: @${developerUsername}
- **Specialization Interest**: ${specialization}
- **Onboarding Phase**: Just started

### Your Role:
- [ ] Guide them through the onboarding process
- [ ] Review their first contributions
- [ ] Answer technical questions
- [ ] Provide career guidance
- [ ] Help them integrate with the team

### Mentee's Onboarding Tasks:
- [ ] Set up local development environment
- [ ] Understand the codebase structure
- [ ] Make their first contribution
- [ ] Learn the AI agent framework
- [ ] Complete onboarding survey

### Communication Channels:
- **Slack**: #dev-help channel
- **GitHub**: Issue comments and PR reviews
- **1:1 Meetings**: Schedule regular check-ins

### Resources:
- [Mentoring Guide](docs/mentoring-guide.md)
- [Onboarding Checklist](docs/developer_onboarding_checklist.md)
- [Code Review Guidelines](docs/code-review.md)

### First Steps:
1. Introduce yourself to @${developerUsername}
2. Review their onboarding tasks
3. Schedule your first check-in
4. Set expectations for communication

Thank you for being a mentor! 🙏`,
      labels: ['mentor-notification', 'onboarding'],
      assignees: [selectedMentor.username]
    });

    console.log(`Created mentor notification: ${mentorNotification.data.title} (#${mentorNotification.data.number})`);

    // Update the onboarding summary with mentor info
    const summaryIssues = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      labels: 'onboarding-summary',
      state: 'open'
    });

    const developerSummary = summaryIssues.data.find(issue => 
      issue.title.includes(developerUsername)
    );

    if (developerSummary) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: developerSummary.number,
        body: `## 👥 Mentor Assigned!

Your mentor **@${selectedMentor.username}** has been assigned and notified. They'll help guide you through your onboarding journey.

### Next Steps:
1. Check your assigned issues for onboarding tasks
2. Introduce yourself to your mentor
3. Start with the first task: "Set up local development environment"

Good luck! 🚀`
      });
    }

  } catch (error) {
    console.error('Error assigning mentor:', error);
    process.exit(1);
  }
}

// Run the script
assignMentor();