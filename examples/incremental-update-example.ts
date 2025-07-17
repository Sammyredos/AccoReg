/**
 * Example: Using the Incremental Update/Merge System
 * This example demonstrates how to use the incremental update system
 * for synchronizing communication settings between different parts of the app.
 */

import {
  // Core merge functions
  mergeEmailConfigs,
  mergeSMSConfigs,
  
  // Incremental update functions
  applyIncrementalEmailUpdate,
  applyIncrementalSMSUpdate,
  
  // Change detection
  detectEmailConfigChanges,
  detectSMSConfigChanges,
  
  // Patch creation
  createEmailConfigPatch,
  createSMSConfigPatch,
  
  // Utilities
  mergeChangeRecords,
  generateChangeSummary,
  validateSettingsSync,
  
  // Types
  EmailConfig,
  SMSConfig,
  SettingItem,
  MergeOptions,
  ChangeRecord
} from '@/lib/communications-mapping'

// Example 1: Merging configurations with conflict resolution
export async function exampleMergeConfigurations() {
  console.log('🔄 Example 1: Merging Configurations')
  
  // Simulated data from settings page
  const settingsEmailConfig: Partial<EmailConfig> = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    fromName: 'AccoReg System',
    fromEmail: 'system@accoreg.com',
    isSecure: true
  }
  
  // Simulated data from communications page (user made changes)
  const communicationsEmailConfig: Partial<EmailConfig> = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '465', // User changed this
    fromName: 'AccoReg Registration', // User changed this
    fromEmail: 'system@accoreg.com',
    isSecure: true,
    replyTo: 'noreply@accoreg.com' // User added this
  }
  
  // Merge with communications priority
  const mergeResult = mergeEmailConfigs(
    settingsEmailConfig,
    communicationsEmailConfig,
    {
      strategy: 'communications-priority',
      conflictResolution: (conflict) => {
        // Custom logic: prefer settings for technical fields
        if (['smtpHost', 'smtpPort'].includes(conflict.field)) {
          console.log(`⚠️ Conflict in ${conflict.field}: keeping settings value`)
          return 'settings'
        }
        // Prefer communications for user-facing fields
        return 'communications'
      }
    }
  )
  
  console.log(`✅ Merge completed:`)
  console.log(`   Applied: ${mergeResult.applied} changes`)
  console.log(`   Skipped: ${mergeResult.skipped} unchanged`)
  console.log(`   Conflicts: ${mergeResult.conflicts.length}`)
  
  mergeResult.conflicts.forEach(conflict => {
    console.log(`   🔀 ${conflict.field}: ${conflict.settingsValue} vs ${conflict.communicationsValue} → ${conflict.resolution}`)
  })
  
  return mergeResult.merged
}

// Example 2: Applying incremental updates
export async function exampleIncrementalUpdate() {
  console.log('\n🔄 Example 2: Incremental Updates')
  
  // Current settings in database
  const currentSettings: SettingItem[] = [
    { id: 'smtpHost', name: 'SMTP Host', value: 'smtp.gmail.com', type: 'text' },
    { id: 'smtpPort', name: 'SMTP Port', value: '587', type: 'number' },
    { id: 'emailFromName', name: 'From Name', value: 'AccoReg', type: 'text' }
  ]
  
  // User made changes in communications page
  const updates: Partial<EmailConfig> = {
    fromName: 'AccoReg Registration System', // Changed
    replyTo: 'noreply@accoreg.com', // New field
    smtpPort: '465' // Changed
  }
  
  // Apply incremental updates
  const updateResult = applyIncrementalEmailUpdate(
    currentSettings,
    updates,
    {
      userId: 'admin-123',
      source: 'communications'
    }
  )
  
  console.log(`✅ Update completed:`)
  console.log(`   Changes: ${updateResult.changes.length}`)
  console.log(`   New settings: ${updateResult.newSettings.length}`)
  
  updateResult.changes.forEach(change => {
    console.log(`   📝 ${change.field}: "${change.oldValue}" → "${change.newValue}"`)
  })
  
  updateResult.newSettings.forEach(setting => {
    console.log(`   ➕ New: ${setting.name} = "${setting.value}"`)
  })
  
  return updateResult.updatedSettings
}

// Example 3: Change detection and patch creation
export async function exampleChangeDetection() {
  console.log('\n🔄 Example 3: Change Detection & Patches')
  
  const oldConfig: Partial<EmailConfig> = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    fromName: 'AccoReg',
    isSecure: true
  }
  
  const newConfig: Partial<EmailConfig> = {
    smtpHost: 'smtp.gmail.com', // Unchanged
    smtpPort: '465', // Changed
    fromName: 'AccoReg Registration', // Changed
    isSecure: true, // Unchanged
    replyTo: 'noreply@accoreg.com' // Added
  }
  
  // Detect changes
  const changes = detectEmailConfigChanges(oldConfig, newConfig)
  
  console.log(`✅ Detected ${changes.length} changes:`)
  changes.forEach(change => {
    if (change.oldValue === undefined) {
      console.log(`   ➕ Added ${change.field}: "${change.newValue}"`)
    } else if (change.newValue === undefined) {
      console.log(`   ➖ Removed ${change.field}: "${change.oldValue}"`)
    } else {
      console.log(`   📝 Changed ${change.field}: "${change.oldValue}" → "${change.newValue}"`)
    }
  })
  
  // Create a patch with only changed fields
  const patch = createEmailConfigPatch(oldConfig, newConfig)
  
  console.log(`✅ Created patch with ${Object.keys(patch).length} fields:`)
  console.log('   Patch:', JSON.stringify(patch, null, 2))
  
  return { changes, patch }
}

