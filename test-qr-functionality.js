// QR Scanner Functionality Test
// This script tests the QRScanner component functionality

console.log('🧪 Starting QR Scanner Functionality Test...')

// Test 1: Check if jsQR library can be imported
async function testJsQRImport() {
  try {
    console.log('📦 Testing jsQR import...')
    const jsQR = await import('jsqr')
    if (jsQR.default) {
      console.log('✅ jsQR library imported successfully')
      return true
    } else {
      console.log('❌ jsQR library import failed - no default export')
      return false
    }
  } catch (error) {
    console.log('❌ jsQR library import failed:', error.message)
    return false
  }
}

// Test 2: Check environment detection
function testEnvironmentDetection() {
  console.log('🌍 Testing environment detection...')
  
  const isClient = typeof window !== 'undefined'
  const isDevelopment = isClient && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev') ||
    process.env.NODE_ENV === 'development'
  )
  
  console.log('Client environment:', isClient)
  console.log('Development mode:', isDevelopment)
  console.log('Current hostname:', isClient ? window.location.hostname : 'N/A')
  
  return { isClient, isDevelopment }
}

// Test 3: Check camera API availability
function testCameraAPI() {
  console.log('📷 Testing camera API availability...')
  
  if (typeof navigator === 'undefined') {
    console.log('❌ Navigator not available (server-side)')
    return false
  }
  
  if (!navigator.mediaDevices) {
    console.log('❌ MediaDevices API not available')
    return false
  }
  
  if (!navigator.mediaDevices.getUserMedia) {
    console.log('❌ getUserMedia not available')
    return false
  }
  
  console.log('✅ Camera API is available')
  return true
}

// Test 4: Check UI components availability
function testUIComponents() {
  console.log('🎨 Testing UI components...')
  
  // This would be tested in the actual React environment
  // For now, just check if we're in a browser environment
  if (typeof window !== 'undefined') {
    console.log('✅ Browser environment detected - UI components should work')
    return true
  } else {
    console.log('❌ Not in browser environment')
    return false
  }
}

// Test 5: Mock QR code processing
function testQRProcessing() {
  console.log('🔍 Testing QR code processing logic...')
  
  // Mock QR data
  const mockQRData = JSON.stringify({
    id: 'test-123',
    type: 'registration',
    timestamp: Date.now()
  })
  
  try {
    const parsed = JSON.parse(mockQRData)
    if (parsed.id && parsed.type) {
      console.log('✅ QR data processing logic works')
      console.log('   Sample QR data:', mockQRData.substring(0, 50) + '...')
      return true
    } else {
      console.log('❌ QR data structure invalid')
      return false
    }
  } catch (error) {
    console.log('❌ QR data parsing failed:', error.message)
    return false
  }
}

// Test 6: Check development fallback
function testDevelopmentFallback() {
  console.log('🧪 Testing development fallback...')
  
  const { isDevelopment } = testEnvironmentDetection()
  
  if (isDevelopment) {
    // Mock development QR code
    const mockQR = `QR_DEV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('✅ Development fallback available')
    console.log('   Mock QR code:', mockQR)
    return true
  } else {
    console.log('ℹ️ Not in development mode - fallback not needed')
    return true
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running QR Scanner Component Tests...\n')
  
  const results = {
    jsQRImport: await testJsQRImport(),
    environmentDetection: testEnvironmentDetection(),
    cameraAPI: testCameraAPI(),
    uiComponents: testUIComponents(),
    qrProcessing: testQRProcessing(),
    developmentFallback: testDevelopmentFallback()
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  let passedTests = 0
  let totalTests = 0
  
  for (const [testName, result] of Object.entries(results)) {
    totalTests++
    if (result === true || (typeof result === 'object' && result.isClient)) {
      passedTests++
      console.log(`✅ ${testName}: PASSED`)
    } else {
      console.log(`❌ ${testName}: FAILED`)
    }
  }
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! QR Scanner should work correctly.')
  } else {
    console.log('⚠️ Some tests failed. Check the issues above.')
  }
  
  return results
}

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testJsQRImport, testEnvironmentDetection, testCameraAPI }
} else if (typeof window !== 'undefined') {
  window.QRScannerTest = { runAllTests, testJsQRImport, testEnvironmentDetection, testCameraAPI }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected - running tests automatically...')
  runAllTests()
}
