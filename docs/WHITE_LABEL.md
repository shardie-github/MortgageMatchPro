# White-Label Documentation

## Overview

MortgageMatchPro v1.3.0 includes comprehensive white-label capabilities, allowing organizations to customize their branding, theming, and domain to create a fully branded experience.

## Architecture

### Core Components

- **Theme Service**: Generates CSS variables and configurations
- **Branding Registry**: Stores organization-specific branding data
- **Custom Domain Support**: Routes custom domains to organizations
- **Asset Management**: Handles logos, favicons, and other assets
- **CSS Generation**: Creates organization-specific stylesheets

### Branding Data Structure

```typescript
interface OrganizationBranding {
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  customCss: string
  faviconUrl: string
  customDomain: string
  termsUrl: string
  privacyUrl: string
  supportEmail: string
}
```

## Theme System

### CSS Variables

The theme system generates CSS variables from branding data:

```typescript
import { ThemeService } from '@/lib/white-label/theme-service'

const branding: OrganizationBranding = {
  logoUrl: 'https://example.com/logo.png',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  fontFamily: 'Inter'
}

const cssVariables = ThemeService.generateCSSVariables(branding)
// Returns:
// {
//   '--primary-color': '#3B82F6',
//   '--secondary-color': '#1E40AF',
//   '--accent-color': '#F59E0B',
//   '--font-family': 'Inter'
// }
```

### Theme Application

Apply theme variables to the document:

```typescript
// Apply theme to document root
Object.entries(cssVariables).forEach(([key, value]) => {
  document.documentElement.style.setProperty(key, value)
})

// Or apply to specific element
const element = document.getElementById('app')
Object.entries(cssVariables).forEach(([key, value]) => {
  element.style.setProperty(key, value)
})
```

### Tailwind CSS Integration

Generate Tailwind configuration from branding:

```typescript
const tailwindConfig = ThemeService.generateTailwindConfig(branding)
// Returns Tailwind config object with custom colors and fonts
```

### Custom CSS Generation

Generate organization-specific CSS:

```typescript
const customCSS = ThemeService.generateCustomCSS(branding)
// Returns CSS string with organization-specific styles
```

## Branding Management

### Logo Management

#### Logo Upload

```typescript
// Upload logo file
const logoFile = new File([logoData], 'logo.png', { type: 'image/png' })
const logoUrl = await uploadAsset(logoFile, 'logos')

// Update branding
await OrganizationService.updateBranding(organizationId, {
  ...branding,
  logoUrl
}, userId, userRole)
```

#### Logo Display

```typescript
// Display logo in components
const Logo = ({ className }: { className?: string }) => {
  const { organization } = useTenantContext()
  
  return (
    <img
      src={organization.branding?.logoUrl || '/default-logo.png'}
      alt={`${organization.name} Logo`}
      className={className}
    />
  )
}
```

### Color Management

#### Color Palette Generation

```typescript
const colorPalette = ThemeService.generateColorPalette(branding.primaryColor)
// Returns:
// {
//   primary: '#3B82F6',
//   primaryLight: '#60A5FA',
//   primaryDark: '#1D4ED8',
//   primary50: '#EFF6FF',
//   primary100: '#DBEAFE',
//   // ... more shades
// }
```

#### Color Validation

```typescript
const isValid = ThemeService.validateBranding(branding)
if (!isValid) {
  console.error('Invalid branding configuration')
}
```

### Typography

#### Font Family Management

```typescript
const branding: OrganizationBranding = {
  fontFamily: 'Inter' // or 'Roboto', 'Open Sans', etc.
}

// Apply font family
document.documentElement.style.setProperty('--font-family', branding.fontFamily)
```

#### Font Loading

```typescript
// Load custom font
const loadFont = (fontFamily: string) => {
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

loadFont(branding.fontFamily)
```

## Custom Domains

### Domain Configuration

#### Setting Custom Domain

