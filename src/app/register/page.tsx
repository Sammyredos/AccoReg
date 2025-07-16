'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useReactiveSystemName } from '@/components/ui/reactive-system-name'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RegistrationFormSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ArrowRight, Check, User, Calendar, Users, Shield, AlertCircle, Clock, Baby } from 'lucide-react'

// Types
interface ValidationError {
  field: string
  message: string
}

interface FormData {
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  branch: string
  phoneNumber: string
  emailAddress: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  parentGuardianName: string
  parentGuardianPhone: string
  parentGuardianEmail: string

  useParentAsEmergencyContact: boolean
}

// Validation functions
const validateStep1 = (data: Partial<FormData>, minimumAge: number = 13, skipAgeCheck: boolean = false): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.fullName?.trim()) {
    errors.push({ field: 'fullName', message: 'Full name is required' })
  } else if (data.fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' })
  }

  if (!data.dateOfBirth) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' })
  } else {
    const birthDate = new Date(data.dateOfBirth)
    if (isNaN(birthDate.getTime())) {
      errors.push({ field: 'dateOfBirth', message: 'Please enter a valid date' })
    } else if (!skipAgeCheck) {
      const age = calculateAge(data.dateOfBirth)
      if (age < minimumAge) {
        errors.push({ field: 'dateOfBirth', message: `You must be at least ${minimumAge} years old to register` })
      }
    }
  }

  if (!data.gender) {
    errors.push({ field: 'gender', message: 'Gender is required' })
  }

  if (!data.address?.trim()) {
    errors.push({ field: 'address', message: 'Address is required' })
  }

  // Branch validation - make it optional for backward compatibility initially
  // TODO: Make this required after migration is confirmed in production
  if (data.branch && data.branch.trim() === '') {
    errors.push({ field: 'branch', message: 'Please select a valid branch' })
  }

  if (!data.phoneNumber?.trim()) {
    errors.push({ field: 'phoneNumber', message: 'Phone number is required' })
  }

  if (!data.emailAddress?.trim()) {
    errors.push({ field: 'emailAddress', message: 'Email address is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailAddress)) {
    errors.push({ field: 'emailAddress', message: 'Please enter a valid email address' })
  }

  return errors
}

const validateStep2 = (data: Partial<FormData>): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.parentGuardianName?.trim()) {
    errors.push({ field: 'parentGuardianName', message: 'Parent/Guardian name is required' })
  }

  if (!data.parentGuardianPhone?.trim()) {
    errors.push({ field: 'parentGuardianPhone', message: 'Parent/Guardian phone is required' })
  }

  return errors
}

const validateStep3 = (data: Partial<FormData>): ValidationError[] => {
  const errors: ValidationError[] = []

  // If not using parent as emergency contact, validate emergency contact fields
  if (!data.useParentAsEmergencyContact) {
    if (!data.emergencyContactName?.trim()) {
      errors.push({ field: 'emergencyContactName', message: 'Emergency contact name is required' })
    }

    if (!data.emergencyContactPhone?.trim()) {
      errors.push({ field: 'emergencyContactPhone', message: 'Emergency contact phone is required' })
    }
  }

  return errors
}

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

const checkDuplicateRegistration = async (data: Partial<FormData>) => {
  try {
    const response = await fetch('/api/registrations/check-duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: data.fullName,
        emailAddress: data.emailAddress,
        phoneNumber: data.phoneNumber,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to check for duplicates')
    }

    return await response.json()
  } catch (error) {
    console.error('Duplicate check error:', error)
    throw error
  }
}

// Initial form data
const getInitialFormData = (): FormData => ({
  fullName: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  branch: '',
  phoneNumber: '',
  emailAddress: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  parentGuardianName: '',
  parentGuardianPhone: '',
  parentGuardianEmail: '',

  useParentAsEmergencyContact: false
})

