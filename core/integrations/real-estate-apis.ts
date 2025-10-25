import axios from 'axios'

export interface MLSProperty {
  id: string
  mlsId: string
  address: string
  city: string
  province: string
  postalCode: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  lotSize: number
  propertyType: string
  listingType: string
  status: string
  listingDate: string
  images: string[]
  description: string
  features: string[]
  coordinates: {
    lat: number
    lng: number
  }
  agent: {
    name: string
    phone: string
    email: string
    company: string
  }
}

export interface PropertySearchFilters {
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  bathrooms?: number
  propertyType?: string[]
  city?: string
  province?: string
  postalCode?: string
  radius?: number // in km
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface PropertySearchResult {
  properties: MLSProperty[]
  totalCount: number
  hasMore: boolean
  nextPageToken?: string
}

export class RealEstateAPIManager {
  private repliersAPIKey: string
  private zillowAPIKey: string
  private supabaseAdmin: any

  constructor(supabaseAdmin: any) {
    this.repliersAPIKey = process.env.REPLIERS_MLS_API_KEY || ''
    this.zillowAPIKey = process.env.ZILLOW_API_KEY || ''
    this.supabaseAdmin = supabaseAdmin
  }

  /**
   * Search properties using Repliers MLS API (Canada)
   */
  async searchPropertiesCanada(filters: PropertySearchFilters): Promise<PropertySearchResult> {
    try {
      const params = this.buildRepliersParams(filters)
      
      const response = await axios.get('https://api.repliers.io/v1/properties', {
        headers: {
          'Authorization': `Bearer ${this.repliersAPIKey}`,
          'Content-Type': 'application/json'
        },
        params
      })

      const properties = response.data.properties.map(this.transformRepliersProperty)
      
      // Cache results
      await this.cacheProperties(properties, filters)
      
      return {
        properties,
        totalCount: response.data.totalCount,
        hasMore: response.data.hasMore,
        nextPageToken: response.data.nextPageToken
      }
    } catch (error) {
      console.error('Error searching properties in Canada:', error)
      throw new Error('Failed to search properties')
    }
  }

  /**
   * Search properties using Zillow API (USA)
   */
  async searchPropertiesUSA(filters: PropertySearchFilters): Promise<PropertySearchResult> {
    try {
      const params = this.buildZillowParams(filters)
      
      const response = await axios.get('https://api.zillow.com/v1/properties/search', {
        headers: {
          'X-RapidAPI-Key': this.zillowAPIKey,
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
        },
        params
      })

      const properties = response.data.results.map(this.transformZillowProperty)
      
      // Cache results
      await this.cacheProperties(properties, filters)
      
      return {
        properties,
        totalCount: response.data.totalCount,
        hasMore: response.data.hasMore,
        nextPageToken: response.data.nextPageToken
      }
    } catch (error) {
      console.error('Error searching properties in USA:', error)
      throw new Error('Failed to search properties')
    }
  }

  /**
   * Get property suggestions based on affordability calculation
   */
  async getAffordabilitySuggestions(
    maxPrice: number,
    location: string,
    preferences: any = {}
  ): Promise<MLSProperty[]> {
    try {
      const filters: PropertySearchFilters = {
        maxPrice,
        city: location,
        ...preferences
      }

      // Search in both Canada and USA
      const [canadaResults, usaResults] = await Promise.allSettled([
        this.searchPropertiesCanada(filters),
        this.searchPropertiesUSA(filters)
      ])

      const properties: MLSProperty[] = []
      
      if (canadaResults.status === 'fulfilled') {
        properties.push(...canadaResults.value.properties.slice(0, 5))
      }
      
      if (usaResults.status === 'fulfilled') {
        properties.push(...usaResults.value.properties.slice(0, 5))
      }

      // Sort by price and relevance
      return properties
        .sort((a, b) => a.price - b.price)
        .slice(0, 10)
    } catch (error) {
      console.error('Error getting affordability suggestions:', error)
      return []
    }
  }

  /**
   * Get property details by MLS ID
   */
  async getPropertyDetails(mlsId: string, country: 'CA' | 'US'): Promise<MLSProperty | null> {
    try {
      // Check cache first
      const cached = await this.getCachedProperty(mlsId)
      if (cached) {
        return cached
      }

      let property: MLSProperty
      
      if (country === 'CA') {
        const response = await axios.get(`https://api.repliers.io/v1/properties/${mlsId}`, {
          headers: {
            'Authorization': `Bearer ${this.repliersAPIKey}`
          }
        })
        property = this.transformRepliersProperty(response.data)
      } else {
        const response = await axios.get(`https://api.zillow.com/v1/properties/${mlsId}`, {
          headers: {
            'X-RapidAPI-Key': this.zillowAPIKey,
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
          }
        })
        property = this.transformZillowProperty(response.data)
      }

      // Cache the property
      await this.cacheProperty(property)
      
      return property
    } catch (error) {
      console.error('Error getting property details:', error)
      return null
    }
  }

