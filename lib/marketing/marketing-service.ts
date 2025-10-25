import { EventBus } from '../events/event-bus';
import { AnalyticsService } from '../analytics/analytics-service';

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'push' | 'in_app' | 'sms';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  targetAudience: {
    segment: string;
    criteria: Record<string, any>;
  };
  content: {
    subject?: string;
    title: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
    timezone: string;
  };
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateProgram {
  id: string;
  name: string;
  description: string;
  commissionRate: number;
  cookieDuration: number; // days
  status: 'active' | 'inactive' | 'paused';
  requirements: {
    minSignups: number;
    minRevenue: number;
    approvalRequired: boolean;
  };
  tracking: {
    baseUrl: string;
    trackingCode: string;
    conversionEvents: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  userId: string;
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
  lastUsed: Date;
}

export interface ReferralProgram {
  id: string;
  name: string;
  description: string;
  rewardType: 'credit' | 'discount' | 'cash';
  rewardAmount: number;
  maxRewards: number;
  expirationDays: number;
  status: 'active' | 'inactive';
  conditions: {
    minPurchaseAmount?: number;
    eligibleServices: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  programId: string;
  uses: number;
  maxUses: number;
  rewardsEarned: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetAudience: {
    segments: string[];
    conditions: Record<string, any>;
  };
  variants: {
    control: any;
    treatment: any;
  };
  metrics: {
    impressions: number;
    conversions: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class MarketingService {
  private eventBus: EventBus;
  private analyticsService: AnalyticsService;
  private campaigns: Map<string, MarketingCampaign> = new Map();
  private affiliatePrograms: Map<string, AffiliateProgram> = new Map();
  private affiliateLinks: Map<string, AffiliateLink> = new Map();
  private referralPrograms: Map<string, ReferralProgram> = new Map();
  private referralCodes: Map<string, ReferralCode> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();

  constructor(eventBus: EventBus, analyticsService: AnalyticsService) {
    this.eventBus = eventBus;
    this.analyticsService = analyticsService;
    this.initializeDefaultPrograms();
    this.initializeEventHandlers();
  }

  private initializeDefaultPrograms(): void {
    // Default affiliate program
    this.affiliatePrograms.set('default', {
      id: 'default',
      name: 'MortgageMatchPro Affiliate Program',
      description: 'Earn commissions by referring customers to MortgageMatchPro',
      commissionRate: 0.1, // 10%
      cookieDuration: 30,
      status: 'active',
      requirements: {
        minSignups: 5,
        minRevenue: 1000,
        approvalRequired: true
      },
      tracking: {
        baseUrl: 'https://mortgagematchpro.com/affiliate',
        trackingCode: 'aff',
        conversionEvents: ['signup', 'subscription', 'purchase']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Default referral program
    this.referralPrograms.set('default', {
      id: 'default',
      name: 'Refer a Friend',
      description: 'Get rewarded for referring friends to MortgageMatchPro',
      rewardType: 'credit',
      rewardAmount: 50,
      maxRewards: 500,
      expirationDays: 90,
      status: 'active',
      conditions: {
        minPurchaseAmount: 100,
        eligibleServices: ['premium', 'enterprise']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Default feature flags
    this.featureFlags.set('affiliate-dashboard', {
      id: 'affiliate-dashboard',
      name: 'Affiliate Dashboard',
      description: 'Enable affiliate dashboard for partners',
      enabled: false,
      rolloutPercentage: 0,
      targetAudience: {
        segments: ['affiliates', 'partners'],
        conditions: { userType: 'affiliate' }
      },
      variants: {
        control: { enabled: false },
        treatment: { enabled: true }
      },
      metrics: {
        impressions: 0,
        conversions: 0,
        revenue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private initializeEventHandlers(): void {
    // Track user upgrade events for marketing campaigns
    this.eventBus.subscribe('billing.subscription.updated', this.handleSubscriptionUpdated.bind(this));
    this.eventBus.subscribe('billing.payment.succeeded', this.handlePaymentSucceeded.bind(this));
    this.eventBus.subscribe('user.signup', this.handleUserSignup.bind(this));
    this.eventBus.subscribe('affiliate.click', this.handleAffiliateClick.bind(this));
    this.eventBus.subscribe('referral.used', this.handleReferralUsed.bind(this));
  }

  private async handleSubscriptionUpdated(event: any): Promise<void> {
    const { userId, tenantId, newPlan, oldPlan } = event.data;
    
    // Check if user upgraded to a paid plan
    if (this.isUpgrade(oldPlan, newPlan)) {
      await this.triggerUpgradeCampaign(userId, tenantId, newPlan);
    }
  }

  private async handlePaymentSucceeded(event: any): Promise<void> {
    const { userId, tenantId, amount } = event.data;
    
    // Check if this qualifies for referral reward
    await this.checkReferralReward(userId, tenantId, amount);
  }

  private async handleUserSignup(event: any): Promise<void> {
    const { userId, tenantId, referralCode } = event.data;
    
    if (referralCode) {
      await this.processReferralSignup(userId, tenantId, referralCode);
    }
  }

  private async handleAffiliateClick(event: any): Promise<void> {
    const { affiliateId, userId, url } = event.data;
    
    // Track affiliate click
    await this.trackAffiliateClick(affiliateId, userId, url);
  }

  private async handleReferralUsed(event: any): Promise<void> {
    const { referralCode, userId, tenantId } = event.data;
    
    // Process referral usage
    await this.processReferralUsage(referralCode, userId, tenantId);
  }

  private isUpgrade(oldPlan: string, newPlan: string): boolean {
    const planHierarchy = ['free', 'basic', 'premium', 'enterprise'];
    const oldIndex = planHierarchy.indexOf(oldPlan);
    const newIndex = planHierarchy.indexOf(newPlan);
    return newIndex > oldIndex;
  }

  private async triggerUpgradeCampaign(userId: string, tenantId: string, plan: string): Promise<void> {
    // Create upgrade campaign
    const campaign = await this.createCampaign({
      name: `Upgrade to ${plan} - Welcome`,
      type: 'email',
      status: 'scheduled',
      targetAudience: {
        segment: 'upgraded_users',
        criteria: { userId, plan }
      },
      content: {
        subject: `Welcome to ${plan}!`,
        title: `Congratulations on upgrading to ${plan}`,
        body: `Thank you for upgrading to our ${plan} plan. You now have access to advanced features and priority support.`,
        ctaText: 'Explore Features',
        ctaUrl: '/dashboard/features'
      },
      schedule: {
        startDate: new Date(),
        timezone: 'UTC'
      }
    });

    // Publish campaign event
    await this.eventBus.publish('marketing.campaign.triggered', {
      campaignId: campaign,
      userId,
      tenantId,
      trigger: 'upgrade',
      triggeredAt: new Date().toISOString()
    });
  }

  private async checkReferralReward(userId: string, tenantId: string, amount: number): Promise<void> {
    // Check if user has a referral code
    const referralCode = await this.getUserReferralCode(userId);
    if (referralCode) {
      // Award referral reward
      await this.awardReferralReward(referralCode, amount);
    }
  }

  private async processReferralSignup(userId: string, tenantId: string, referralCode: string): Promise<void> {
    const code = await this.getReferralCode(referralCode);
    if (code) {
      // Update referral code usage
      await this.updateReferralCodeUsage(code.id, userId);
      
      // Publish referral event
      await this.eventBus.publish('referral.signup', {
        referralCodeId: code.id,
        referrerId: code.userId,
        referredId: userId,
        tenantId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async trackAffiliateClick(affiliateId: string, userId: string, url: string): Promise<void> {
    // Create affiliate link
    const link = await this.createAffiliateLink({
      affiliateId,
      userId,
      originalUrl: url,
      shortUrl: this.generateShortUrl(affiliateId, userId)
    });

    // Publish affiliate click event
    await this.eventBus.publish('affiliate.click.tracked', {
      linkId: link,
      affiliateId,
      userId,
      url,
      timestamp: new Date().toISOString()
    });
  }

  private async processReferralUsage(referralCode: string, userId: string, tenantId: string): Promise<void> {
    const code = await this.getReferralCode(referralCode);
    if (code) {
      // Update referral code usage
      await this.updateReferralCodeUsage(code.id, userId);
      
      // Publish referral usage event
      await this.eventBus.publish('referral.used.tracked', {
        referralCodeId: code.id,
        referrerId: code.userId,
        usedBy: userId,
        tenantId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Campaign management
  async createCampaign(campaign: Omit<MarketingCampaign, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<string> {
    const campaignId = `campaign-${Date.now()}`;
    const fullCampaign: MarketingCampaign = {
      ...campaign,
      id: campaignId,
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        revenue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.campaigns.set(campaignId, fullCampaign);

    await this.eventBus.publish('marketing.campaign.created', {
      campaignId,
      campaign: fullCampaign,
      createdAt: new Date().toISOString()
    });

    return campaignId;
  }

  async updateCampaign(campaignId: string, updates: Partial<MarketingCampaign>): Promise<void> {
    const existingCampaign = this.campaigns.get(campaignId);
    if (!existingCampaign) {
      throw new Error('Campaign not found');
    }

    const updatedCampaign = {
      ...existingCampaign,
      ...updates,
      updatedAt: new Date()
    };

    this.campaigns.set(campaignId, updatedCampaign);

    await this.eventBus.publish('marketing.campaign.updated', {
      campaignId,
      updates,
      updatedAt: new Date().toISOString()
    });
  }

  // Affiliate program management
  async createAffiliateProgram(program: Omit<AffiliateProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const programId = `affiliate-${Date.now()}`;
    const fullProgram: AffiliateProgram = {
      ...program,
      id: programId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.affiliatePrograms.set(programId, fullProgram);

    await this.eventBus.publish('marketing.affiliate.program.created', {
      programId,
      program: fullProgram,
      createdAt: new Date().toISOString()
    });

    return programId;
  }

  async createAffiliateLink(link: Omit<AffiliateLink, 'id' | 'createdAt' | 'lastUsed'>): Promise<string> {
    const linkId = `link-${Date.now()}`;
    const fullLink: AffiliateLink = {
      ...link,
      id: linkId,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.affiliateLinks.set(linkId, fullLink);

    await this.eventBus.publish('marketing.affiliate.link.created', {
      linkId,
      link: fullLink,
      createdAt: new Date().toISOString()
    });

    return linkId;
  }

  // Referral program management
  async createReferralProgram(program: Omit<ReferralProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const programId = `referral-${Date.now()}`;
    const fullProgram: ReferralProgram = {
      ...program,
      id: programId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.referralPrograms.set(programId, fullProgram);

    await this.eventBus.publish('marketing.referral.program.created', {
      programId,
      program: fullProgram,
      createdAt: new Date().toISOString()
    });

    return programId;
  }

  async createReferralCode(userId: string, programId: string): Promise<string> {
    const codeId = `code-${Date.now()}`;
    const code = this.generateReferralCode();
    const program = this.referralPrograms.get(programId);
    
    if (!program) {
      throw new Error('Referral program not found');
    }

    const referralCode: ReferralCode = {
      id: codeId,
      userId,
      code,
      programId,
      uses: 0,
      maxUses: 100,
      rewardsEarned: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + program.expirationDays * 24 * 60 * 60 * 1000)
    };

    this.referralCodes.set(codeId, referralCode);

    await this.eventBus.publish('marketing.referral.code.created', {
      codeId,
      referralCode,
      createdAt: new Date().toISOString()
    });

    return codeId;
  }

  // Feature flag management
  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<string> {
    const flagId = `flag-${Date.now()}`;
    const fullFlag: FeatureFlag = {
      ...flag,
      id: flagId,
      metrics: {
        impressions: 0,
        conversions: 0,
        revenue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.featureFlags.set(flagId, fullFlag);

    await this.eventBus.publish('marketing.feature.flag.created', {
      flagId,
      flag: fullFlag,
      createdAt: new Date().toISOString()
    });

    return flagId;
  }

  async evaluateFeatureFlag(flagName: string, userId: string, context: Record<string, any>): Promise<any> {
    const flag = this.featureFlags.get(flagName);
    if (!flag || !flag.enabled) {
      return flag?.variants.control || null;
    }

    // Check if user is in target audience
    if (!this.isUserInTargetAudience(userId, flag.targetAudience, context)) {
      return flag.variants.control;
    }

    // Check rollout percentage
    const userHash = this.hashUserId(userId);
    const rolloutThreshold = flag.rolloutPercentage * 100;
    
    if (userHash < rolloutThreshold) {
      return flag.variants.treatment;
    } else {
      return flag.variants.control;
    }
  }

  // Query methods
  async getCampaigns(): Promise<MarketingCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getAffiliatePrograms(): Promise<AffiliateProgram[]> {
    return Array.from(this.affiliatePrograms.values());
  }

  async getReferralPrograms(): Promise<ReferralProgram[]> {
    return Array.from(this.referralPrograms.values());
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values());
  }

  async getReferralCode(code: string): Promise<ReferralCode | null> {
    for (const referralCode of this.referralCodes.values()) {
      if (referralCode.code === code) {
        return referralCode;
      }
    }
    return null;
  }

  async getUserReferralCode(userId: string): Promise<ReferralCode | null> {
    for (const referralCode of this.referralCodes.values()) {
      if (referralCode.userId === userId) {
        return referralCode;
      }
    }
    return null;
  }

  // Helper methods
  private generateShortUrl(affiliateId: string, userId: string): string {
    const baseUrl = this.affiliatePrograms.get('default')?.tracking.baseUrl || 'https://mortgagematchpro.com/affiliate';
    const trackingCode = this.affiliatePrograms.get('default')?.tracking.trackingCode || 'aff';
    return `${baseUrl}/${trackingCode}/${affiliateId}/${userId}`;
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private isUserInTargetAudience(userId: string, targetAudience: any, context: Record<string, any>): boolean {
    // Check segments
    if (targetAudience.segments && targetAudience.segments.length > 0) {
      // In a real implementation, you would check user segments
      return true; // Simplified for demo
    }

    // Check conditions
    if (targetAudience.conditions) {
      for (const [key, value] of Object.entries(targetAudience.conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  private async updateReferralCodeUsage(codeId: string, userId: string): Promise<void> {
    const code = this.referralCodes.get(codeId);
    if (code) {
      code.uses += 1;
      this.referralCodes.set(codeId, code);
    }
  }

  private async awardReferralReward(referralCode: ReferralCode, amount: number): Promise<void> {
    const program = this.referralPrograms.get(referralCode.programId);
    if (program) {
      const reward = amount * program.rewardAmount / 100;
      referralCode.rewardsEarned += reward;
      this.referralCodes.set(referralCode.id, referralCode);
    }
  }
}
