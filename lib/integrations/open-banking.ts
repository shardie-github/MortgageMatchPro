import { supabaseAdmin } from '../supabase'
import { z } from 'zod'

// Open Banking Provider Types
export type OpenBankingProvider = 'plaid' | 'flinks' | 'yodlee' | 'truelayer'

export interface OpenBankingConfig {
  provider: OpenBankingProvider
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'development' | 'production'
  baseUrl: string
}

// Open Banking Connection Schema
export const OpenBankingConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.enum(['plaid', 'flinks', 'yodlee', 'truelayer']),
  provider_connection_id: z.string(),
  institution_id: z.string(),
  institution_name: z.string(),
  account_type: z.enum(['checking', 'savings', 'credit', 'investment']),
  account_id: z.string(),
  account_name: z.string().optional(),
  account_number_masked: z.string().optional(),
  balance: z.number().optional(),
  currency: z.string().length(3).default('CAD'),
  status: z.enum(['active', 'error', 'disconnected']).default('active'),
  last_sync_at: z.string().datetime().optional(),
  consent_expires_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const OpenBankingTransactionSchema = z.object({
  id: z.string().uuid(),
  connection_id: z.string().uuid(),
  transaction_id: z.string(),
  amount: z.number(),
  currency: z.string().length(3).default('CAD'),
  description: z.string().optional(),
  merchant_name: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  transaction_date: z.string().date(),
  posted_date: z.string().date().optional(),
  account_balance: z.number().optional(),
  pending: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
})

export type OpenBankingConnection = z.infer<typeof OpenBankingConnectionSchema>
export type OpenBankingTransaction = z.infer<typeof OpenBankingTransactionSchema>

// Open Banking Service Class
export class OpenBankingService {
  private config: OpenBankingConfig

  constructor(config: OpenBankingConfig) {
    this.config = config
  }

  // Create connection link for user consent
  async createConnectionLink(userId: string, institutionId?: string): Promise<{
    success: boolean
    linkToken?: string
    linkUrl?: string
    error?: string
  }> {
    try {
      switch (this.config.provider) {
        case 'plaid':
          return await this.createPlaidLink(userId, institutionId)
        case 'flinks':
          return await this.createFlinksLink(userId, institutionId)
        case 'yodlee':
          return await this.createYodleeLink(userId, institutionId)
        case 'truelayer':
          return await this.createTrueLayerLink(userId, institutionId)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Open banking connection link creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection link creation failed',
      }
    }
  }

  // Exchange public token for access token
  async exchangeToken(publicToken: string, userId: string): Promise<{
    success: boolean
    connectionId?: string
    error?: string
  }> {
    try {
      switch (this.config.provider) {
        case 'plaid':
          return await this.exchangePlaidToken(publicToken, userId)
        case 'flinks':
          return await this.exchangeFlinksToken(publicToken, userId)
        case 'yodlee':
          return await this.exchangeYodleeToken(publicToken, userId)
        case 'truelayer':
          return await this.exchangeTrueLayerToken(publicToken, userId)
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Token exchange failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      }
    }
  }

  // Fetch account data
  async fetchAccounts(connectionId: string): Promise<{
    success: boolean
    accounts?: any[]
    error?: string
  }> {
    try {
      const { data: connection, error: connectionError } = await supabaseAdmin
        .from('open_banking_connections')
        .select('*')
        .eq('id', connectionId)
        .single()

      if (connectionError || !connection) {
        throw new Error('Connection not found')
      }

      switch (connection.provider) {
        case 'plaid':
          return await this.fetchPlaidAccounts(connection.provider_connection_id)
        case 'flinks':
          return await this.fetchFlinksAccounts(connection.provider_connection_id)
        case 'yodlee':
          return await this.fetchYodleeAccounts(connection.provider_connection_id)
        case 'truelayer':
          return await this.fetchTrueLayerAccounts(connection.provider_connection_id)
        default:
          throw new Error(`Unsupported provider: ${connection.provider}`)
      }
    } catch (error) {
      console.error('Account fetch failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account fetch failed',
      }
    }
  }

  // Fetch transactions
  async fetchTransactions(
    connectionId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean
    transactions?: any[]
    error?: string
  }> {
    try {
      const { data: connection, error: connectionError } = await supabaseAdmin
        .from('open_banking_connections')
        .select('*')
        .eq('id', connectionId)
        .single()

      if (connectionError || !connection) {
        throw new Error('Connection not found')
      }

      switch (connection.provider) {
        case 'plaid':
          return await this.fetchPlaidTransactions(connection.provider_connection_id, startDate, endDate)
        case 'flinks':
          return await this.fetchFlinksTransactions(connection.provider_connection_id, startDate, endDate)
        case 'yodlee':
          return await this.fetchYodleeTransactions(connection.provider_connection_id, startDate, endDate)
        case 'truelayer':
          return await this.fetchTrueLayerTransactions(connection.provider_connection_id, startDate, endDate)
        default:
          throw new Error(`Unsupported provider: ${connection.provider}`)
      }
    } catch (error) {
      console.error('Transaction fetch failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction fetch failed',
      }
    }
  }

