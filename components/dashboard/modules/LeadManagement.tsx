'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  lead_score: number
  status: 'pending' | 'contacted' | 'converted' | 'rejected'
  created_at: string
  updated_at: string
  broker_id: string | null
  lead_data: any
}

interface LeadManagementProps {
  leads: Lead[]
  onLeadUpdate: (leadId: string, updates: Partial<Lead>) => void
  onLeadContact: (leadId: string) => void
  onLeadConvert: (leadId: string) => void
  onLeadReject: (leadId: string) => void
  onExportLeads: () => void
}

const getStatusIcon = (status: Lead['status']) => {
  switch (status) {
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'contacted':
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'converted':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'contacted':
      return 'bg-blue-100 text-blue-800'
    case 'converted':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const LeadManagement: React.FC<LeadManagementProps> = ({
  leads,
  onLeadUpdate,
  onLeadContact,
  onLeadConvert,
  onLeadReject,
  onExportLeads
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'lead_score' | 'name'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.phone.includes(searchTerm)
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'lead_score':
          aValue = a.lead_score
          bValue = b.lead_score
          break
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    onLeadUpdate(leadId, { status: newStatus })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Lead Management</span>
            <Badge variant="secondary">{leads.length} leads</Badge>
          </CardTitle>
          <Button onClick={onExportLeads} variant="outline" size="sm">
            Export Leads
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Lead['status'] | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as typeof sortBy)
                setSortOrder(order as typeof sortOrder)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="lead_score-desc">Highest Score</option>
              <option value="lead_score-asc">Lowest Score</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
        </div>

        {/* Leads List */}
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getStatusIcon(lead.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{lead.name}</h3>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    <Badge variant="outline">
                      Score: {lead.lead_score}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLeadContact(lead.id)}
                  disabled={lead.status === 'converted' || lead.status === 'rejected'}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {lead.status === 'pending' && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStatusChange(lead.id, 'contacted')}
                    >
                      Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(lead.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {lead.status === 'contacted' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusChange(lead.id, 'converted')}
                  >
                    Convert
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No leads found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  )
}