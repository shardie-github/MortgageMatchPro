'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  Upload, 
  Settings, 
  MessageSquare, 
  Calendar,
  FileText,
  Users,
  BarChart3,
  Bell,
  HelpCircle
} from 'lucide-react'

interface QuickActionsProps {
  onExportData: () => void
  onImportData: () => void
  onOpenSettings: () => void
  onSendMessage: () => void
  onScheduleMeeting: () => void
  onGenerateReport: () => void
  onManageTeam: () => void
  onViewAnalytics: () => void
  onManageNotifications: () => void
  onGetHelp: () => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onExportData,
  onImportData,
  onOpenSettings,
  onSendMessage,
  onScheduleMeeting,
  onGenerateReport,
  onManageTeam,
  onViewAnalytics,
  onManageNotifications,
  onGetHelp
}) => {
  const actions = [
    {
      title: 'Export Data',
      description: 'Download leads and reports',
      icon: Download,
      onClick: onExportData,
      variant: 'default' as const,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Import Data',
      description: 'Upload leads from CSV',
      icon: Upload,
      onClick: onImportData,
      variant: 'outline' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Settings',
      description: 'Configure preferences',
      icon: Settings,
      onClick: onOpenSettings,
      variant: 'outline' as const,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      title: 'Send Message',
      description: 'Contact leads or team',
      icon: MessageSquare,
      onClick: onSendMessage,
      variant: 'outline' as const,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Schedule Meeting',
      description: 'Book appointments',
      icon: Calendar,
      onClick: onScheduleMeeting,
      variant: 'outline' as const,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Generate Report',
      description: 'Create performance reports',
      icon: FileText,
      onClick: onGenerateReport,
      variant: 'outline' as const,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Manage Team',
      description: 'Team member management',
      icon: Users,
      onClick: onManageTeam,
      variant: 'outline' as const,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'View Analytics',
      description: 'Detailed performance metrics',
      icon: BarChart3,
      onClick: onViewAnalytics,
      variant: 'outline' as const,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    },
    {
      title: 'Notifications',
      description: 'Manage alerts and updates',
      icon: Bell,
      onClick: onManageNotifications,
      variant: 'outline' as const,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Get Help',
      description: 'Support and documentation',
      icon: HelpCircle,
      onClick: onGetHelp,
      variant: 'outline' as const,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.onClick}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
              >
                <div className={`p-2 rounded-full ${action.bgColor}`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}