import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/error?message=' + encodeURIComponent(error.message))
          return
        }

        if (data.session) {
          // User is authenticated, redirect to main app
          router.push('/')
        } else {
          // No session, redirect to login
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/auth/error?message=' + encodeURIComponent('Authentication failed'))
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p>Completing authentication...</p>
      </div>
    </div>
  )
}