  // Plaid-specific implementations
  private async createPlaidLink(userId: string, institutionId?: string) {
    // This would integrate with Plaid Link API
    // For now, return mock data
    return {
      success: true,
      linkToken: `link-sandbox-${Date.now()}`,
      linkUrl: 'https://cdn.plaid.com/link/v2/stable/link.html',
    }
  }

  private async exchangePlaidToken(publicToken: string, userId: string) {
    // This would exchange public token for access token
    // For now, return mock data
    const connectionId = `conn_${Date.now()}`
    
    // Store connection in database
    const { error } = await supabaseAdmin.from('open_banking_connections').insert({
      user_id: userId,
      provider: 'plaid',
      provider_connection_id: connectionId,
      institution_id: 'ins_1',
      institution_name: 'Test Bank',
      account_type: 'checking',
      account_id: 'acc_1',
      account_name: 'Primary Checking',
      account_number_masked: '****1234',
      balance: 5000.00,
      currency: 'CAD',
      status: 'active',
      consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      connectionId,
    }
  }

  private async fetchPlaidAccounts(accessToken: string) {
    // This would fetch accounts from Plaid
    // For now, return mock data
    return {
      success: true,
      accounts: [
        {
          account_id: 'acc_1',
          name: 'Primary Checking',
          type: 'checking',
          subtype: 'checking',
          balance: { current: 5000.00, available: 4500.00 },
          mask: '1234',
        },
      ],
    }
  }

  private async fetchPlaidTransactions(accessToken: string, startDate: string, endDate: string) {
    // This would fetch transactions from Plaid
    // For now, return mock data
    return {
      success: true,
      transactions: [
        {
          transaction_id: 'txn_1',
          amount: -150.00,
          date: '2024-01-15',
          name: 'Grocery Store',
          category: ['Food and Drink', 'Groceries'],
          account_id: 'acc_1',
        },
      ],
    }
  }

  // Flinks-specific implementations (Canadian)
  private async createFlinksLink(userId: string, institutionId?: string) {
    // This would integrate with Flinks API
    return {
      success: true,
      linkToken: `flinks-${Date.now()}`,
      linkUrl: 'https://connect.flinks.com/connect',
    }
  }

  private async exchangeFlinksToken(publicToken: string, userId: string) {
    // This would exchange token with Flinks
    const connectionId = `flinks_conn_${Date.now()}`
    
    const { error } = await supabaseAdmin.from('open_banking_connections').insert({
      user_id: userId,
      provider: 'flinks',
      provider_connection_id: connectionId,
      institution_id: 'rbc',
      institution_name: 'Royal Bank of Canada',
      account_type: 'checking',
      account_id: 'flinks_acc_1',
      account_name: 'RBC Chequing',
      account_number_masked: '****5678',
      balance: 7500.00,
      currency: 'CAD',
      status: 'active',
      consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      connectionId,
    }
  }

  private async fetchFlinksAccounts(accessToken: string) {
    return {
      success: true,
      accounts: [
        {
          account_id: 'flinks_acc_1',
          name: 'RBC Chequing',
          type: 'checking',
          balance: { current: 7500.00, available: 7000.00 },
          mask: '5678',
        },
      ],
    }
  }

  private async fetchFlinksTransactions(accessToken: string, startDate: string, endDate: string) {
    return {
      success: true,
      transactions: [
        {
          transaction_id: 'flinks_txn_1',
          amount: -200.00,
          date: '2024-01-15',
          name: 'Mortgage Payment',
          category: 'Housing',
          account_id: 'flinks_acc_1',
        },
      ],
    }
  }

  // Yodlee-specific implementations
  private async createYodleeLink(userId: string, institutionId?: string) {
    return {
      success: true,
      linkToken: `yodlee-${Date.now()}`,
      linkUrl: 'https://yodlee.com/connect',
    }
  }

  private async exchangeYodleeToken(publicToken: string, userId: string) {
    const connectionId = `yodlee_conn_${Date.now()}`
    
    const { error } = await supabaseAdmin.from('open_banking_connections').insert({
      user_id: userId,
      provider: 'yodlee',
      provider_connection_id: connectionId,
      institution_id: 'yodlee_ins_1',
      institution_name: 'Test Bank',
      account_type: 'checking',
      account_id: 'yodlee_acc_1',
      account_name: 'Test Checking',
      account_number_masked: '****9999',
      balance: 3000.00,
      currency: 'USD',
      status: 'active',
      consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      connectionId,
    }
  }

  private async fetchYodleeAccounts(accessToken: string) {
    return {
      success: true,
      accounts: [
        {
          account_id: 'yodlee_acc_1',
          name: 'Test Checking',
          type: 'checking',
          balance: { current: 3000.00, available: 2800.00 },
          mask: '9999',
        },
      ],
    }
  }

  private async fetchYodleeTransactions(accessToken: string, startDate: string, endDate: string) {
    return {
      success: true,
      transactions: [
        {
          transaction_id: 'yodlee_txn_1',
          amount: -100.00,
          date: '2024-01-15',
          name: 'Utility Bill',
          category: 'Utilities',
          account_id: 'yodlee_acc_1',
        },
      ],
    }
  }

  // TrueLayer-specific implementations
  private async createTrueLayerLink(userId: string, institutionId?: string) {
    return {
      success: true,
      linkToken: `truelayer-${Date.now()}`,
      linkUrl: 'https://truelayer.com/connect',
    }
  }

  private async exchangeTrueLayerToken(publicToken: string, userId: string) {
    const connectionId = `truelayer_conn_${Date.now()}`
    
    const { error } = await supabaseAdmin.from('open_banking_connections').insert({
      user_id: userId,
      provider: 'truelayer',
      provider_connection_id: connectionId,
      institution_id: 'truelayer_ins_1',
      institution_name: 'Test Bank',
      account_type: 'checking',
      account_id: 'truelayer_acc_1',
      account_name: 'Test Checking',
      account_number_masked: '****1111',
      balance: 4000.00,
      currency: 'GBP',
      status: 'active',
      consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      connectionId,
    }
  }

  private async fetchTrueLayerAccounts(accessToken: string) {
    return {
      success: true,
      accounts: [
        {
          account_id: 'truelayer_acc_1',
          name: 'Test Checking',
          type: 'checking',
          balance: { current: 4000.00, available: 3500.00 },
          mask: '1111',
        },
      ],
    }
  }

  private async fetchTrueLayerTransactions(accessToken: string, startDate: string, endDate: string) {
    return {
      success: true,
      transactions: [
        {
          transaction_id: 'truelayer_txn_1',
          amount: -75.00,
          date: '2024-01-15',
          name: 'Coffee Shop',
          category: 'Food and Drink',
          account_id: 'truelayer_acc_1',
        },
      ],
    }
  }

  // Store transactions in database
  async storeTransactions(connectionId: string, transactions: any[]): Promise<{
    success: boolean
    storedCount?: number
    error?: string
  }> {
    try {
      const transactionData = transactions.map(txn => ({
        connection_id: connectionId,
        transaction_id: txn.transaction_id,
        amount: txn.amount,
        currency: txn.currency || 'CAD',
        description: txn.name || txn.description,
        merchant_name: txn.merchant_name,
        category: Array.isArray(txn.category) ? txn.category[0] : txn.category,
        subcategory: Array.isArray(txn.category) ? txn.category[1] : undefined,
        transaction_date: txn.date,
        posted_date: txn.posted_date,
        account_balance: txn.balance,
        pending: txn.pending || false,
        metadata: txn,
      }))

      const { error, count } = await supabaseAdmin
        .from('open_banking_transactions')
        .upsert(transactionData, { onConflict: 'connection_id,transaction_id' })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        storedCount: count || transactionData.length,
      }
    } catch (error) {
      console.error('Transaction storage failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction storage failed',
      }
    }
  }

  // Get user's connections
  async getUserConnections(userId: string): Promise<{
    success: boolean
    connections?: OpenBankingConnection[]
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('open_banking_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        connections: data || [],
      }
    } catch (error) {
      console.error('Get user connections failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get user connections failed',
      }
    }
  }

  // Disconnect account
  async disconnectAccount(connectionId: string, userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabaseAdmin
        .from('open_banking_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Account disconnection failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account disconnection failed',
      }
    }
  }
}

// Factory function to create Open Banking service
export function createOpenBankingService(provider: OpenBankingProvider): OpenBankingService {
  const configs: Record<OpenBankingProvider, OpenBankingConfig> = {
    plaid: {
      provider: 'plaid',
      clientId: process.env.PLAID_CLIENT_ID!,
      clientSecret: process.env.PLAID_CLIENT_SECRET!,
      environment: (process.env.PLAID_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.PLAID_BASE_URL || 'https://sandbox.plaid.com',
    },
    flinks: {
      provider: 'flinks',
      clientId: process.env.FLINKS_CLIENT_ID!,
      clientSecret: process.env.FLINKS_CLIENT_SECRET!,
      environment: (process.env.FLINKS_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.FLINKS_BASE_URL || 'https://api.flinks.com',
    },
    yodlee: {
      provider: 'yodlee',
      clientId: process.env.YODLEE_CLIENT_ID!,
      clientSecret: process.env.YODLEE_CLIENT_SECRET!,
      environment: (process.env.YODLEE_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.YODLEE_BASE_URL || 'https://sandbox.yodlee.com',
    },
    truelayer: {
      provider: 'truelayer',
      clientId: process.env.TRUELAYER_CLIENT_ID!,
      clientSecret: process.env.TRUELAYER_CLIENT_SECRET!,
      environment: (process.env.TRUELAYER_ENVIRONMENT as any) || 'sandbox',
      baseUrl: process.env.TRUELAYER_BASE_URL || 'https://api.truelayer.com',
    },
  }

  return new OpenBankingService(configs[provider])
}
