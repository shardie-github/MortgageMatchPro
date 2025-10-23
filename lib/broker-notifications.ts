import twilio from 'twilio'
import sgMail from '@sendgrid/mail'

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface BrokerNotificationData {
  brokerId: string
  brokerName: string
  brokerEmail: string
  brokerPhone: string
  company: string
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone: string
  leadScore: number
  qualificationTier: string
  propertyValue: number
  downPayment: number
  income: number
  creditScore: number
  additionalInfo?: string
}

export class BrokerNotificationService {
  /**
   * Send SMS notification to broker
   */
  async sendSMSNotification(data: BrokerNotificationData): Promise<boolean> {
    try {
      const message = this.formatSMSMessage(data)
      
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: data.brokerPhone
      })

      console.log('SMS sent successfully:', result.sid)
      return true
    } catch (error) {
      console.error('Failed to send SMS notification:', error)
      return false
    }
  }

  /**
   * Send email notification to broker
   */
  async sendEmailNotification(data: BrokerNotificationData): Promise<boolean> {
    try {
      const emailContent = this.formatEmailMessage(data)
      
      const msg = {
        to: data.brokerEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@mortgagematchpro.com',
        subject: `New Lead Assignment - ${data.leadName} (Score: ${data.leadScore})`,
        html: emailContent.html,
        text: emailContent.text,
      }

      await sgMail.send(msg)
      console.log('Email sent successfully to:', data.brokerEmail)
      return true
    } catch (error) {
      console.error('Failed to send email notification:', error)
      return false
    }
  }

  /**
   * Send both SMS and email notifications
   */
  async sendNotifications(data: BrokerNotificationData): Promise<{
    smsSuccess: boolean
    emailSuccess: boolean
  }> {
    const [smsSuccess, emailSuccess] = await Promise.allSettled([
      this.sendSMSNotification(data),
      this.sendEmailNotification(data)
    ])

    return {
      smsSuccess: smsSuccess.status === 'fulfilled' && smsSuccess.value,
      emailSuccess: emailSuccess.status === 'fulfilled' && emailSuccess.value
    }
  }

  /**
   * Format SMS message for broker
   */
  private formatSMSMessage(data: BrokerNotificationData): string {
    const tierEmoji = this.getTierEmoji(data.qualificationTier)
    const downPaymentPercent = ((data.downPayment / data.propertyValue) * 100).toFixed(1)
    
    return `${tierEmoji} NEW LEAD ASSIGNED
Name: ${data.leadName}
Score: ${data.leadScore}/100 (${data.qualificationTier})
Property: $${data.propertyValue.toLocaleString()}
Down Payment: $${data.downPayment.toLocaleString()} (${downPaymentPercent}%)
Income: $${data.income.toLocaleString()}
Credit: ${data.creditScore}
Phone: ${data.leadPhone}
Email: ${data.leadEmail}

Contact within 2 hours for best conversion rate.
Lead ID: ${data.leadId}`
  }

  /**
   * Format email message for broker
   */
  private formatEmailMessage(data: BrokerNotificationData): { html: string; text: string } {
    const tierEmoji = this.getTierEmoji(data.qualificationTier)
    const downPaymentPercent = ((data.downPayment / data.propertyValue) * 100).toFixed(1)
    const leadValue = this.calculateLeadValue(data)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Lead Assignment</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .lead-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .score-badge { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-weight: bold; 
      color: white;
      background: ${this.getScoreColor(data.leadScore)};
    }
    .contact-info { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .cta-button { 
      display: inline-block; 
      background: #2563eb; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 10px 5px;
    }
    .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tierEmoji} New Lead Assignment</h1>
    <p>High-quality lead ready for immediate contact</p>
  </div>
  
  <div class="content">
    <h2>Lead Information</h2>
    <div class="lead-info">
      <p><strong>Name:</strong> ${data.leadName}</p>
      <p><strong>Lead Score:</strong> <span class="score-badge">${data.leadScore}/100</span> (${data.qualificationTier} Tier)</p>
      <p><strong>Property Value:</strong> $${data.propertyValue.toLocaleString()}</p>
      <p><strong>Down Payment:</strong> $${data.downPayment.toLocaleString()} (${downPaymentPercent}%)</p>
      <p><strong>Annual Income:</strong> $${data.income.toLocaleString()}</p>
      <p><strong>Credit Score:</strong> ${data.creditScore}</p>
      <p><strong>Estimated Lead Value:</strong> $${leadValue.toLocaleString()}</p>
      ${data.additionalInfo ? `<p><strong>Additional Info:</strong> ${data.additionalInfo}</p>` : ''}
    </div>

    <div class="contact-info">
      <h3>Contact Information</h3>
      <p><strong>Phone:</strong> <a href="tel:${data.leadPhone}">${data.leadPhone}</a></p>
      <p><strong>Email:</strong> <a href="mailto:${data.leadEmail}">${data.leadEmail}</a></p>
    </div>

    <h3>Next Steps</h3>
    <ul>
      <li>Contact the lead within 2 hours for best conversion rate</li>
      <li>Use the provided contact information to reach out</li>
      <li>Update lead status in your dashboard after contact</li>
      <li>Mark as converted when mortgage is funded</li>
    </ul>

    <div style="text-align: center; margin: 20px 0;">
      <a href="tel:${data.leadPhone}" class="cta-button">Call Now</a>
      <a href="mailto:${data.leadEmail}" class="cta-button">Send Email</a>
    </div>

    <p><strong>Lead ID:</strong> ${data.leadId}</p>
    <p><strong>Assigned to:</strong> ${data.brokerName} (${data.company})</p>
  </div>

  <div class="footer">
    <p>This lead was automatically assigned to you based on your qualifications and availability.</p>
    <p>Please contact the lead promptly to maintain our high conversion rates.</p>
    <p>© 2024 MortgageMatch Pro. All rights reserved.</p>
  </div>
</body>
</html>`

    const text = `
NEW LEAD ASSIGNMENT - ${data.leadName}

Lead Information:
- Name: ${data.leadName}
- Score: ${data.leadScore}/100 (${data.qualificationTier} Tier)
- Property Value: $${data.propertyValue.toLocaleString()}
- Down Payment: $${data.downPayment.toLocaleString()} (${downPaymentPercent}%)
- Annual Income: $${data.income.toLocaleString()}
- Credit Score: ${data.creditScore}
- Estimated Lead Value: $${leadValue.toLocaleString()}
${data.additionalInfo ? `- Additional Info: ${data.additionalInfo}` : ''}

Contact Information:
- Phone: ${data.leadPhone}
- Email: ${data.leadEmail}

Next Steps:
1. Contact the lead within 2 hours for best conversion rate
2. Use the provided contact information to reach out
3. Update lead status in your dashboard after contact
4. Mark as converted when mortgage is funded

Lead ID: ${data.leadId}
Assigned to: ${data.brokerName} (${data.company})

This lead was automatically assigned to you based on your qualifications and availability.
Please contact the lead promptly to maintain our high conversion rates.
`

    return { html, text }
  }

  /**
   * Get emoji for qualification tier
   */
  private getTierEmoji(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'premium': return '⭐'
      case 'standard': return '🏠'
      case 'coaching': return '📚'
      default: return '📋'
    }
  }

  /**
   * Get color for lead score badge
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return '#10b981' // green
    if (score >= 60) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  /**
   * Calculate estimated lead value for broker
   */
  private calculateLeadValue(data: BrokerNotificationData): number {
    // Base value calculation based on property value and lead score
    const baseValue = data.propertyValue * 0.001 // 0.1% of property value
    const scoreMultiplier = data.leadScore / 100
    const downPaymentBonus = (data.downPayment / data.propertyValue) > 0.2 ? 1.2 : 1.0
    
    return Math.round(baseValue * scoreMultiplier * downPaymentBonus)
  }
}

// Export singleton instance
export const brokerNotificationService = new BrokerNotificationService()