// Example 4: Comprehensive sync workflow
export async function exampleSyncWorkflow() {
  console.log('\n🔄 Example 4: Complete Sync Workflow')
  
  // Simulate data from different sources
  const settingsData: SettingItem[] = [
    { id: 'smtpHost', name: 'SMTP Host', value: 'smtp.gmail.com', type: 'text' },
    { id: 'smtpPort', name: 'SMTP Port', value: '587', type: 'number' },
    { id: 'emailFromName', name: 'From Name', value: 'AccoReg', type: 'text' }
  ]
  
  const communicationsData: Partial<EmailConfig> = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '465', // User changed this
    fromName: 'AccoReg Registration', // User changed this
    replyTo: 'noreply@accoreg.com' // User added this
  }
  
  const importedData: Partial<EmailConfig> = {
    smtpHost: 'smtp.outlook.com', // Different provider
    smtpPort: '587',
    fromName: 'AccoReg System',
    isSecure: true
  }
  
  // Step 1: Merge all sources
  console.log('📥 Step 1: Merging multiple sources...')
  
  // First merge settings with communications
  const settingsConfig = settingsData.reduce((config, setting) => {
    if (setting.id === 'emailFromName') config.fromName = setting.value
    if (setting.id === 'smtpHost') config.smtpHost = setting.value
    if (setting.id === 'smtpPort') config.smtpPort = setting.value
    return config
  }, {} as Partial<EmailConfig>)
  
  const firstMerge = mergeEmailConfigs(settingsConfig, communicationsData, {
    strategy: 'communications-priority'
  })
  
  // Then merge with imported data
  const finalMerge = mergeEmailConfigs(firstMerge.merged, importedData, {
    strategy: 'manual',
    conflictResolution: (conflict) => {
      // Ask user or apply business logic
      console.log(`   🤔 Conflict in ${conflict.field}: settings="${conflict.settingsValue}" vs import="${conflict.communicationsValue}"`)
      
      // Example logic: prefer imported data for technical settings
      if (['smtpHost', 'smtpPort'].includes(conflict.field)) {
        console.log(`   ✅ Using imported value for ${conflict.field}`)
        return 'communications' // In this context, communications = imported
      }
      
      // Keep existing for user-facing settings
      console.log(`   ✅ Keeping existing value for ${conflict.field}`)
      return 'settings'
    }
  })
  
  // Step 2: Generate change summary
  console.log('\n📊 Step 2: Change summary...')
  const allChanges = mergeChangeRecords(firstMerge.changes, finalMerge.changes)
  const summary = generateChangeSummary(allChanges)
  
  console.log(`✅ ${summary.summary}`)
  console.log('   By field:', summary.byField)
  
  // Step 3: Apply updates back to settings
  console.log('\n💾 Step 3: Applying updates...')
  const updateResult = applyIncrementalEmailUpdate(
    settingsData,
    finalMerge.merged,
    { source: 'import', userId: 'system' }
  )
  
  console.log(`✅ Applied ${updateResult.changes.length} changes to settings`)
  
  // Step 4: Validate sync
  console.log('\n🔍 Step 4: Validating sync...')
  // Note: This is a simplified validation for the example
  console.log('✅ Sync validation would go here')
  
  return {
    finalConfig: finalMerge.merged,
    changes: allChanges,
    summary,
    updatedSettings: updateResult.updatedSettings
  }
}

// Example 5: Real-time sync monitoring
export function exampleRealTimeSync() {
  console.log('\n🔄 Example 5: Real-time Sync Monitoring')
  
  // Simulate periodic sync checking
  const syncMonitor = setInterval(() => {
    // In a real app, you'd fetch current data from both sources
    console.log('🔍 Checking sync status...')
    
    // Simulate validation
    const isInSync = Math.random() > 0.3 // 70% chance of being in sync
    
    if (!isInSync) {
      console.log('⚠️ Settings out of sync - triggering reconciliation')
      // Trigger sync process
      // exampleSyncWorkflow()
    } else {
      console.log('✅ Settings in sync')
    }
  }, 10000) // Check every 10 seconds
  
  // Clean up after 1 minute
  setTimeout(() => {
    clearInterval(syncMonitor)
    console.log('🛑 Sync monitoring stopped')
  }, 60000)
  
  return syncMonitor
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Running Incremental Update/Merge Examples\n')
  
  try {
    await exampleMergeConfigurations()
    await exampleIncrementalUpdate()
    await exampleChangeDetection()
    await exampleSyncWorkflow()
    exampleRealTimeSync()
    
    console.log('\n🎉 All examples completed successfully!')
  } catch (error) {
    console.error('❌ Example failed:', error)
  }
}

// Export for use in other files
export default {
  exampleMergeConfigurations,
  exampleIncrementalUpdate,
  exampleChangeDetection,
  exampleSyncWorkflow,
  exampleRealTimeSync,
  runAllExamples
}
