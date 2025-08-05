/**
 * Registration Events - Real-time updates for new registrations
 */

// Trigger registration update event
export function triggerRegistrationUpdate(action = 'new', registration = null) {
  // Trigger custom event for same-tab updates
  const event = new CustomEvent('registrationUpdated', {
    detail: {
      timestamp: Date.now(),
      action,
      registration
    }
  })
  window.dispatchEvent(event)

  // Set localStorage flag for cross-tab updates
  if (action === 'edit' && registration) {
    localStorage.setItem('registration_edit_data', JSON.stringify(registration))
  } else {
    localStorage.setItem('registration_updated', Date.now().toString())
  }

  console.log(`🔄 Registration ${action} event triggered`)
}

// Listen for registration updates
export function onRegistrationUpdate(callback: () => void) {
  const handleEvent = () => {
    console.log('📧 Registration update detected, executing callback...')
    callback()
  }
  
  // Listen for custom events
  window.addEventListener('registrationUpdated', handleEvent)
  
  // Listen for storage events (cross-tab)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'registration_updated') {
      handleEvent()
      // Clear the flag
      localStorage.removeItem('registration_updated')
    }
  }
  
  window.addEventListener('storage', handleStorageChange)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('registrationUpdated', handleEvent)
    window.removeEventListener('storage', handleStorageChange)
  }
}

// Check if we should trigger an update after registration submission or edit
export function checkAndTriggerRegistrationUpdate(response: Response) {
  if (response.headers.get('X-Registration-Updated') === 'true') {
    const action = response.headers.get('X-Registration-Action') || 'new'

    // Get registration data from headers
    let registrationData = null
    if (action === 'edit') {
      const editData = response.headers.get('X-Updated-Registration-Data')
      if (editData) {
        try {
          registrationData = JSON.parse(editData)
        } catch (error) {
          console.error('Error parsing updated registration data:', error)
        }
      }
    } else {
      const newData = response.headers.get('X-New-Registration-Data')
      if (newData) {
        try {
          registrationData = JSON.parse(newData)
        } catch (error) {
          console.error('Error parsing new registration data:', error)
        }
      }
    }

    // Store the registration data for the feed
    if (registrationData) {
      console.log('📧 Storing registration data for real-time updates:', registrationData.fullName, 'action:', action)

      if (action === 'edit') {
        localStorage.setItem('registration_edit_data', JSON.stringify(registrationData))
      } else {
        localStorage.setItem('new_registration_data', JSON.stringify(registrationData))
      }

      // Also dispatch immediate event for same-tab updates
      const event = new CustomEvent('registrationUpdated', {
        detail: {
          action,
          registration: registrationData,
          timestamp: Date.now()
        }
      })
      window.dispatchEvent(event)
      console.log('📧 Dispatched registrationUpdated event:', action, registrationData.fullName)
    }

    // Delay slightly to ensure database is updated
    setTimeout(() => {
      triggerRegistrationUpdate(action, registrationData)
    }, 1000)
  }
}

// Get and clear new registration data
export function getNewRegistrationData() {
  const data = localStorage.getItem('new_registration_data')
  if (data) {
    localStorage.removeItem('new_registration_data')
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('Error parsing new registration data:', error)
    }
  }
  return null
}
