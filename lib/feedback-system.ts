/**
 * Feedback & Support Intelligence System
 * Handles user feedback, sentiment tracking, and support automation
 */

export interface FeedbackData {
  id: string
  userId: string
  type: 'recommendation' | 'feature' | 'bug' | 'general'
  sentiment: 'positive' | 'negative' | 'neutral'
  rating: number // 1-5 scale
  comment?: string
  context: Record<string, any>
  timestamp: string
  resolved: boolean
  response?: string
}

export interface SupportTicket {
  id: string
  userId: string
  subject: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  category: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  resolution?: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  helpful: number
  notHelpful: number
  lastUpdated: string
}

class FeedbackSystem {
  private feedbackData: FeedbackData[] = []
  private supportTickets: SupportTicket[] = []
  private faqItems: FAQItem[] = []
  private webhookUrl?: string

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl
    this.initializeFAQ()
  }

  // Feedback collection
  async submitFeedback(
    userId: string,
    type: FeedbackData['type'],
    sentiment: FeedbackData['sentiment'],
    rating: number,
    comment?: string,
    context?: Record<string, any>
  ): Promise<string> {
    const feedback: FeedbackData = {
      id: this.generateId(),
      userId,
      type,
      sentiment,
      rating,
      comment,
      context: context || {},
      timestamp: new Date().toISOString(),
      resolved: false,
    }

    this.feedbackData.push(feedback)

    // Track analytics
    this.trackFeedbackAnalytics(feedback)

    // Auto-categorize and route
    await this.processFeedback(feedback)

    return feedback.id
  }

  // Support ticket management
  async createSupportTicket(
    userId: string,
    subject: string,
    description: string,
    priority: SupportTicket['priority'] = 'medium',
    category: string = 'general'
  ): Promise<string> {
    const ticket: SupportTicket = {
      id: this.generateId(),
      userId,
      subject,
      description,
      priority,
      status: 'open',
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.supportTickets.push(ticket)

    // Auto-assign based on category and priority
    await this.autoAssignTicket(ticket)

    // Send notification
    await this.sendTicketNotification(ticket)

    return ticket.id
  }

  // FAQ management
  async getFAQItems(category?: string, searchQuery?: string): Promise<FAQItem[]> {
    let items = this.faqItems

    if (category) {
      items = items.filter(item => item.category === category)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => 
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return items.sort((a, b) => (b.helpful - b.notHelpful) - (a.helpful - a.notHelpful))
  }

  async updateFAQHelpfulness(itemId: string, helpful: boolean): Promise<void> {
    const item = this.faqItems.find(faq => faq.id === itemId)
    if (item) {
      if (helpful) {
        item.helpful++
      } else {
        item.notHelpful++
      }
    }
  }

  // Analytics and insights
  getFeedbackInsights(): {
    totalFeedback: number
    sentimentBreakdown: Record<string, number>
    averageRating: number
    topIssues: Array<{ type: string; count: number }>
    resolutionRate: number
  } {
    const totalFeedback = this.feedbackData.length
    const sentimentBreakdown = this.feedbackData.reduce((acc, feedback) => {
      acc[feedback.sentiment] = (acc[feedback.sentiment] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const averageRating = this.feedbackData.length > 0
      ? this.feedbackData.reduce((sum, feedback) => sum + feedback.rating, 0) / this.feedbackData.length
      : 0

    const topIssues = Object.entries(
      this.feedbackData.reduce((acc, feedback) => {
        acc[feedback.type] = (acc[feedback.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

    const resolvedCount = this.feedbackData.filter(f => f.resolved).length
    const resolutionRate = totalFeedback > 0 ? resolvedCount / totalFeedback : 0

    return {
      totalFeedback,
      sentimentBreakdown,
      averageRating,
      topIssues,
      resolutionRate,
    }
  }

  // Auto-processing and routing
  private async processFeedback(feedback: FeedbackData): Promise<void> {
    // Auto-categorize based on content
    const category = this.categorizeFeedback(feedback)

    // Route to appropriate team
    if (feedback.sentiment === 'negative' && feedback.rating <= 2) {
      await this.escalateToSupport(feedback)
    }

    // Update FAQ if it's a common question
    if (feedback.type === 'general' && feedback.comment) {
      await this.checkForFAQUpdate(feedback)
    }
  }

  private async autoAssignTicket(ticket: SupportTicket): Promise<void> {
    // Simple auto-assignment logic
    const assignee = this.getAssigneeForCategory(ticket.category, ticket.priority)
    if (assignee) {
      ticket.assignedTo = assignee
      ticket.status = 'in_progress'
    }
  }

  private async sendTicketNotification(ticket: SupportTicket): Promise<void> {
    if (!this.webhookUrl) return

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New support ticket: ${ticket.subject}`,
          ticket: ticket,
        }),
      })
    } catch (error) {
      console.error('Failed to send ticket notification:', error)
    }
  }

  private trackFeedbackAnalytics(feedback: FeedbackData): void {
    // Track with analytics system
    if (typeof window !== 'undefined') {
      // This would integrate with the metrics system
      console.log('Tracking feedback analytics:', feedback)
    }
  }

  private categorizeFeedback(feedback: FeedbackData): string {
    // Simple categorization logic
    if (feedback.comment) {
      const comment = feedback.comment.toLowerCase()
      if (comment.includes('bug') || comment.includes('error')) return 'bug'
      if (comment.includes('feature') || comment.includes('request')) return 'feature'
      if (comment.includes('billing') || comment.includes('payment')) return 'billing'
    }
    return 'general'
  }

  private async escalateToSupport(feedback: FeedbackData): Promise<void> {
    // Create support ticket for negative feedback
    await this.createSupportTicket(
      feedback.userId,
      `Feedback Escalation: ${feedback.type}`,
      `Rating: ${feedback.rating}/5\nSentiment: ${feedback.sentiment}\nComment: ${feedback.comment || 'No comment'}`,
      'high',
      'feedback'
    )
  }

  private async checkForFAQUpdate(feedback: FeedbackData): Promise<void> {
    // Check if this is a common question that should be added to FAQ
    const similarQuestions = this.faqItems.filter(faq => 
      this.calculateSimilarity(feedback.comment || '', faq.question) > 0.7
    )

    if (similarQuestions.length === 0 && feedback.comment) {
      // This might be a new common question
      console.log('Potential new FAQ item:', feedback.comment)
    }
  }

  private getAssigneeForCategory(category: string, priority: string): string | undefined {
    // Simple assignment logic
    const assignments: Record<string, string> = {
      'technical': 'tech-team',
      'billing': 'billing-team',
      'general': 'support-team',
    }
    return assignments[category] || 'support-team'
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const words1 = str1.toLowerCase().split(' ')
    const words2 = str2.toLowerCase().split(' ')
    const intersection = words1.filter(word => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]
    return intersection.length / union.length
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private initializeFAQ(): void {
    this.faqItems = [
      {
        id: '1',
        question: 'How do I calculate my mortgage affordability?',
        answer: 'Use our affordability calculator by entering your income, expenses, and desired property price. The calculator will show your debt-to-income ratio and recommended mortgage amount.',
        category: 'calculator',
        tags: ['affordability', 'calculator', 'mortgage'],
        helpful: 0,
        notHelpful: 0,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: '2',
        question: 'What documents do I need for mortgage pre-approval?',
        answer: 'You typically need: pay stubs, tax returns, bank statements, employment verification, and credit report. Our app can help you organize these documents.',
        category: 'pre-approval',
        tags: ['documents', 'pre-approval', 'requirements'],
        helpful: 0,
        notHelpful: 0,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: '3',
        question: 'How accurate are the interest rate estimates?',
        answer: 'Our rates are based on current market data and are estimates. Actual rates depend on your credit score, down payment, and lender-specific factors.',
        category: 'rates',
        tags: ['rates', 'accuracy', 'estimates'],
        helpful: 0,
        notHelpful: 0,
        lastUpdated: new Date().toISOString(),
      },
    ]
  }
}

// Global feedback system instance
let feedbackSystemInstance: FeedbackSystem | null = null

export const initFeedbackSystem = (webhookUrl?: string): FeedbackSystem => {
  if (!feedbackSystemInstance) {
    feedbackSystemInstance = new FeedbackSystem(webhookUrl)
  }
  return feedbackSystemInstance
}

export const getFeedbackSystem = (): FeedbackSystem => {
  if (!feedbackSystemInstance) {
    throw new Error('Feedback system not initialized. Call initFeedbackSystem() first.')
  }
  return feedbackSystemInstance
}

// Convenience functions
export const submitFeedback = async (
  userId: string,
  type: FeedbackData['type'],
  sentiment: FeedbackData['sentiment'],
  rating: number,
  comment?: string,
  context?: Record<string, any>
): Promise<string> => {
  return getFeedbackSystem().submitFeedback(userId, type, sentiment, rating, comment, context)
}

export const createSupportTicket = async (
  userId: string,
  subject: string,
  description: string,
  priority: SupportTicket['priority'] = 'medium',
  category: string = 'general'
): Promise<string> => {
  return getFeedbackSystem().createSupportTicket(userId, subject, description, priority, category)
}

export const getFAQItems = async (category?: string, searchQuery?: string): Promise<FAQItem[]> => {
  return getFeedbackSystem().getFAQItems(category, searchQuery)
}

export const updateFAQHelpfulness = async (itemId: string, helpful: boolean): Promise<void> => {
  return getFeedbackSystem().updateFAQHelpfulness(itemId, helpful)
}

export const getFeedbackInsights = () => {
  return getFeedbackSystem().getFeedbackInsights()
}

export default FeedbackSystem
