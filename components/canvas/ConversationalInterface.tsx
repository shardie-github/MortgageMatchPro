'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Calculator, TrendingUp, BarChart3, Users } from 'lucide-react'
import { agentRegistry } from '@/lib/agents/openai-agent-sdk'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'affordability' | 'rates' | 'scenarios' | 'broker' | 'general'
}

interface ConversationalInterfaceProps {
  onIntentDetected?: (intent: string, data: any) => void
  onCanvasOpen?: (component: string, data: any) => void
}

export function ConversationalInterface({ 
  onIntentDetected, 
  onCanvasOpen 
}: ConversationalInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI mortgage advisor. I can help you calculate affordability, compare rates, analyze scenarios, and connect with brokers. What would you like to know?",
      timestamp: new Date(),
      type: 'general'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Use the mortgage advisor agent to process the message
      const response = await agentRegistry.executeAgent('mortgage_advisor', input.trim())
      
      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data?.message || 'I understand you need help with mortgages. Let me assist you with that.',
          timestamp: new Date(),
          type: response.data?.type || 'general'
        }

        setMessages(prev => [...prev, assistantMessage])

        // Trigger intent detection and canvas opening if needed
        if (response.data?.type && onIntentDetected) {
          onIntentDetected(response.data.type, response.data)
        }

        if (response.data?.canvasComponent && onCanvasOpen) {
          onCanvasOpen(response.data.canvasComponent, response.data)
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          type: 'general'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        type: 'general'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'affordability':
        return <Calculator className="h-4 w-4" />
      case 'rates':
        return <TrendingUp className="h-4 w-4" />
      case 'scenarios':
        return <BarChart3 className="h-4 w-4" />
      case 'broker':
        return <Users className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const quickActions = [
    { label: "Can I afford a $600K home?", intent: "affordability" },
    { label: "Show me current rates", intent: "rates" },
    { label: "Compare mortgage scenarios", intent: "scenarios" },
    { label: "Connect me with a broker", intent: "broker" }
  ]

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-lg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                {getMessageIcon(message.type)}
              </div>
            )}
            
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.label)}
              className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about mortgages..."
            className="flex-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}