// Form component that handles search params
function RegistrationForm() {
  const systemName = useReactiveSystemName()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(getInitialFormData)

  const [errors, setErrors] = useState<ValidationError[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [stepTransitioning, setStepTransitioning] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Submitting Registration...')
  const [registrationSettings, setRegistrationSettings] = useState({
    formClosureDate: '',
    minimumAge: 13,
    isFormClosed: false
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [showAgeModal, setShowAgeModal] = useState(false)
  const [userAge, setUserAge] = useState<number | null>(null)

  const totalSteps = 3

  // Handle form reset when "Register Another Person" is clicked
  useEffect(() => {
    const shouldReset = searchParams.get('reset')
    if (shouldReset === 'true') {
      // Reset all form state
      setFormData(getInitialFormData())
      setCurrentStep(1)
      setErrors([])
      setLoading(false)
      setSuccess(false)
      setStepTransitioning(false)

      // Clear the reset parameter from URL without page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('reset')
      window.history.replaceState({}, '', url.toString())

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [searchParams])

  // Load registration settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/registration/settings')
        if (response.ok) {
          const settings = await response.json()
          setRegistrationSettings(settings)
        }
      } catch (error) {
        console.error('Error loading registration settings:', error)
      } finally {
        setSettingsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const getFieldError = (fieldName: string) => {
    const error = errors.find(err => err.field === fieldName)
    return error?.message
  }

  // Check age and show modal if below minimum age
  const checkAgeAndShowModal = (dateOfBirth: string) => {
    if (!dateOfBirth) return false

    const age = calculateAge(dateOfBirth)
    if (age < registrationSettings.minimumAge) {
      setUserAge(age)
      setShowAgeModal(true)
      return true
    }
    return false
  }

  // Manual reset function
  const resetForm = () => {
    setFormData(getInitialFormData())
    setCurrentStep(1)
    setErrors([])
    setLoading(false)
    setSuccess(false)
    setStepTransitioning(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getStep1Progress = () => {
    const requiredFields = ['fullName', 'dateOfBirth', 'gender', 'address', 'phoneNumber', 'emailAddress']
    const completedFields = requiredFields.filter(field => formData[field as keyof FormData]?.toString().trim())
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  const getStep2Progress = () => {
    const requiredFields = ['parentGuardianName', 'parentGuardianPhone']
    const completedFields = requiredFields.filter(field => formData[field as keyof FormData]?.toString().trim())
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  const getStep3Progress = () => {
    if (formData.useParentAsEmergencyContact) {
      // If using parent as emergency contact, consider it 100% complete
      return 100
    } else {
      const requiredFields = ['emergencyContactName', 'emergencyContactPhone']
      const completedFields = requiredFields.filter(field => formData[field as keyof FormData]?.toString().trim())
      return Math.round((completedFields.length / requiredFields.length) * 100)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear field-specific errors when user starts typing
    if (errors.some(err => err.field === name)) {
      setErrors(prev => prev.filter(err => err.field !== name))
    }
  }

  // Handler for the "Use parent as emergency contact" checkbox
  const handleUseParentAsEmergencyContact = (checked: boolean) => {
    if (checked) {
      // Copy parent information to emergency contact fields
      setFormData(prev => ({
        ...prev,
        useParentAsEmergencyContact: true,
        emergencyContactName: prev.parentGuardianName,
        emergencyContactPhone: prev.parentGuardianPhone,
        emergencyContactRelationship: 'Parent'
      }))
    } else {
      // Clear emergency contact fields when unchecked
      setFormData(prev => ({
        ...prev,
        useParentAsEmergencyContact: false,
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: ''
      }))
    }

    // Clear any emergency contact related errors
    setErrors(prev => prev.filter(error =>
      !['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship'].includes(error.field)
    ))
  }

  const scrollToFirstError = (errors: ValidationError[]) => {
    if (errors.length === 0) return

    // Get the first error field
    const firstErrorField = errors[0].field
    const element = document.getElementById(firstErrorField)

    if (element) {
      // Calculate offset to account for fixed header
      const headerOffset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      // Smooth scroll to the field
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      // Focus the field after scrolling
      setTimeout(() => {
        element.focus()
        // Add a subtle highlight animation to draw attention
        element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)'
        element.style.transform = 'scale(1.02)'

        setTimeout(() => {
          element.style.boxShadow = ''
          element.style.transform = ''
        }, 1500)
      }, 300)
    }
  }

  const handleNext = () => {
    let stepErrors: ValidationError[] = []

    if (currentStep === 1) {
      // First check age without validation errors
      if (checkAgeAndShowModal(formData.dateOfBirth)) {
        return // Stop here if age modal is shown
      }

      // Then validate normally (skipping age check since we handled it above)
      stepErrors = validateStep1(formData, registrationSettings.minimumAge, true)
    } else if (currentStep === 2) {
      stepErrors = validateStep2(formData)
    }

    setErrors(stepErrors)

    if (stepErrors.length === 0) {
      setStepTransitioning(true)

      // Add a small delay for smooth transition
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setStepTransitioning(false)
        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 150)
    } else {
      // Scroll to first error field
      scrollToFirstError(stepErrors)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (currentStep < totalSteps) {
        handleNext()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allErrors = [...validateStep1(formData, registrationSettings.minimumAge), ...validateStep2(formData), ...validateStep3(formData)]
    setErrors(allErrors)

    if (allErrors.length > 0) {
      // Find which step has the first error and navigate to it
      const firstError = allErrors[0]
      const step1Fields = ['fullName', 'dateOfBirth', 'gender', 'address', 'phoneNumber', 'emailAddress']
      const step2Fields = ['parentGuardianName', 'parentGuardianPhone']

      let errorStep = 3 // Default to step 3
      if (step1Fields.includes(firstError.field)) {
        errorStep = 1
      } else if (step2Fields.includes(firstError.field)) {
        errorStep = 2
      }

      // Navigate to the step with the error
      if (currentStep !== errorStep) {
        setCurrentStep(errorStep)
        // Wait for step transition then scroll to error
        setTimeout(() => {
          scrollToFirstError(allErrors.filter(err => {
            if (errorStep === 1) return step1Fields.includes(err.field)
            if (errorStep === 2) return step2Fields.includes(err.field)
            return !step1Fields.includes(err.field) && !step2Fields.includes(err.field)
          }))
        }, 200)
      } else {
        // Already on correct step, scroll immediately
        scrollToFirstError(allErrors)
      }
      return
    }

    setLoading(true)
    setLoadingMessage('Checking for duplicate registrations...')

    try {
      // Check for duplicates
      const duplicateCheck = await checkDuplicateRegistration(formData)

      // Block registration if ANY duplicate or similar registration is found
      if (duplicateCheck.isDuplicate || (duplicateCheck.hasSimilarNames && duplicateCheck.similarRegistrations?.length > 0)) {
        // Create field-specific errors based on which fields are duplicated or similar
        const duplicateErrors: ValidationError[] = []

        if (duplicateCheck.isDuplicate) {
          if (duplicateCheck.duplicateFields.includes('name')) {
            duplicateErrors.push({ field: 'fullName', message: 'This name already exists in our database' })
          }
          if (duplicateCheck.duplicateFields.includes('email')) {
            duplicateErrors.push({ field: 'emailAddress', message: 'This email address already exists in our database' })
          }
          if (duplicateCheck.duplicateFields.includes('phone')) {
            duplicateErrors.push({ field: 'phoneNumber', message: 'This phone number already exists in our database' })
          }
        } else if (duplicateCheck.hasSimilarNames) {
          // For similar names, highlight the name field
          duplicateErrors.push({ field: 'fullName', message: 'A similar name already exists in our database add Initials' })
        }

        setErrors(duplicateErrors)

        // Navigate to step 1 where the duplicate fields are
        if (currentStep !== 1) {
          setCurrentStep(1)
          setTimeout(() => {
            scrollToFirstError(duplicateErrors)
          }, 200)
        } else {
          scrollToFirstError(duplicateErrors)
        }

        setLoading(false)
        return
      }

      // Submit registration
      setLoadingMessage('Submitting registration...')
      const response = await fetch('/api/registrations/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Check if it's a field-specific error from the server
        if (errorData.field) {
          const serverError: ValidationError = {
            field: errorData.field,
            message: errorData.message || 'Invalid field value'
          }
          setErrors([serverError])
          scrollToFirstError([serverError])
          setLoading(false)
          return
        }

        throw new Error(errorData.message || 'Registration failed')
      }

      // Registration successful - show success immediately
      setLoadingMessage('Registration completed successfully!')
      setSuccess(true)
    } catch (error) {
      console.error('Registration error:', error)
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')

      // Scroll to error message
      setTimeout(() => {
        const errorElement = document.querySelector('[data-error-message]')
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  // Show skeleton loading while settings are being loaded
  if (settingsLoading) {
    return <RegistrationFormSkeleton />
  }

  // Show form closed message if registration is closed
  if (registrationSettings.isFormClosed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          <Card className="text-center bg-white shadow-xl border-0">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto h-20 w-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Calendar className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-apercu-bold text-gray-900 mb-4">
                Registration Closed
              </CardTitle>
              <CardDescription className="text-base font-apercu-regular text-gray-600 mb-6 leading-relaxed">
                The registration period for {systemName} has ended.
                {registrationSettings.formClosureDate && (
                  <span className="block mt-2">
                    Registration closed on {new Date(registrationSettings.formClosureDate).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/">
                    Return to Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }



  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          <Card className="text-center bg-white shadow-xl border-0">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Check className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-apercu-bold text-gray-900 mb-4 px-2">
                Registration Complete!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base font-apercu-regular text-gray-600 mb-6 leading-relaxed px-2">
                Welcome to {systemName}! Your registration has been successfully completed.
              </CardDescription>

              {/* QR Code Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-apercu-bold text-blue-900 mb-2">Check Your Email</h3>
                <p className="text-sm font-apercu-regular text-blue-700">
                A confirmation email with your unique QR code has been sent to your inbox. You’ll need this code to complete your check-in process
                </p>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/">
                    Return to Home
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register?reset=true">
                    Register Another Person
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Age Validation Modal */}
        {showAgeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-apercu-bold text-white mb-1">
                        Age Requirement Not Met
                      </h3>
                      <p className="text-orange-100 font-apercu-regular text-sm">
                        You're too young for this registration form
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
                      <Baby className="w-8 h-8 text-orange-600" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-apercu-bold text-gray-900 text-lg">
                        Children/Teen Registration Required
                      </h4>
                      <p className="text-gray-600 font-apercu-regular text-sm leading-relaxed">
                        At {userAge} years old, you need to use our specialized children registration form.
                        This form is designed for participants under {registrationSettings.minimumAge} years old.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <h5 className="font-apercu-bold text-blue-800 text-sm mb-1">
                            What's Different?
                          </h5>
                          <ul className="text-blue-700 font-apercu-regular text-xs space-y-1">
                            <li>• Simplified form designed for younger participants</li>
                            <li>• Parent/Guardian information collection</li>
                            <li>• Information collection only</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => setShowAgeModal(false)}
                      variant="outline"
                      className="flex-1 font-apercu-medium py-3 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: formData.fullName || '',
                          dob: formData.dateOfBirth || '',
                          gender: formData.gender || '',
                          address: formData.address || '',
                          phone: formData.phoneNumber || '',
                          email: formData.emailAddress || ''
                        })
                        router.push(`/register/children?${params.toString()}`)
                      }}
                      className="flex-1 font-apercu-medium py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                      <Baby className="w-4 h-4 mr-2" />
                       Children Form
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-6 font-apercu-medium">
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl mb-3 sm:mb-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-apercu-bold text-gray-900 mb-2 px-2">
               {systemName} Registration Form
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-apercu-regular px-2 leading-relaxed">
              Register for Our Upcoming Youth Revival - Linger no Longer 6.0
            </p>
          </div>
        </div>

        {/* Enhanced Progress Indicator */}
        <div className="mb-8 sm:mb-10">
          <div className="relative">
            {/* Progress Bar Background */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 rounded-full"></div>

            {/* Active Progress Bar */}
            <div className={`absolute top-4 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-in-out ${
              currentStep >= 2 ? 'w-1/2' : 'w-0'
            } ${currentStep >= 3 ? 'w-full' : ''}`}></div>

            {/* Step Indicators */}
            <div className="relative flex justify-between">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-apercu-bold transition-all duration-300 ${
                  currentStep >= 1
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}>
                  {currentStep > 1 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    '1'
                  )}
                  {currentStep === 1 && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-apercu-bold transition-colors duration-300 ${
                    currentStep >= 1 ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    Personal Info
                  </div>
                  <div className="text-xs text-gray-500 font-apercu-regular mt-1">
                    Basic details
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-apercu-bold transition-all duration-300 ${
                  currentStep >= 2
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}>
                  {currentStep > 2 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    '2'
                  )}
                  {currentStep === 2 && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-apercu-bold transition-colors duration-300 ${
                    currentStep >= 2 ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    Parent Info
                  </div>
                  <div className="text-xs text-gray-500 font-apercu-regular mt-1">
                    Guardian details
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-apercu-bold transition-all duration-300 ${
                  currentStep >= 3
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}>
                  3
                  {currentStep === 3 && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-apercu-bold transition-colors duration-300 ${
                    currentStep >= 3 ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    Emergency
                  </div>
                  <div className="text-xs text-gray-500 font-apercu-regular mt-1">
                    Contact info
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step Counter */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
                <span className="text-sm font-apercu-medium text-gray-700">
                  Step {currentStep} of 3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white shadow-lg border-0 overflow-hidden">
          {loading ? (
            <CardContent className="space-y-6 p-6 sm:p-8">
              {/* Loading Header */}
              <div className="text-center pb-4 sm:pb-6 border-b border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-apercu-bold text-gray-900 mb-2 px-2">
                  Processing Registration
                </CardTitle>
                <CardDescription className="text-sm sm:text-base font-apercu-regular text-gray-600 px-2">
                  {loadingMessage}
                </CardDescription>
              </div>

              {/* Simple Loading Indicator */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600 font-apercu-regular">Please wait...</p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className={`transition-opacity duration-150 ${stepTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <CardContent className="space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Step Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-apercu-bold text-gray-900 mb-2">
                    Personal Information
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 font-apercu-regular">
                    Please provide your basic information to get started
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-apercu-medium">
                      {getStep1Progress()}% Complete
                    </div>
                  </div>
                </div>

                {/* Error Summary */}
                {errors.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg animate-pulse" id="error-summary">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-apercu-medium text-red-800 mb-1">
                          Please fix the following {errors.length === 1 ? 'error' : 'errors'}:
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {errors.map((error, index) => (
                            <li key={index} className="flex items-center cursor-pointer hover:text-red-800"
                                onClick={() => {
                                  const element = document.getElementById(error.field)
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    element.focus()
                                  }
                                }}>
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {error.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100 mb-6">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mr-3 shadow-md">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-apercu-bold text-gray-900">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-sm font-apercu-medium text-gray-700">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="fullName"
                        id="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('fullName')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter your full legal name"
                      />
                      {formData.fullName && !getFieldError('fullName') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('fullName') && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 font-apercu-medium flex items-center">
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {getFieldError('fullName')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Gender Field */}
                  <div className="space-y-2">
                    <label htmlFor="gender" className="block text-sm font-apercu-medium text-gray-700">
                      Gender *
                    </label>
                    <div className="relative">
                      <select
                        name="gender"
                        id="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('gender')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {formData.gender && !getFieldError('gender') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('gender') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('gender')}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth Field */}
                  <div className="space-y-2 lg:col-span-2">
                    <label className="block text-sm font-apercu-medium text-gray-700">
                      Date of Birth *
                    </label>
                    <p className="text-xs text-gray-500 font-apercu-regular">
                      Please select your birth day, month, and year from the dropdowns below.
                      You can use the arrow keys to navigate and Enter to select.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Day Dropdown */}
                      <div className="relative">
                        <label className="block text-xs font-apercu-medium text-gray-600 mb-1">Day</label>
                        <select
                          name="birthDay"
                          aria-label="Birth day"
                          value={formData.dateOfBirth ? new Date(formData.dateOfBirth).getDate() : ''}
                          onChange={(e) => {
                            const day = e.target.value
                            const currentDate = formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()
                            if (day) {
                              currentDate.setDate(parseInt(day))
                              const newDate = currentDate.toISOString().split('T')[0]
                              setFormData(prev => ({ ...prev, dateOfBirth: newDate }))
                            }
                          }}
                          className={`block w-full px-3 py-1 border-2 rounded-md shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 h-9 ${
                            getFieldError('dateOfBirth')
                              ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50 shadow-lg shadow-red-100 ring-2 ring-red-200'
                              : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                          }`}
                        >
                          <option value="">Select Day</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>

                      {/* Month Dropdown */}
                      <div className="relative">
                        <label className="block text-xs font-apercu-medium text-gray-600 mb-1">Month</label>
                        <select
                          name="birthMonth"
                          aria-label="Birth month"
                          value={formData.dateOfBirth ? new Date(formData.dateOfBirth).getMonth() + 1 : ''}
                          onChange={(e) => {
                            const month = e.target.value
                            const currentDate = formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()
                            if (month) {
                              currentDate.setMonth(parseInt(month) - 1)
                              const newDate = currentDate.toISOString().split('T')[0]
                              setFormData(prev => ({ ...prev, dateOfBirth: newDate }))
                            }
                          }}
                          className={`block w-full px-3 py-1 border-2 rounded-md shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 h-9 ${
                            getFieldError('dateOfBirth')
                              ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50 shadow-lg shadow-red-100 ring-2 ring-red-200'
                              : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                          }`}
                        >
                          <option value="">Select Month</option>
                          <option value="1">January</option>
                          <option value="2">February</option>
                          <option value="3">March</option>
                          <option value="4">April</option>
                          <option value="5">May</option>
                          <option value="6">June</option>
                          <option value="7">July</option>
                          <option value="8">August</option>
                          <option value="9">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </div>

                      {/* Year Dropdown */}
                      <div className="relative">
                        <label className="block text-xs font-apercu-medium text-gray-600 mb-1">Year</label>
                        <select
                          name="birthYear"
                          aria-label="Birth year"
                          value={formData.dateOfBirth ? new Date(formData.dateOfBirth).getFullYear() : ''}
                          onChange={(e) => {
                            const year = e.target.value
                            const currentDate = formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()
                            if (year) {
                              currentDate.setFullYear(parseInt(year))
                              const newDate = currentDate.toISOString().split('T')[0]
                              setFormData(prev => ({ ...prev, dateOfBirth: newDate }))
                            }
                          }}
                          className={`block w-full px-3 py-1 border-2 rounded-md shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 h-9 ${
                            getFieldError('dateOfBirth')
                              ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50 shadow-lg shadow-red-100 ring-2 ring-red-200'
                              : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                          }`}
                        >
                          <option value="">Select Year</option>
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Success indicator */}
                    {formData.dateOfBirth && !getFieldError('dateOfBirth') && (
                      <div className="flex items-center justify-center mt-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="ml-2 text-sm text-green-600 font-apercu-medium">Date selected</span>
                      </div>
                    )}

                    {getFieldError('dateOfBirth') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('dateOfBirth')}
                      </p>
                    )}
                    {formData.dateOfBirth && !getFieldError('dateOfBirth') && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-apercu-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Age: {calculateAge(formData.dateOfBirth)} years old
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Address Field */}
                  <div className="space-y-2 lg:col-span-2">
                    <label htmlFor="address" className="block text-sm font-apercu-medium text-gray-700">
                      Address *
                    </label>
                    <div className="relative">
                      <textarea
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none ${
                          getFieldError('address')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter your full address"
                      />
                      {formData.address && !getFieldError('address') && (
                        <div className="absolute right-3 top-3">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('address') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('address')}
                      </p>
                    )}
                  </div>

                  {/* Branch Field */}
                  <div className="space-y-2">
                    <label htmlFor="branch" className="block text-sm font-apercu-medium text-gray-700">
                      Branch *
                    </label>
                    <div className="relative">
                      <select
                        name="branch"
                        id="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('branch')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                      >
                        <option value="">Select Branch</option>
                        <option value="Iyana Ipaja">Iyana Ipaja</option>
                        <option value="Bajomo">Bajomo</option>
                        <option value="Badagry">Badagry</option>
                        <option value="Bada">Bada</option>
                        <option value="Itele">Itele</option>
                        <option value="Atan">Atan</option>
                        <option value="Ijoko">Ijoko</option>
                        <option value="Sango">Sango</option>
                        <option value="Ifo">Ifo</option>
                        <option value="Gudugba">Gudugba</option>
                        <option value="Great City">Great City</option>
                        <option value="Abeokuta">Abeokuta</option>
                        <option value="Oseile">Oseile</option>
                        <option value="Ayetoro 1">Ayetoro 1</option>
                        <option value="Ayetoro 2">Ayetoro 2</option>
                        <option value="Imeko">Imeko</option>
                        <option value="Sagamu">Sagamu</option>
                        <option value="Ikorodu">Ikorodu</option>
                        <option value="Ibadan">Ibadan</option>
                        <option value="Akure">Akure</option>
                        <option value="Iju">Iju</option>
                        <option value="Osogbo">Osogbo</option>
                        <option value="Ikire">Ikire</option>
                        <option value="Ido Ekiti">Ido Ekiti</option>
                        <option value="Not a Member">Not a Member</option>
                      </select>
                      {formData.branch && !getFieldError('branch') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('branch') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('branch')}
                      </p>
                    )}
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-2">
                    <label htmlFor="phoneNumber" className="block text-sm font-apercu-medium text-gray-700">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phoneNumber"
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('phoneNumber')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {formData.phoneNumber && !getFieldError('phoneNumber') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('phoneNumber') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('phoneNumber')}
                      </p>
                    )}
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-2 lg:col-span-2">
                    <label htmlFor="emailAddress" className="block text-sm font-apercu-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="emailAddress"
                        id="emailAddress"
                        value={formData.emailAddress}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('emailAddress')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter your email address"
                      />
                      {formData.emailAddress && !getFieldError('emailAddress') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('emailAddress') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('emailAddress')}
                      </p>
                    )}
                  </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="font-apercu-medium px-6 py-3"
                    disabled={stepTransitioning || !formData.fullName || !formData.dateOfBirth || !formData.gender || !formData.address || !formData.phoneNumber || !formData.emailAddress}
                  >
                    {stepTransitioning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        Next Step
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}

            {/* Step 2: Parent/Guardian Information */}
            {currentStep === 2 && (
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="text-center pb-4 sm:pb-6 border-b border-gray-100">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-apercu-bold text-gray-900 mb-2 px-2">
                    Parent/Guardian Information
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base font-apercu-regular text-gray-600 px-2">
                    Please provide your parent or guardian's contact information
                  </CardDescription>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-apercu-medium text-gray-600 mb-2">
                      <span>Form Progress</span>
                      <span>{getStep2Progress()}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getStep2Progress()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-100 mb-6">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mr-3 shadow-md">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-apercu-bold text-gray-900">Parent/Guardian Information</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Parent/Guardian Name */}
                  <div className="space-y-2">
                    <label htmlFor="parentGuardianName" className="block text-sm font-apercu-medium text-gray-700">
                      Parent/Guardian Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="parentGuardianName"
                        id="parentGuardianName"
                        value={formData.parentGuardianName}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('parentGuardianName')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter parent/guardian name"
                      />
                      {formData.parentGuardianName && !getFieldError('parentGuardianName') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('parentGuardianName') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('parentGuardianName')}
                      </p>
                    )}
                  </div>

                  {/* Parent/Guardian Phone */}
                  <div className="space-y-2">
                    <label htmlFor="parentGuardianPhone" className="block text-sm font-apercu-medium text-gray-700">
                      Parent/Guardian Phone *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="parentGuardianPhone"
                        id="parentGuardianPhone"
                        value={formData.parentGuardianPhone}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('parentGuardianPhone')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter parent/guardian phone"
                      />
                      {formData.parentGuardianPhone && !getFieldError('parentGuardianPhone') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('parentGuardianPhone') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('parentGuardianPhone')}
                      </p>
                    )}
                  </div>

                  {/* Parent/Guardian Email */}
                  <div className="space-y-2 lg:col-span-2">
                    <label htmlFor="parentGuardianEmail" className="block text-sm font-apercu-medium text-gray-700">
                      Parent/Guardian Email (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="parentGuardianEmail"
                        id="parentGuardianEmail"
                        value={formData.parentGuardianEmail}
                        onChange={handleChange}
                        className="block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md"
                        placeholder="Enter parent/guardian email (optional)"
                      />
                      {formData.parentGuardianEmail && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>


                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button type="button" onClick={handlePrevious} variant="outline" className="font-apercu-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    type="button"
                    onClick={handleNext}
                    className="font-apercu-medium px-6 py-3"
                    disabled={stepTransitioning || !formData.parentGuardianName || !formData.parentGuardianPhone}
                  >
                    {stepTransitioning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        Next Step
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}

            {/* Step 3: Emergency Contact Information */}
            {currentStep === 3 && (
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="text-center pb-4 sm:pb-6 border-b border-gray-100">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-apercu-bold text-gray-900 mb-2 px-2">
                    Emergency Contact Information
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base font-apercu-regular text-gray-600 px-2">
                    Please provide emergency contact details for safety purposes
                  </CardDescription>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-apercu-medium text-gray-600 mb-2">
                      <span>Form Progress</span>
                      <span>{getStep3Progress()}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getStep3Progress()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Use Parent as Emergency Contact Checkbox */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="useParentAsEmergencyContact"
                      name="useParentAsEmergencyContact"
                      checked={formData.useParentAsEmergencyContact}
                      onChange={(e) => handleUseParentAsEmergencyContact(e.target.checked)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="useParentAsEmergencyContact" className="block text-sm font-apercu-medium text-gray-900 cursor-pointer">
                        Use parent information as Emergency contact
                      </label>
                      <p className="text-xs text-gray-600 font-apercu-regular mt-1">
                        Check this box to automatically use your parent/guardian information as your emergency contact
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show parent info when checkbox is checked */}
                {formData.useParentAsEmergencyContact && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-apercu-medium text-green-800">Using Parent Information as Emergency Contact</span>
                    </div>
                    <div className="text-sm text-green-700 font-apercu-regular">
                      <p><strong>Name:</strong> {formData.parentGuardianName || 'Not provided'}</p>
                      <p><strong>Phone:</strong> {formData.parentGuardianPhone || 'Not provided'}</p>
                      <p><strong>Relationship:</strong> Parent</p>
                    </div>
                  </div>
                )}

                {formData.useParentAsEmergencyContact && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500 font-apercu-regular italic">
                      Emergency contact fields are disabled because you're using parent information
                    </p>
                  </div>
                )}

                {/* Emergency Contact Information Section */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 sm:p-6 border border-orange-100 mb-6">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mr-3 shadow-md">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-apercu-bold text-gray-900">Emergency Contact Information</h3>
                  </div>

                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${formData.useParentAsEmergencyContact ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Emergency Contact Name */}
                  <div className="space-y-2">
                    <label htmlFor="emergencyContactName" className="block text-sm font-apercu-medium text-gray-700">
                      Emergency Contact Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="emergencyContactName"
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('emergencyContactName')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter emergency contact name"
                      />
                      {formData.emergencyContactName && !getFieldError('emergencyContactName') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('emergencyContactName') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('emergencyContactName')}
                      </p>
                    )}
                  </div>

                  {/* Emergency Contact Phone */}
                  <div className="space-y-2">
                    <label htmlFor="emergencyContactPhone" className="block text-sm font-apercu-medium text-gray-700">
                      Emergency Contact Phone *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('emergencyContactPhone')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter emergency contact phone"
                      />
                      {formData.emergencyContactPhone && !getFieldError('emergencyContactPhone') && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('emergencyContactPhone') && (
                      <p className="text-sm text-red-600 font-apercu-regular flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {getFieldError('emergencyContactPhone')}
                      </p>
                    )}
                  </div>

                  {/* Emergency Contact Relationship */}
                  <div className="space-y-2 lg:col-span-2">
                    <label htmlFor="emergencyContactRelationship" className="block text-sm font-apercu-medium text-gray-700">
                      Relationship to Emergency Contact (Optional)
                    </label>
                    <div className="relative">
                      <select
                        name="emergencyContactRelationship"
                        id="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={handleChange}
                        className="block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md"
                      >
                        <option value="">Select Relationship</option>
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.emergencyContactRelationship && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button type="button" onClick={handlePrevious} variant="outline" className="font-apercu-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (!formData.useParentAsEmergencyContact && (!formData.emergencyContactName || !formData.emergencyContactPhone))}
                    className="font-apercu-medium px-6 py-3"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
            </div>

          </form>
          )}




        </Card>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegistrationFormSkeleton />}>
      <RegistrationForm />
    </Suspense>
  )
}
