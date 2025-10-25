import { OrganizationBranding } from '../types/tenancy'

export interface ThemeTokens {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    error: string
    warning: string
    success: string
    info: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      '4xl': string
    }
    fontWeight: {
      normal: number
      medium: number
      semibold: number
      bold: number
    }
    lineHeight: {
      tight: number
      normal: number
      relaxed: number
    }
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export class ThemeService {
  /**
   * Generate CSS variables from organization branding
   */
  static generateCSSVariables(branding: OrganizationBranding): string {
    const tokens = this.generateThemeTokens(branding)
    
    return `
      :root {
        /* Colors */
        --color-primary: ${tokens.colors.primary};
        --color-secondary: ${tokens.colors.secondary};
        --color-accent: ${tokens.colors.accent};
        --color-background: ${tokens.colors.background};
        --color-surface: ${tokens.colors.surface};
        --color-text: ${tokens.colors.text};
        --color-text-secondary: ${tokens.colors.textSecondary};
        --color-border: ${tokens.colors.border};
        --color-error: ${tokens.colors.error};
        --color-warning: ${tokens.colors.warning};
        --color-success: ${tokens.colors.success};
        --color-info: ${tokens.colors.info};
        
        /* Typography */
        --font-family: ${tokens.typography.fontFamily};
        --font-size-xs: ${tokens.typography.fontSize.xs};
        --font-size-sm: ${tokens.typography.fontSize.sm};
        --font-size-base: ${tokens.typography.fontSize.base};
        --font-size-lg: ${tokens.typography.fontSize.lg};
        --font-size-xl: ${tokens.typography.fontSize.xl};
        --font-size-2xl: ${tokens.typography.fontSize['2xl']};
        --font-size-3xl: ${tokens.typography.fontSize['3xl']};
        --font-size-4xl: ${tokens.typography.fontSize['4xl']};
        --font-weight-normal: ${tokens.typography.fontWeight.normal};
        --font-weight-medium: ${tokens.typography.fontWeight.medium};
        --font-weight-semibold: ${tokens.typography.fontWeight.semibold};
        --font-weight-bold: ${tokens.typography.fontWeight.bold};
        --line-height-tight: ${tokens.typography.lineHeight.tight};
        --line-height-normal: ${tokens.typography.lineHeight.normal};
        --line-height-relaxed: ${tokens.typography.lineHeight.relaxed};
        
        /* Spacing */
        --spacing-xs: ${tokens.spacing.xs};
        --spacing-sm: ${tokens.spacing.sm};
        --spacing-md: ${tokens.spacing.md};
        --spacing-lg: ${tokens.spacing.lg};
        --spacing-xl: ${tokens.spacing.xl};
        --spacing-2xl: ${tokens.spacing['2xl']};
        --spacing-3xl: ${tokens.spacing['3xl']};
        
        /* Border Radius */
        --border-radius-sm: ${tokens.borderRadius.sm};
        --border-radius-md: ${tokens.borderRadius.md};
        --border-radius-lg: ${tokens.borderRadius.lg};
        --border-radius-xl: ${tokens.borderRadius.xl};
        --border-radius-full: ${tokens.borderRadius.full};
        
        /* Shadows */
        --shadow-sm: ${tokens.shadows.sm};
        --shadow-md: ${tokens.shadows.md};
        --shadow-lg: ${tokens.shadows.lg};
        --shadow-xl: ${tokens.shadows.xl};
      }
    `
  }

  /**
   * Generate theme tokens from organization branding
   */
  static generateThemeTokens(branding: OrganizationBranding): ThemeTokens {
    const primaryColor = branding.primaryColor || '#3B82F6'
    const secondaryColor = branding.secondaryColor || '#1E40AF'
    const accentColor = branding.accentColor || '#F59E0B'
    const fontFamily = branding.fontFamily || 'Inter, system-ui, sans-serif'

    // Generate color palette from primary color
    const colors = this.generateColorPalette(primaryColor, secondaryColor, accentColor)

    return {
      colors,
      typography: {
        fontFamily,
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem'
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }
    }
  }

  /**
   * Generate a complete color palette from primary colors
   */
  private static generateColorPalette(
    primary: string,
    secondary: string,
    accent: string
  ): ThemeTokens['colors'] {
    return {
      primary,
      secondary,
      accent,
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      info: '#3B82F6'
    }
  }

  /**
   * Generate Tailwind CSS config from organization branding
   */
  static generateTailwindConfig(branding: OrganizationBranding): any {
    const tokens = this.generateThemeTokens(branding)

    return {
      theme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: tokens.colors.primary,
              50: this.lightenColor(tokens.colors.primary, 0.9),
              100: this.lightenColor(tokens.colors.primary, 0.8),
              200: this.lightenColor(tokens.colors.primary, 0.6),
              300: this.lightenColor(tokens.colors.primary, 0.4),
              400: this.lightenColor(tokens.colors.primary, 0.2),
              500: tokens.colors.primary,
              600: this.darkenColor(tokens.colors.primary, 0.2),
              700: this.darkenColor(tokens.colors.primary, 0.4),
              800: this.darkenColor(tokens.colors.primary, 0.6),
              900: this.darkenColor(tokens.colors.primary, 0.8),
            },
            secondary: {
              DEFAULT: tokens.colors.secondary,
              50: this.lightenColor(tokens.colors.secondary, 0.9),
              100: this.lightenColor(tokens.colors.secondary, 0.8),
              200: this.lightenColor(tokens.colors.secondary, 0.6),
              300: this.lightenColor(tokens.colors.secondary, 0.4),
              400: this.lightenColor(tokens.colors.secondary, 0.2),
              500: tokens.colors.secondary,
              600: this.darkenColor(tokens.colors.secondary, 0.2),
              700: this.darkenColor(tokens.colors.secondary, 0.4),
              800: this.darkenColor(tokens.colors.secondary, 0.6),
              900: this.darkenColor(tokens.colors.secondary, 0.8),
            },
            accent: {
              DEFAULT: tokens.colors.accent,
              50: this.lightenColor(tokens.colors.accent, 0.9),
              100: this.lightenColor(tokens.colors.accent, 0.8),
              200: this.lightenColor(tokens.colors.accent, 0.6),
              300: this.lightenColor(tokens.colors.accent, 0.4),
              400: this.lightenColor(tokens.colors.accent, 0.2),
              500: tokens.colors.accent,
              600: this.darkenColor(tokens.colors.accent, 0.2),
              700: this.darkenColor(tokens.colors.accent, 0.4),
              800: this.darkenColor(tokens.colors.accent, 0.6),
              900: this.darkenColor(tokens.colors.accent, 0.8),
            }
          },
          fontFamily: {
            sans: [tokens.typography.fontFamily, 'system-ui', 'sans-serif']
          },
          fontSize: tokens.typography.fontSize,
          fontWeight: tokens.typography.fontWeight,
          lineHeight: tokens.typography.lineHeight,
          spacing: tokens.spacing,
          borderRadius: tokens.borderRadius,
          boxShadow: tokens.shadows
        }
      }
    }
  }

  /**
   * Generate custom CSS for white-label styling
   */
  static generateCustomCSS(branding: OrganizationBranding): string {
    const customCSS = branding.customCss || ''
    
    return `
      ${this.generateCSSVariables(branding)}
      
      /* Custom branding styles */
      .branded-logo {
        background-image: url('${branding.logo || ''}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      
      .branded-favicon {
        background-image: url('${branding.favicon || ''}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      
      /* Custom CSS from organization */
      ${customCSS}
    `
  }

  /**
   * Validate branding configuration
   */
  static validateBranding(branding: Partial<OrganizationBranding>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate colors
    if (branding.primaryColor && !this.isValidColor(branding.primaryColor)) {
      errors.push('Invalid primary color format')
    }
    if (branding.secondaryColor && !this.isValidColor(branding.secondaryColor)) {
      errors.push('Invalid secondary color format')
    }
    if (branding.accentColor && !this.isValidColor(branding.accentColor)) {
      errors.push('Invalid accent color format')
    }

    // Validate font family
    if (branding.fontFamily && typeof branding.fontFamily !== 'string') {
      errors.push('Invalid font family')
    }

    // Validate URLs
    if (branding.logo && !this.isValidUrl(branding.logo)) {
      errors.push('Invalid logo URL')
    }
    if (branding.favicon && !this.isValidUrl(branding.favicon)) {
      errors.push('Invalid favicon URL')
    }
    if (branding.termsUrl && !this.isValidUrl(branding.termsUrl)) {
      errors.push('Invalid terms URL')
    }
    if (branding.privacyUrl && !this.isValidUrl(branding.privacyUrl)) {
      errors.push('Invalid privacy URL')
    }

    // Validate email
    if (branding.supportEmail && !this.isValidEmail(branding.supportEmail)) {
      errors.push('Invalid support email')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if a color is valid
   */
  private static isValidColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/
    
    return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color)
  }

  /**
   * Check if a URL is valid
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if an email is valid
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Lighten a color by a percentage
   */
  private static lightenColor(color: string, amount: number): string {
    // This is a simplified implementation
    // In a real implementation, you'd want to use a proper color manipulation library
    return color
  }

  /**
   * Darken a color by a percentage
   */
  private static darkenColor(color: string, amount: number): string {
    // This is a simplified implementation
    // In a real implementation, you'd want to use a proper color manipulation library
    return color
  }
}