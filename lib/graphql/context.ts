import { Request } from 'express'
import { supabase } from '../supabase'

export interface GraphQLContext {
  user?: {
    id: string
    email: string
    subscriptionTier: string
  }
  supabase: typeof supabase
}

export const createContext = async ({ request }: { request: Request }): Promise<GraphQLContext> => {
  // Extract authorization header
  const authHeader = request.headers.authorization
  let user = undefined

  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token)
      
      if (!error && authUser) {
        // Get user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          user = {
            id: profile.id,
            email: profile.email,
            subscriptionTier: profile.subscription_tier,
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  return {
    user,
    supabase,
  }
}