```typescript
await OrganizationService.updateBranding(organizationId, {
  ...branding,
  customDomain: 'app.acme-mortgage.com'
}, userId, userRole)
```

#### DNS Configuration

Organizations need to configure their DNS:

```
# CNAME record
app.acme-mortgage.com -> mortgagematchpro.com

# Or A record
app.acme-mortgage.com -> 192.0.2.1
```

#### Domain Routing

The application routes custom domains to organizations:

```typescript
// Middleware to handle custom domains
export function customDomainMiddleware(req: NextApiRequest, res: NextApiResponse, next: NextFunction) {
  const host = req.headers.host
  
  if (host !== 'mortgagematchpro.com') {
    // Look up organization by domain
    const organization = await getOrganizationByDomain(host)
    if (organization) {
      req.organization = organization
    }
  }
  
  next()
}
```

### SSL Certificates

Custom domains require SSL certificates:

```typescript
// Generate SSL certificate for custom domain
const certificate = await generateSSLCertificate(customDomain)
// This would typically be handled by your hosting provider
```

## Asset Management

### Asset Upload

```typescript
interface AssetUpload {
  file: File
  type: 'logo' | 'favicon' | 'background' | 'icon'
  organizationId: string
}

const uploadAsset = async ({ file, type, organizationId }: AssetUpload): Promise<string> => {
  // Upload to cloud storage (AWS S3, Cloudinary, etc.)
  const uploadResult = await cloudStorage.upload(file, {
    folder: `organizations/${organizationId}/${type}`,
    public: true
  })
  
  return uploadResult.url
}
```

### Asset Optimization

```typescript
const optimizeAsset = async (file: File, type: string): Promise<File> => {
  switch (type) {
    case 'logo':
      return await resizeImage(file, { width: 200, height: 200 })
    case 'favicon':
      return await resizeImage(file, { width: 32, height: 32 })
    case 'background':
      return await resizeImage(file, { width: 1920, height: 1080 })
    default:
      return file
  }
}
```

## Legal Pages

### Terms of Service

```typescript
const TermsPage = () => {
  const { organization } = useTenantContext()
  const termsUrl = organization.branding?.termsUrl
  
  if (termsUrl) {
    return <iframe src={termsUrl} className="w-full h-screen" />
  }
  
  return <DefaultTermsPage />
}
```

### Privacy Policy

```typescript
const PrivacyPage = () => {
  const { organization } = useTenantContext()
  const privacyUrl = organization.branding?.privacyUrl
  
  if (privacyUrl) {
    return <iframe src={privacyUrl} className="w-full h-screen" />
  }
  
  return <DefaultPrivacyPage />
}
```

### Support Contact

```typescript
const SupportPage = () => {
  const { organization } = useTenantContext()
  const supportEmail = organization.branding?.supportEmail
  
  return (
    <div>
      <h1>Support</h1>
      <p>
        Contact us at:{' '}
        <a href={`mailto:${supportEmail || 'support@mortgagematchpro.com'}`}>
          {supportEmail || 'support@mortgagematchpro.com'}
        </a>
      </p>
    </div>
  )
}
```

## Preview Mode

### Theme Preview

```typescript
const ThemePreview = ({ branding }: { branding: OrganizationBranding }) => {
  const [previewMode, setPreviewMode] = useState(false)
  
  useEffect(() => {
    if (previewMode) {
      // Apply preview theme
      const cssVariables = ThemeService.generateCSSVariables(branding)
      Object.entries(cssVariables).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    } else {
      // Reset to default theme
      resetTheme()
    }
  }, [previewMode, branding])
  
  return (
    <div>
      <button onClick={() => setPreviewMode(!previewMode)}>
        {previewMode ? 'Exit Preview' : 'Preview Theme'}
      </button>
      {/* Preview content */}
    </div>
  )
}
```

### Brand Safety Checks

