/**
 * Storybook Configuration - MortgageMatchPro v1.4.0
 * 
 * Comprehensive Storybook setup for component documentation and testing
 */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../shared/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../apps/web/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../mortgage-mobile-app/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../docs/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-actions',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-toolbars',
    '@storybook/addon-highlight',
    '@storybook/addon-a11y',
    '@storybook/addon-jest',
    '@storybook/addon-coverage',
    '@storybook/addon-storysource',
    '@storybook/addon-docs',
    'storybook-addon-designs',
    'storybook-addon-mock',
    'storybook-addon-apollo-client',
    '@storybook/addon-postcss'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation'
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  viteFinal: async (config) => {
    // Add any custom Vite configuration here
    return config;
  },
  features: {
    buildStoriesJson: true,
    storyStoreV7: true,
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    // Add any custom webpack configuration here
    return config;
  },
  core: {
    disableTelemetry: true,
  },
  logLevel: 'info',
  managerHead: (head) => `
    ${head}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  `,
  previewHead: (head) => `
    ${head}
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
    </style>
  `,
};

export default config;