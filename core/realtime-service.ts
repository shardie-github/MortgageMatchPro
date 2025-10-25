import { supabaseRealtime, RealtimeChannel } from './supabase'
import { analytics } from './monitoring'

// Realtime service for live updates and notifications
export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, any> = new Map()

  // Subscribe to user-specific updates
  subscribeToUserUpdates(userId: string, callbacks: {
    onMortgageCalculation?: (data: any) => void
    onRateCheck?: (data: any) => void
    onLead?: (data: any) => void
    onSubscription?: (data: any) => void
    onError?: (error: any) => void
  }): RealtimeChannel {
    const channelName = `user:${userId}`
    
    // Clean up existing channel if it exists
    this.unsubscribeFromUserUpdates(userId)

    const channel = supabaseRealtime
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mortgage_calculations',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('New mortgage calculation:', payload)
          callbacks.onMortgageCalculation?.(payload)
          analytics.trackRealtimeEvent('mortgage_calculation_created', { userId })
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'mortgage_calculations',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Mortgage calculation updated:', payload)
          callbacks.onMortgageCalculation?.(payload)
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rate_checks',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('New rate check:', payload)
          callbacks.onRateCheck?.(payload)
          analytics.trackRealtimeEvent('rate_check_created', { userId })
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'leads',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('New lead:', payload)
          callbacks.onLead?.(payload)
          analytics.trackRealtimeEvent('lead_created', { userId })
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'leads',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Lead updated:', payload)
          callbacks.onLead?.(payload)
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Subscription change:', payload)
          callbacks.onSubscription?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to user updates for ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to user updates for ${userId}`)
          callbacks.onError?.(new Error('Failed to subscribe to user updates'))
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to broker-specific updates
  subscribeToBrokerUpdates(brokerId: string, callbacks: {
    onNewLead?: (data: any) => void
    onLeadUpdate?: (data: any) => void
    onError?: (error: any) => void
  }): RealtimeChannel {
    const channelName = `broker:${brokerId}`
    
    // Clean up existing channel if it exists
    this.unsubscribeFromBrokerUpdates(brokerId)

    const channel = supabaseRealtime
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'leads',
          filter: `broker_id=eq.${brokerId}`
        }, 
        (payload) => {
          console.log('New lead for broker:', payload)
          callbacks.onNewLead?.(payload)
          analytics.trackRealtimeEvent('broker_new_lead', { brokerId })
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'leads',
          filter: `broker_id=eq.${brokerId}`
        }, 
        (payload) => {
          console.log('Lead updated for broker:', payload)
          callbacks.onLeadUpdate?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to broker updates for ${brokerId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to broker updates for ${brokerId}`)
          callbacks.onError?.(new Error('Failed to subscribe to broker updates'))
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to system-wide updates (admin only)
  subscribeToSystemUpdates(callbacks: {
    onNewUser?: (data: any) => void
    onSystemAlert?: (data: any) => void
    onError?: (error: any) => void
  }): RealtimeChannel {
    const channelName = 'system:updates'
    
    // Clean up existing channel if it exists
    this.unsubscribeFromSystemUpdates()

    const channel = supabaseRealtime
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'users'
        }, 
        (payload) => {
          console.log('New user registered:', payload)
          callbacks.onNewUser?.(payload)
          analytics.trackRealtimeEvent('user_registered', { userId: payload.new.id })
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'security_events',
          filter: 'severity=eq.critical'
        }, 
        (payload) => {
          console.log('Critical security event:', payload)
          callbacks.onSystemAlert?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to system updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to system updates')
          callbacks.onError?.(new Error('Failed to subscribe to system updates'))
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to rate updates
  subscribeToRateUpdates(callbacks: {
    onRateUpdate?: (data: any) => void
    onError?: (error: any) => void
  }): RealtimeChannel {
    const channelName = 'rates:updates'
    
    // Clean up existing channel if it exists
    this.unsubscribeFromRateUpdates()

    const channel = supabaseRealtime
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rate_checks'
        }, 
        (payload) => {
          console.log('New rate data available:', payload)
          callbacks.onRateUpdate?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to rate updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to rate updates')
          callbacks.onError?.(new Error('Failed to subscribe to rate updates'))
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Unsubscribe from user updates
  unsubscribeFromUserUpdates(userId: string): void {
    const channelName = `user:${userId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabaseRealtime.removeChannel(channel)
      this.channels.delete(channelName)
      console.log(`Unsubscribed from user updates for ${userId}`)
    }
  }

  // Unsubscribe from broker updates
  unsubscribeFromBrokerUpdates(brokerId: string): void {
    const channelName = `broker:${brokerId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabaseRealtime.removeChannel(channel)
      this.channels.delete(channelName)
      console.log(`Unsubscribed from broker updates for ${brokerId}`)
    }
  }

  // Unsubscribe from system updates
  unsubscribeFromSystemUpdates(): void {
    const channelName = 'system:updates'
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabaseRealtime.removeChannel(channel)
      this.channels.delete(channelName)
      console.log('Unsubscribed from system updates')
    }
  }

  // Unsubscribe from rate updates
  unsubscribeFromRateUpdates(): void {
    const channelName = 'rates:updates'
    const channel = this.channels.get(channelName)
    
    if (channel) {
      supabaseRealtime.removeChannel(channel)
      this.channels.delete(channelName)
      console.log('Unsubscribed from rate updates')
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabaseRealtime.removeChannel(channel)
      console.log(`Unsubscribed from ${channelName}`)
    })
    this.channels.clear()
    this.subscriptions.clear()
  }

  // Send realtime notification to specific user
  async sendUserNotification(userId: string, notification: {
    type: string
    title: string
    message: string
    data?: any
  }): Promise<boolean> {
    try {
      const channel = this.channels.get(`user:${userId}`)
      if (!channel) {
        console.warn(`No active channel for user ${userId}`)
        return false
      }

      const { error } = await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          ...notification,
          timestamp: new Date().toISOString(),
          userId
        }
      })

      if (error) {
        console.error('Error sending user notification:', error)
        return false
      }

      analytics.trackRealtimeEvent('notification_sent', { userId, type: notification.type })
      return true
    } catch (error) {
      console.error('Error sending user notification:', error)
      return false
    }
  }

  // Send realtime notification to all brokers
  async sendBrokerNotification(notification: {
    type: string
    title: string
    message: string
    data?: any
  }): Promise<boolean> {
    try {
      // This would typically be implemented with a broker notification system
      // For now, we'll log the notification
      console.log('Broker notification:', notification)
      
      analytics.trackRealtimeEvent('broker_notification_sent', { type: notification.type })
      return true
    } catch (error) {
      console.error('Error sending broker notification:', error)
      return false
    }
  }

  // Get connection status
  getConnectionStatus(): 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' {
    return supabaseRealtime.getChannels().length > 0 ? 'CONNECTED' : 'DISCONNECTED'
  }

  // Get active channels
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  // Cleanup on component unmount
  cleanup(): void {
    this.unsubscribeAll()
  }
}

