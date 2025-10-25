/**
 * Post-Launch System Demo Component
 * Demonstrates how to integrate the post-launch features
 */

import React, { useEffect, useState } from 'react'
import { 
  trackUserEvent, 
  trackAIQuery, 
  collectFeedback, 
  checkFeatureAccess,
  getFeatureConfig 
} from '../lib/post-launch-integration'

interface PostLaunchDemoProps {
  userId: string
}

export default function PostLaunchDemo({ userId }: PostLaunchDemoProps) {
  const [hasAdvancedFeatures, setHasAdvancedFeatures] = useState(false)
  const [featureConfig, setFeatureConfig] = useState<any>({})
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    const initializeFeatures = async () => {
      try {
        // Check if user has access to advanced features
        const hasAccess = await checkFeatureAccess(userId, 'advanced_calculator')
        setHasAdvancedFeatures(hasAccess)

        // Get feature configuration for A/B testing
        const config = await getFeatureConfig(userId, 'prompt_style')
        setFeatureConfig(config)

        // Track page view
        await trackUserEvent(userId, 'demo_page_viewed', {
          hasAdvancedFeatures: hasAccess,
          promptStyle: config.style || 'default'
        })
      } catch (error) {
        console.error('Failed to initialize features:', error)
      }
    }

    initializeFeatures()
  }, [userId])

  const handleCalculate = async () => {
    const startTime = Date.now()
    
    try {
      // Simulate AI query
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Track successful AI query
      await trackAIQuery(userId, 'mortgage', true, Date.now() - startTime)
      
      // Track calculation event
      await trackUserEvent(userId, 'mortgage_calculated', {
        propertyValue: 500000,
        downPayment: 100000,
        hasAdvancedFeatures
      })
      
      alert('Calculation completed successfully!')
    } catch (error) {
      // Track failed AI query
      await trackAIQuery(userId, 'mortgage', false, Date.now() - startTime, error.message)
      alert('Calculation failed. Please try again.')
    }
  }

  const handleFeedback = async (rating: number, comment: string) => {
    try {
      const feedbackId = await collectFeedback(
        userId,
        'recommendation',
        rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
        rating,
        comment
      )
      
      setFeedbackSubmitted(true)
      alert(`Feedback submitted! ID: ${feedbackId}`)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Post-Launch System Demo</h2>
      
      {/* Feature Access Demo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Feature Access</h3>
        <p className="text-gray-600 mb-2">
          Advanced Features: {hasAdvancedFeatures ? '✅ Enabled' : '❌ Disabled'}
        </p>
        <p className="text-gray-600 mb-2">
          Prompt Style: {featureConfig.style || 'default'}
        </p>
        {hasAdvancedFeatures && (
          <div className="bg-green-100 p-3 rounded">
            <p className="text-green-800">
              🎉 You have access to advanced mortgage calculation features!
            </p>
          </div>
        )}
      </div>

      {/* AI Query Demo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">AI Query Tracking</h3>
        <button
          onClick={handleCalculate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Calculate Mortgage
        </button>
        <p className="text-sm text-gray-500 mt-2">
          This will simulate an AI query and track performance metrics.
        </p>
      </div>

      {/* Feedback Demo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Feedback Collection</h3>
        {!feedbackSubmitted ? (
          <div className="space-y-2">
            <p className="text-gray-600">How would you rate this demo?</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleFeedback(rating, `Rated ${rating} stars`)}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                >
                  {rating} ⭐
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-green-100 p-3 rounded">
            <p className="text-green-800">✅ Feedback submitted successfully!</p>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">System Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">User ID:</span> {userId}
          </div>
          <div>
            <span className="font-medium">Features:</span> {hasAdvancedFeatures ? 'Pro' : 'Free'}
          </div>
          <div>
            <span className="font-medium">Prompt Style:</span> {featureConfig.style || 'default'}
          </div>
          <div>
            <span className="font-medium">Feedback:</span> {feedbackSubmitted ? 'Submitted' : 'Pending'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold text-blue-800 mb-2">What's Happening Behind the Scenes:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• User events are being tracked for analytics</li>
          <li>• AI queries are monitored for performance and cost</li>
          <li>• Feedback is collected and routed to support teams</li>
          <li>• Feature access is controlled by subscription tiers</li>
          <li>• A/B testing determines which features you see</li>
        </ul>
      </div>
    </div>
  )
}
