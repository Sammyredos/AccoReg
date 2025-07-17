# 🔄 Incremental Update/Merge System Guide

## 📋 Overview

The incremental update/merge system allows you to efficiently synchronize communication settings between different parts of your application without full data replacement. This system provides conflict resolution, change tracking, and selective updates.

## 🎯 Key Features

- ✅ **Incremental Updates**: Only update changed fields
- ✅ **Conflict Resolution**: Handle conflicts between different data sources
- ✅ **Change Tracking**: Track what changed, when, and by whom
- ✅ **Merge Strategies**: Multiple strategies for handling conflicts
- ✅ **Patch Creation**: Generate minimal update patches
- ✅ **Validation**: Ensure data consistency across systems

## 🔧 Core Functions

### 1. Merge Configurations

```typescript
import { 
  mergeEmailConfigs, 
  mergeSMSConfigs, 
  MergeOptions 
} from '@/lib/communications-mapping'

// Merge email configurations with conflict resolution
const emailResult = mergeEmailConfigs(
  settingsEmailConfig,
  communicationsEmailConfig,
  {
    strategy: 'communications-priority',
    conflictResolution: (conflict) => {
      // Custom conflict resolution logic
      if (conflict.field === 'smtpHost') {
        return 'settings' // Prefer settings for SMTP host
      }
      return 'communications' // Default to communications
    }
  }
)

console.log(`Applied ${emailResult.applied} changes, ${emailResult.conflicts.length} conflicts`)
```

### 2. Apply Incremental Updates

```typescript
import { 
  applyIncrementalEmailUpdate,
  applyIncrementalSMSUpdate 
} from '@/lib/communications-mapping'

// Apply partial email updates
const emailUpdates = {
  smtpHost: 'new-smtp.example.com',
  smtpPort: '587',
  fromName: 'Updated App Name'
}

const updateResult = applyIncrementalEmailUpdate(
  currentEmailSettings,
  emailUpdates,
  { 
    userId: 'admin-123',
    source: 'communications' 
  }
)

console.log(`Updated ${updateResult.changes.length} settings`)
console.log(`Created ${updateResult.newSettings.length} new settings`)
```

### 3. Detect Changes

```typescript
import { 
  detectEmailConfigChanges,
  detectSMSConfigChanges 
} from '@/lib/communications-mapping'

// Detect what changed between configurations
const changes = detectEmailConfigChanges(oldEmailConfig, newEmailConfig)

changes.forEach(change => {
  console.log(`${change.field}: ${change.oldValue} → ${change.newValue}`)
})
```

### 4. Create Patches

```typescript
import { 
  createEmailConfigPatch,
  createSMSConfigPatch 
} from '@/lib/communications-mapping'

// Create a minimal patch with only changed fields
const patch = createEmailConfigPatch(baseConfig, updatedConfig)

// Send only the patch to the API instead of the full config
await fetch('/api/communications/email', {
  method: 'PATCH',
  body: JSON.stringify(patch)
})
```

## 🔄 Merge Strategies

### 1. Communications Priority (Default)
```typescript
const options: MergeOptions = {
  strategy: 'communications-priority'
}
// Communications page values take precedence
```

### 2. Settings Priority
```typescript
const options: MergeOptions = {
  strategy: 'settings-priority'
}
// Settings page values take precedence
```

### 3. Manual Resolution
```typescript
const options: MergeOptions = {
  strategy: 'manual',
  conflictResolution: (conflict) => {
    // Custom logic for each conflict
    switch (conflict.field) {
      case 'smtpHost':
        return 'settings' // Always prefer settings for SMTP host
      case 'fromName':
        return 'communications' // Prefer communications for display name
      default:
        return 'communications'
    }
  }
}
```

## 📊 Change Tracking

### Change Record Structure
```typescript
interface ChangeRecord {
  field: string           // Field that changed
  oldValue: any          // Previous value
  newValue: any          // New value
  timestamp: number      // When the change occurred
  source: 'settings' | 'communications' | 'api' | 'import'
  userId?: string        // Who made the change
}
```

### Working with Changes
```typescript
import { 
  mergeChangeRecords,
  generateChangeSummary 
} from '@/lib/communications-mapping'

// Merge multiple change arrays
const allChanges = mergeChangeRecords(
  emailChanges,
  smsChanges,
  importChanges
)

// Generate summary for logging
const summary = generateChangeSummary(allChanges)
console.log(summary.summary) // "15 changes: 8 from communications, 5 from settings, 2 from import"
```

## 🛡️ Validation & Sync

```typescript
import { validateSettingsSync } from '@/lib/communications-mapping'

// Validate that settings and communications are in sync
const validation = validateSettingsSync(
  emailSettings,
  emailConfig,
  smsSettings,
  smsConfig
)

if (!validation.isValid) {
  console.log('Email mismatches:', validation.emailMismatches)
  console.log('SMS mismatches:', validation.smsMismatches)
}
```

## 🎯 Common Use Cases

### 1. Sync Settings to Communications
```typescript
// When settings page is updated, sync to communications
const settingsConfig = settingsToEmailConfig(emailSettings)
const mergeResult = mergeEmailConfigs(
  settingsConfig,
  currentCommunicationsConfig,
  { strategy: 'settings-priority' }
)

// Apply the merged config to communications
setCommunicationsConfig(mergeResult.merged)
```

### 2. Sync Communications to Settings
```typescript
// When communications page is updated, sync to settings
const updateResult = applyIncrementalEmailUpdate(
  currentSettings,
  updatedCommunicationsConfig,
  { source: 'communications', userId: currentUser.id }
)

// Save updated settings to database
await saveSettings(updateResult.updatedSettings)
```

### 3. Import Configuration
```typescript
// When importing configuration from backup
const importResult = mergeEmailConfigs(
  currentConfig,
  importedConfig,
  {
    strategy: 'manual',
    conflictResolution: (conflict) => {
      // Ask user to resolve conflicts
      return await askUserForResolution(conflict)
    }
  }
)

// Log what was imported
console.log(`Imported ${importResult.applied} settings`)
console.log(`Resolved ${importResult.conflicts.length} conflicts`)
```

## 🔍 Debugging & Monitoring

### Enable Change Logging
```typescript
// Log all changes for debugging
const changes = detectEmailConfigChanges(oldConfig, newConfig)
changes.forEach(change => {
  console.log(`[${change.source}] ${change.field}: ${change.oldValue} → ${change.newValue}`)
})
```

### Monitor Sync Status
```typescript
// Regularly check sync status
setInterval(() => {
  const validation = validateSettingsSync(emailSettings, emailConfig, smsSettings, smsConfig)
  if (!validation.isValid) {
    console.warn('Settings out of sync:', validation)
  }
}, 30000) // Check every 30 seconds
```

## 🚀 Best Practices

1. **Use Patches for API Calls**: Send only changed fields to reduce bandwidth
2. **Track Changes**: Always include userId and source for audit trails
3. **Validate Regularly**: Check sync status to catch drift early
4. **Handle Conflicts**: Define clear conflict resolution strategies
5. **Log Changes**: Keep detailed logs for debugging and compliance

## 🎉 Benefits

- ✅ **Efficient**: Only update what actually changed
- ✅ **Reliable**: Conflict resolution prevents data loss
- ✅ **Auditable**: Full change tracking for compliance
- ✅ **Flexible**: Multiple merge strategies for different scenarios
- ✅ **Consistent**: Ensures data stays in sync across systems

The incremental update/merge system provides a robust foundation for managing configuration changes across your application while maintaining data integrity and providing full audit trails.