```typescript
const validateBranding = (branding: OrganizationBranding): string[] => {
  const errors: string[] = []
  
  // Check color contrast
  if (getContrastRatio(branding.primaryColor, '#FFFFFF') < 4.5) {
    errors.push('Primary color has insufficient contrast with white text')
  }
  
  // Check logo dimensions
  if (branding.logoUrl) {
    const logo = new Image()
    logo.onload = () => {
      if (logo.width > 400 || logo.height > 200) {
        errors.push('Logo is too large (max 400x200px)')
      }
    }
    logo.src = branding.logoUrl
  }
  
  // Check font availability
  if (!isFontAvailable(branding.fontFamily)) {
    errors.push(`Font family "${branding.fontFamily}" is not available`)
  }
  
  return errors
}
```

## Implementation Examples

### React Component with Theming

```typescript
const ThemedButton = ({ children, variant = 'primary' }: { children: React.ReactNode, variant?: 'primary' | 'secondary' }) => {
  const { organization } = useTenantContext()
  const branding = organization.branding
  
  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: branding?.primaryColor || '#3B82F6',
          color: '#FFFFFF'
        }
      case 'secondary':
        return {
          backgroundColor: branding?.secondaryColor || '#1E40AF',
          color: '#FFFFFF'
        }
      default:
        return {}
    }
  }
  
  return (
    <button
      style={getButtonStyles()}
      className="px-4 py-2 rounded-md font-medium"
    >
      {children}
    </button>
  )
}
```

### CSS-in-JS with Theme

```typescript
import styled from 'styled-components'

const ThemedContainer = styled.div`
  background-color: var(--primary-color, #3B82F6);
  color: var(--text-color, #FFFFFF);
  font-family: var(--font-family, 'Inter');
  padding: 1rem;
  border-radius: 0.5rem;
`
```

### Tailwind CSS with Custom Colors

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A8A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  }
}
```

## Testing

### Theme Testing

```typescript
describe('Theme System', () => {
  it('should generate correct CSS variables', () => {
    const branding: OrganizationBranding = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      fontFamily: 'Arial'
    }
    
    const cssVariables = ThemeService.generateCSSVariables(branding)
    
    expect(cssVariables['--primary-color']).toBe('#FF0000')
    expect(cssVariables['--secondary-color']).toBe('#00FF00')
    expect(cssVariables['--font-family']).toBe('Arial')
  })
  
  it('should validate branding configuration', () => {
    const validBranding: OrganizationBranding = {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter'
    }
    
    const isValid = ThemeService.validateBranding(validBranding)
    expect(isValid).toBe(true)
  })
})
```

### Component Testing

```typescript
describe('ThemedButton', () => {
  it('should apply primary color from branding', () => {
    const branding: OrganizationBranding = {
      primaryColor: '#FF0000'
    }
    
    render(
      <TenantProvider value={{ organization: { branding } }}>
        <ThemedButton variant="primary">Click me</ThemedButton>
      </TenantProvider>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveStyle({ backgroundColor: '#FF0000' })
  })
})
```

## Best Practices

### Development

1. Use CSS variables for all themeable properties
2. Provide fallback values for all custom properties
3. Test with various branding configurations
4. Implement theme preview functionality
5. Validate branding data before applying

### Production

1. Cache generated CSS and assets
2. Implement CDN for custom assets
3. Monitor theme application performance
4. Provide brand safety validation
5. Support theme rollback functionality

### Security

1. Validate all uploaded assets
2. Sanitize custom CSS content
3. Implement CSP headers for custom domains
4. Audit theme changes
5. Prevent XSS through custom content

## Troubleshooting

### Common Issues

1. **Theme Not Applying**: Check CSS variable names and values
2. **Custom Domain Not Working**: Verify DNS configuration
3. **Assets Not Loading**: Check asset URLs and permissions
4. **Font Not Loading**: Verify font family name and availability
5. **Color Contrast Issues**: Use contrast checking tools

### Debug Tools

- Theme inspector browser extension
- CSS variable debugger
- Asset loading monitor
- Domain resolution checker
- Brand safety validator