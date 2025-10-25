'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star,
  Clock
} from 'lucide-react'

interface UserScenario {
  id: string
  scenario_name: string
  scenario_type: 'affordability' | 'rate_comparison' | 'amortization'
  scenario_data: any
  is_favorite: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

interface ScenarioListProps {
  scenarios: UserScenario[]
  searchTerm: string
  filterType: string
  onSearchChange: (value: string) => void
  onFilterChange: (value: string) => void
  onSaveScenario: (scenarioData: any, scenarioType: string, scenarioName: string) => Promise<void>
  onToggleFavorite: (scenarioId: string, isFavorite: boolean) => Promise<void>
  onDeleteScenario: (scenarioId: string) => Promise<void>
  onViewScenario: (scenario: UserScenario) => void
}

const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  searchTerm,
  filterType,
  onSearchChange,
  onFilterChange,
  onSaveScenario,
  onToggleFavorite,
  onDeleteScenario,
  onViewScenario
}) => {
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.scenario_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || scenario.scenario_type === filterType
    return matchesSearch && matchesFilter
  })

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'affordability': return 'bg-blue-100 text-blue-800'
      case 'rate_comparison': return 'bg-green-100 text-green-800'
      case 'amortization': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Scenarios</CardTitle>
          <Button onClick={() => onSaveScenario({}, 'affordability', 'New Scenario')}>
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        </div>
        
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="all">All Types</option>
            <option value="affordability">Affordability</option>
            <option value="rate_comparison">Rate Comparison</option>
            <option value="amortization">Amortization</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredScenarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scenarios found</p>
              <p className="text-sm">Create your first scenario to get started</p>
            </div>
          ) : (
            filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{scenario.scenario_name}</h3>
                      <Badge className={getScenarioTypeColor(scenario.scenario_type)}>
                        {scenario.scenario_type.replace('_', ' ')}
                      </Badge>
                      {scenario.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {scenario.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(scenario.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewScenario(scenario)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleFavorite(scenario.id, !scenario.is_favorite)}
                    >
                      <Star className={`h-4 w-4 ${scenario.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ScenarioList
