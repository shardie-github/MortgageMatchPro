#!/usr/bin/env node

/**
 * Feature Toggle Script
 * v1.2.0 - Toggle feature flags from command line
 */

const { featureFlagsService } = require('../lib/features/FeatureFlags')

async function toggleFeature(featureId) {
  try {
    const status = featureFlagsService.getFeatureStatus(featureId)
    
    if (!status.exists) {
      console.error(`❌ Feature flag '${featureId}' not found`)
      console.log('Available features:')
      const allFlags = featureFlagsService.getAllFeatureFlags()
      allFlags.forEach(flag => {
        console.log(`  - ${flag.id}: ${flag.name} (${flag.enabled ? 'enabled' : 'disabled'})`)
      })
      process.exit(1)
    }

    const newStatus = !status.enabled
    await featureFlagsService.updateFeatureFlag(featureId, { enabled: newStatus })

    console.log(`✅ Feature '${featureId}' ${newStatus ? 'enabled' : 'disabled'}`)
    console.log(`   Name: ${status.metadata?.name || 'Unknown'}`)
    console.log(`   Category: ${status.metadata?.category || 'Unknown'}`)
    console.log(`   Priority: ${status.metadata?.priority || 'Unknown'}`)
    console.log(`   Rollout: ${status.rolloutPercentage}%`)

  } catch (error) {
    console.error('❌ Error toggling feature:', error.message)
    process.exit(1)
  }
}

// Get feature ID from command line arguments
const featureId = process.argv[2]

if (!featureId) {
  console.log('🔧 Feature Toggle Script')
  console.log('')
  console.log('Usage:')
  console.log('  npm run toggle:<feature-name>')
  console.log('  node scripts/toggle-feature.js <feature-id>')
  console.log('')
  console.log('Available features:')
  const allFlags = featureFlagsService.getAllFeatureFlags()
  allFlags.forEach(flag => {
    console.log(`  - ${flag.id}: ${flag.name} (${flag.enabled ? 'enabled' : 'disabled'})`)
  })
  process.exit(0)
}

toggleFeature(featureId)