  /**
   * Get market insights for a specific area
   */
  async getMarketInsights(location: string, propertyType: string = 'single_family'): Promise<{
    averagePrice: number
    medianPrice: number
    pricePerSqFt: number
    daysOnMarket: number
    inventoryCount: number
    priceTrend: 'increasing' | 'decreasing' | 'stable'
    marketActivity: 'hot' | 'warm' | 'cool'
  }> {
    try {
      // This would integrate with market data APIs
      // For now, return mock data
      return {
        averagePrice: 750000,
        medianPrice: 720000,
        pricePerSqFt: 650,
        daysOnMarket: 28,
        inventoryCount: 150,
        priceTrend: 'increasing',
        marketActivity: 'warm'
      }
    } catch (error) {
      console.error('Error getting market insights:', error)
      throw new Error('Failed to get market insights')
    }
  }

  private buildRepliersParams(filters: PropertySearchFilters): any {
    const params: any = {
      limit: 50,
      offset: 0
    }

    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice
    if (filters.bedrooms) params.bedrooms = filters.bedrooms
    if (filters.bathrooms) params.bathrooms = filters.bathrooms
    if (filters.propertyType?.length) params.propertyType = filters.propertyType.join(',')
    if (filters.city) params.city = filters.city
    if (filters.province) params.province = filters.province
    if (filters.postalCode) params.postalCode = filters.postalCode
    if (filters.coordinates) {
      params.lat = filters.coordinates.lat
      params.lng = filters.coordinates.lng
      if (filters.radius) params.radius = filters.radius
    }

    return params
  }

  private buildZillowParams(filters: PropertySearchFilters): any {
    const params: any = {
      limit: 50,
      offset: 0
    }

    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice
    if (filters.bedrooms) params.bedrooms = filters.bedrooms
    if (filters.bathrooms) params.bathrooms = filters.bathrooms
    if (filters.propertyType?.length) params.propertyType = filters.propertyType.join(',')
    if (filters.city) params.city = filters.city
    if (filters.coordinates) {
      params.lat = filters.coordinates.lat
      params.lng = filters.coordinates.lng
      if (filters.radius) params.radius = filters.radius
    }

    return params
  }

  private transformRepliersProperty(data: any): MLSProperty {
    return {
      id: data.id,
      mlsId: data.mlsId,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      price: data.price,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.squareFeet,
      lotSize: data.lotSize,
      propertyType: data.propertyType,
      listingType: data.listingType,
      status: data.status,
      listingDate: data.listingDate,
      images: data.images || [],
      description: data.description,
      features: data.features || [],
      coordinates: {
        lat: data.coordinates?.lat || 0,
        lng: data.coordinates?.lng || 0
      },
      agent: {
        name: data.agent?.name || '',
        phone: data.agent?.phone || '',
        email: data.agent?.email || '',
        company: data.agent?.company || ''
      }
    }
  }

  private transformZillowProperty(data: any): MLSProperty {
    return {
      id: data.zpid,
      mlsId: data.zpid,
      address: data.address,
      city: data.city,
      province: data.state,
      postalCode: data.zipcode,
      price: data.price,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.livingArea,
      lotSize: data.lotAreaValue,
      propertyType: data.homeType,
      listingType: data.listingType,
      status: data.homeStatus,
      listingDate: data.datePosted,
      images: data.photos || [],
      description: data.description,
      features: data.features || [],
      coordinates: {
        lat: data.latitude || 0,
        lng: data.longitude || 0
      },
      agent: {
        name: data.agent?.name || '',
        phone: data.agent?.phone || '',
        email: data.agent?.email || '',
        company: data.agent?.company || ''
      }
    }
  }

  private async cacheProperties(properties: MLSProperty[], filters: PropertySearchFilters): Promise<void> {
    try {
      const cacheEntries = properties.map(property => ({
        mls_id: property.mlsId,
        property_data: property,
        location_data: {
          city: property.city,
          province: property.province,
          coordinates: property.coordinates
        },
        price_range: {
          min: filters.minPrice || 0,
          max: filters.maxPrice || 999999999
        },
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }))

      await this.supabaseAdmin
        .from('mls_property_cache')
        .upsert(cacheEntries, { onConflict: 'mls_id' })
    } catch (error) {
      console.error('Error caching properties:', error)
    }
  }

  private async cacheProperty(property: MLSProperty): Promise<void> {
    try {
      await this.supabaseAdmin
        .from('mls_property_cache')
        .upsert({
          mls_id: property.mlsId,
          property_data: property,
          location_data: {
            city: property.city,
            province: property.province,
            coordinates: property.coordinates
          },
          price_range: {
            min: property.price * 0.9,
            max: property.price * 1.1
          },
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
    } catch (error) {
      console.error('Error caching property:', error)
    }
  }

  private async getCachedProperty(mlsId: string): Promise<MLSProperty | null> {
    try {
      const { data } = await this.supabaseAdmin
        .from('mls_property_cache')
        .select('property_data')
        .eq('mls_id', mlsId)
        .gt('expires_at', new Date().toISOString())
        .single()

      return data?.property_data || null
    } catch (error) {
      return null
    }
  }
}