// Export singleton instance
export const realtime = new RealtimeService()

// Hook for React components
export function useRealtime() {
  return {
    subscribeToUserUpdates: realtime.subscribeToUserUpdates.bind(realtime),
    subscribeToBrokerUpdates: realtime.subscribeToBrokerUpdates.bind(realtime),
    subscribeToSystemUpdates: realtime.subscribeToSystemUpdates.bind(realtime),
    subscribeToRateUpdates: realtime.subscribeToRateUpdates.bind(realtime),
    unsubscribeFromUserUpdates: realtime.unsubscribeFromUserUpdates.bind(realtime),
    unsubscribeFromBrokerUpdates: realtime.unsubscribeFromBrokerUpdates.bind(realtime),
    unsubscribeFromSystemUpdates: realtime.unsubscribeFromSystemUpdates.bind(realtime),
    unsubscribeFromRateUpdates: realtime.unsubscribeFromRateUpdates.bind(realtime),
    unsubscribeAll: realtime.unsubscribeAll.bind(realtime),
    sendUserNotification: realtime.sendUserNotification.bind(realtime),
    sendBrokerNotification: realtime.sendBrokerNotification.bind(realtime),
    getConnectionStatus: realtime.getConnectionStatus.bind(realtime),
    getActiveChannels: realtime.getActiveChannels.bind(realtime),
    cleanup: realtime.cleanup.bind(realtime)
  }
}