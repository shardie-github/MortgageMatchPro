/**
 * Storybook Preview Configuration - MortgageMatchPro v1.4.0
 * 
 * Global configuration for Storybook stories
 */

import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import { withTests } from '@storybook/addon-jest';
import { withA11y } from '@storybook/addon-a11y';
import { withDesign } from 'storybook-addon-designs';
import { withMock } from 'storybook-addon-mock';

// Import global styles
import '../styles/globals.css';

// Import test results
import results from '../test-results.json';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
      source: {
        type: 'code',
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        largeDesktop: {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'gray',
          value: '#f5f5f5',
        },
      ],
    },
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: true,
    },
    jest: {
      results,
    },
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/coverage/**',
        '**/.storybook/**',
        '**/dist/**',
        '**/build/**',
      ],
    },
    design: {
      preset: 'figma',
      url: 'https://www.figma.com/file/your-design-system',
    },
    mockData: [
      {
        url: '/api/mortgage/calculate',
        method: 'POST',
        status: 200,
        response: {
          monthlyPayment: 2500,
          totalInterest: 300000,
          totalCost: 600000,
          amortization: []
        },
      },
    ],
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    withTests({
      results,
    }),
    withA11y,
    withDesign,
    withMock,
    (Story) => (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' 
      }}>
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Spanish' },
          { value: 'fr', title: 'French' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;