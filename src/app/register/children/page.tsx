'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Users, Heart, Shield, Baby, Calendar } from 'lucide-react'

interface FormData {
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  branch: string
  parentGuardianName: string
  parentGuardianPhone: string
  parentGuardianEmail: string
}

interface ValidationError {
  field: string
  message: string
}

interface FormErrors {
  [key: string]: string
}

interface RegistrationSettings {
  minimumAge: number
}

export default function ChildrenRegistrationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [success, setSuccess] = useState(false)
  const [registrationSettings, setRegistrationSettings] = useState<RegistrationSettings>({ minimumAge: 13 })
  const [systemName, setSystemName] = useState('AccoReg')
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    branch: '', // Branch selection required
    parentGuardianName: '',
    parentGuardianPhone: '',
    parentGuardianEmail: ''
  })
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [showAgeModal, setShowAgeModal] = useState(false)
  const [userAge, setUserAge] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepTransitioning, setStepTransitioning] = useState(false)

  useEffect(() => {
    // Load registration settings (same API as main registration form)
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/registration/settings')
        if (response.ok) {
          const settings = await response.json()
          setRegistrationSettings({ minimumAge: settings.minimumAge || 13 })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    // Load system branding
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/system/branding')
        if (response.ok) {
          const branding = await response.json()
          setSystemName(branding.systemName || 'AccoReg')
        }
      } catch (error) {
        console.error('Error loading branding:', error)
      }
    }

    loadSettings()
    loadBranding()
  }, [])

  // Check for edit mode and load existing registration data
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      setIsEditMode(true)
      setEditingId(editId)
      loadExistingRegistration(editId)
    }
  }, [searchParams])

  const loadExistingRegistration = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/registrations/children?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.registration) {
          const reg = data.registration
          setFormData({
            fullName: reg.fullName || '',
            dateOfBirth: reg.dateOfBirth ? new Date(reg.dateOfBirth).toISOString().split('T')[0] : '',
            gender: reg.gender || '',
            address: reg.address || '',
            branch: reg.branch || '',
            parentGuardianName: reg.parentGuardianName || '',
            parentGuardianPhone: reg.parentGuardianPhone || '',
            parentGuardianEmail: reg.parentGuardianEmail || ''
          })
        }
      } else {
        console.error('Failed to load registration for editing')
      }
    } catch (error) {
      console.error('Error loading registration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear errors when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Clear validation errors for this field
    setErrors(prev => prev.filter(error => error.field !== name))

    // Check age when date of birth changes
    if (name === 'dateOfBirth' && value) {
      // Small delay to allow the UI to update before showing modal
      setTimeout(() => {
        checkAgeAndShowModal(value)
      }, 100)
    }
  }

  // Step 1 validation (Child Information)
  const validateStep1 = (): ValidationError[] => {
    const validationErrors: ValidationError[] = []

    if (!formData.fullName.trim()) {
      validationErrors.push({ field: 'fullName', message: 'Full name is required' })
    } else if (formData.fullName.trim().length < 2) {
      validationErrors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' })
    }

    if (!formData.dateOfBirth) {
      validationErrors.push({ field: 'dateOfBirth', message: 'Date of birth is required' })
    } else {
      // Validate that the child is under the minimum age requirement
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age >= registrationSettings.minimumAge) {
        validationErrors.push({
          field: 'dateOfBirth',
          message: `Children registration is for ages under ${registrationSettings.minimumAge}. Please use the main registration form.`
        })
      }

      if (age < 0) {
        validationErrors.push({
          field: 'dateOfBirth',
          message: 'Date of birth cannot be in the future'
        })
      }
    }

    if (!formData.gender) {
      validationErrors.push({ field: 'gender', message: 'Gender is required' })
    }

    if (!formData.address.trim()) {
      validationErrors.push({ field: 'address', message: 'Address is required' })
    } else if (formData.address.trim().length < 10) {
      validationErrors.push({ field: 'address', message: 'Please provide a complete address' })
    }

    if (!formData.branch.trim()) {
      validationErrors.push({ field: 'branch', message: 'Branch is required' })
    }

    return validationErrors
  }

  // Step 2 validation (Parent/Guardian Information)
  const validateStep2 = (): ValidationError[] => {
    const validationErrors: ValidationError[] = []

    if (!formData.parentGuardianName.trim()) {
      validationErrors.push({ field: 'parentGuardianName', message: 'Parent/Guardian name is required' })
    }

    if (!formData.parentGuardianPhone.trim()) {
      validationErrors.push({ field: 'parentGuardianPhone', message: 'Parent/Guardian phone is required' })
    }

    if (!formData.parentGuardianEmail.trim()) {
      validationErrors.push({ field: 'parentGuardianEmail', message: 'Parent/Guardian email is required' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentGuardianEmail)) {
      validationErrors.push({ field: 'parentGuardianEmail', message: 'Please enter a valid email address' })
    }

    return validationErrors
  }

  // Complete form validation
  const validateForm = (): ValidationError[] => {
    return [...validateStep1(), ...validateStep2()]
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

  const getFieldError = (fieldName: string): string => {
    const error = errors.find(err => err.field === fieldName)
    return error ? error.message : (formErrors[fieldName] || '')
  }

  // Check age and show modal if above minimum age
  const checkAgeAndShowModal = (dateOfBirth: string) => {
    if (!dateOfBirth) return false

    const age = calculateAge(dateOfBirth)
    if (age >= registrationSettings.minimumAge) {
      setUserAge(age)
      setShowAgeModal(true)
      return true
    }
    return false
  }

  // Step navigation functions
  const handleNext = () => {
    let stepErrors: ValidationError[] = []

    if (currentStep === 1) {
      // First check age without validation errors
      if (checkAgeAndShowModal(formData.dateOfBirth)) {
        return // Stop here if age modal is shown
      }

      // Then validate step 1
      stepErrors = validateStep1()
      setErrors(stepErrors)

      if (stepErrors.length === 0) {
        setStepTransitioning(true)
        setTimeout(() => {
          setCurrentStep(2)
          setStepTransitioning(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 150)
      } else {
        scrollToFirstError(stepErrors)
      }
    }
  }

  const handlePrevious = () => {
    setStepTransitioning(true)
    setTimeout(() => {
      setCurrentStep(1)
      setStepTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 150)
  }

  // Progress calculation
  const getStep1Progress = () => {
    const requiredFields = ['fullName', 'dateOfBirth', 'gender', 'address']
    const completedFields = requiredFields.filter(field => formData[field as keyof FormData]?.toString().trim())
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  const getStep2Progress = () => {
    const requiredFields = ['parentGuardianName', 'parentGuardianPhone', 'parentGuardianEmail']
    const completedFields = requiredFields.filter(field => formData[field as keyof FormData]?.toString().trim())
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  const checkDuplicateRegistration = async (data: FormData) => {
    try {
      const response = await fetch('/api/registrations/children/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: data.fullName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
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

  const scrollToFirstError = (errors: ValidationError[]) => {
    if (errors.length === 0) return

    // Get the first error field
    const firstErrorField = errors[0].field
    const element = document.getElementById(firstErrorField)

    if (element) {
      // Calculate offset for fixed header
      const headerOffset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      // Focus the element after scrolling
      setTimeout(() => {
        element.focus()
      }, 300)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate current step
    const stepErrors = currentStep === 1 ? validateStep1() : validateStep2()
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      scrollToFirstError(stepErrors)
      return
    }

    // If on step 1, go to next step
    if (currentStep === 1) {
      handleNext()
      return
    }

    // If on step 2, submit the form
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      scrollToFirstError(validationErrors)
      return
    }

    setLoading(true)

    try {
      // Check for duplicates first
      let duplicateCheck: any
      try {
        duplicateCheck = await checkDuplicateRegistration(formData)
      } catch (duplicateError) {
        console.error('Duplicate check failed:', duplicateError)
        // If duplicate check fails, continue with registration
        duplicateCheck = { isDuplicate: false, hasSimilarNames: false }
      }

      // Block registration if ANY duplicate or similar registration is found
      if (duplicateCheck.isDuplicate || (duplicateCheck.hasSimilarNames && duplicateCheck.similarRegistrations?.length > 0)) {
        // Create field-specific errors based on which fields are duplicated or similar
        const duplicateErrors: ValidationError[] = []

        if (duplicateCheck.isDuplicate) {
          if (duplicateCheck.duplicateFields && duplicateCheck.duplicateFields.includes('name')) {
            duplicateErrors.push({ field: 'fullName', message: 'This child\'s name already exists in our database' })
          } else {
            // Default duplicate error if no specific field is identified
            duplicateErrors.push({ field: 'fullName', message: 'This child\'s information already exists in our database' })
          }
        } else if (duplicateCheck.hasSimilarNames) {
          // For similar names, highlight the name field
          duplicateErrors.push({ field: 'fullName', message: 'A similar child\'s name with the same age/gender already exists in our database' })
        }

        setErrors(duplicateErrors)

        // Navigate to step 1 where the duplicate field is (same logic as main form)
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

      // Submit the registration (create or update)
      const url = isEditMode
        ? `/api/admin/registrations/children?id=${editingId}`
        : '/api/registrations/children/submit'

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        let errorData: any
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: 'Unknown server error' }
        }

        // Check if it's a field-specific error from the server
        if (errorData.field) {
          const serverError: ValidationError = {
            field: errorData.field,
            message: errorData.message || 'Invalid field value'
          }
          setErrors([serverError])
          scrollToFirstError([serverError])
        } else {
          // Create a general error for the form
          const generalError: ValidationError = {
            field: 'fullName', // Default to first field
            message: errorData.error || 'Registration failed. Please try again.'
          }
          setErrors([generalError])
          scrollToFirstError([generalError])
        }
      }
    } catch (error) {
      console.error('❌ Network/Exception error:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      // Create a network error for the form
      const networkError: ValidationError = {
        field: 'fullName', // Default to first field
        message: 'Registration failed. Please try again.'
      }
      setErrors([networkError])
      scrollToFirstError([networkError])
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardContent className="text-center p-6 sm:p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 sm:mb-6 shadow-lg">
                <Check className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-apercu-bold text-gray-900 mb-3 sm:mb-4">
                {isEditMode ? 'Registration Updated!' : 'Registration Successful!'}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg font-apercu-regular text-gray-600 mb-4 sm:mb-6 px-4">
                {isEditMode
                  ? `Your child's registration information has been updated successfully in ${systemName}.`
                  : `Thank you for registering your child with ${systemName}. We have received the information successfully.`
                }
              </CardDescription>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/register/children')}
                  className="w-full font-apercu-medium text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Register Another Child
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="w-full font-apercu-medium text-sm sm:text-base"
                >
                  Return to Home
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
                        You're too old for this registration form
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
                      <Users className="w-8 h-8 text-orange-600" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-apercu-bold text-gray-900 text-lg">
                        Main Registration Required
                      </h4>
                      <p className="text-gray-600 font-apercu-regular text-sm leading-relaxed">
                        At {userAge} years old, you need to use our main registration form.
                        This children's form is designed for participants under {registrationSettings.minimumAge} years old.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-blue-800 font-apercu-medium text-sm">
                        <strong>Main Registration Form</strong><br />
                        For ages {registrationSettings.minimumAge} and above
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: formData.fullName || '',
                          dob: formData.dateOfBirth || '',
                          gender: formData.gender || '',
                          address: formData.address || '',
                        })
                        router.push(`/register?${params.toString()}`)
                      }}
                      className="w-full font-apercu-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Continue to Main Registration
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAgeModal(false)
                        setFormData(prev => ({ ...prev, dateOfBirth: '' }))
                      }}
                      variant="outline"
                      className="w-full font-apercu-medium"
                    >
                      Cancel & Clear Date
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <Baby className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-apercu-bold text-gray-900 mb-2">
            {isEditMode ? 'Edit Children Registration' : 'Children Registration'}
          </h1>
          <p className="text-base sm:text-lg font-apercu-regular text-gray-600 max-w-2xl mx-auto px-4">
            {isEditMode
              ? `Update your child's registration information for ${systemName} programs`
              : `Register your child (under ${registrationSettings.minimumAge}) for ${systemName} programs`
            }
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4 px-4">
            <Badge variant="secondary" className="font-apercu-medium text-xs sm:text-sm">
              <Calendar className="w-3 h-3 mr-1" />
              Ages 0-{registrationSettings.minimumAge - 1} years
            </Badge>
            <Badge variant="outline" className="font-apercu-medium text-xs sm:text-sm">
              Information Collection Only
            </Badge>
          </div>
        </div>

        {/* Back to Main Registration */}
        <div className="mb-4 sm:mb-6">
          <Button
            onClick={() => router.push('/register')}
            variant="outline"
            className="font-apercu-medium text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Registration
          </Button>
        </div>

        {/* Enhanced Progress Indicator */}
        <div className="mb-8 sm:mb-10">
          <div className="relative">
            {/* Progress Bar Background */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 rounded-full"></div>

            {/* Active Progress Bar */}
            <div className={`absolute top-4 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-in-out ${
              currentStep >= 2 ? 'w-full' : 'w-0'
            }`}></div>

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
                    Child Information
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
                  2
                  {currentStep === 2 && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-apercu-bold transition-colors duration-300 ${
                    currentStep >= 2 ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    Parent/Guardian
                  </div>
                  <div className="text-xs text-gray-500 font-apercu-regular mt-1">
                    Contact information
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
                  Step {currentStep} of 2
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-lg border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <CardContent className="space-y-6 p-6 sm:p-8">
              {/* Loading Header */}
              <div className="text-center pb-4 sm:pb-6 border-b border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                  <Baby className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-apercu-bold text-gray-900 mb-2 px-2">
                  {isEditMode ? 'Updating Children Registration' : 'Processing Children Registration'}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base font-apercu-regular text-gray-600 px-2">
                  {isEditMode
                    ? 'Please wait while we update your child\'s information...'
                    : 'Please wait while we save your child\'s information...'
                  }
                </CardDescription>
              </div>

              {/* Simple Loading Indicator */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600 font-apercu-regular">
                  {isEditMode ? 'Updating registration...' : 'Submitting registration...'}
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">


                {/* Step Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-apercu-bold text-gray-900 mb-2">
                    {currentStep === 1 ? 'Child Information' : 'Parent/Guardian Information'}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 font-apercu-regular">
                    {currentStep === 1
                      ? 'Please provide your child\'s basic information'
                      : 'Please provide parent or guardian contact details'
                    }
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-apercu-medium">
                      {currentStep === 1 ? `${getStep1Progress()}% Complete` : `${getStep2Progress()}% Complete`}
                    </div>
                  </div>
                </div>

                {/* Step 1: Child Information */}
                {currentStep === 1 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mr-3 shadow-md">
                      <Baby className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-apercu-bold text-gray-900">Child Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="block text-sm font-apercu-medium text-gray-700">
                        Child's Full Name *
                      </label>
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
                        placeholder="Enter child's full name"
                      />
                      {getFieldError('fullName') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('fullName')}</p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                      <label htmlFor="gender" className="block text-sm font-apercu-medium text-gray-700">
                        Gender *
                      </label>
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
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {getFieldError('gender') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('gender')}</p>
                      )}
                    </div>

                    {/* Date of Birth Field */}
                    <div className="space-y-2 sm:col-span-2">
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

                                // Check age when date changes
                                setTimeout(() => {
                                  checkAgeAndShowModal(newDate)
                                }, 100)
                              }
                            }}
                            className={`block w-full px-3 py-1 border-2 rounded-md shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 h-9 ${
                              getFieldError('dateOfBirth')
                                ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50 shadow-lg shadow-red-100 ring-2 ring-red-200'
                                : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <option value="">Select Day</option>
                            {Array.from({ length: 31 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
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

                                // Check age when date changes
                                setTimeout(() => {
                                  checkAgeAndShowModal(newDate)
                                }, 100)
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

                                // Check age when date changes
                                setTimeout(() => {
                                  checkAgeAndShowModal(newDate)
                                }, 100)
                              }
                            }}
                            className={`block w-full px-3 py-1 border-2 rounded-md shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 h-9 ${
                              getFieldError('dateOfBirth')
                                ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50 shadow-lg shadow-red-100 ring-2 ring-red-200'
                                : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <option value="">Select Year</option>
                            {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
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

                    {/* Address */}
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-apercu-medium text-gray-700">
                        Address *
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows={3}
                        value={formData.address}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none ${
                          getFieldError('address')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter child's full home address including street, city, state/province, and postal code"
                      />
                      {getFieldError('address') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('address')}</p>
                      )}
                    </div>

                    {/* Branch */}
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="branch" className="block text-sm font-apercu-medium text-gray-700">
                        Branch *
                      </label>
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
                      {getFieldError('branch') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('branch')}</p>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Step 2: Parent/Guardian Information */}
                {currentStep === 2 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-100">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mr-3 shadow-md">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-apercu-bold text-gray-900">Parent/Guardian Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Parent/Guardian Name */}
                    <div className="space-y-2">
                      <label htmlFor="parentGuardianName" className="block text-sm font-apercu-medium text-gray-700">
                        Parent/Guardian Name *
                      </label>
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
                      {getFieldError('parentGuardianName') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('parentGuardianName')}</p>
                      )}
                    </div>

                    {/* Parent/Guardian Phone */}
                    <div className="space-y-2">
                      <label htmlFor="parentGuardianPhone" className="block text-sm font-apercu-medium text-gray-700">
                        Parent/Guardian Phone *
                      </label>
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
                        placeholder="Enter parent/guardian phone number"
                      />
                      {getFieldError('parentGuardianPhone') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('parentGuardianPhone')}</p>
                      )}
                    </div>

                    {/* Parent/Guardian Email */}
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="parentGuardianEmail" className="block text-sm font-apercu-medium text-gray-700">
                        Parent/Guardian Email *
                      </label>
                      <input
                        type="email"
                        name="parentGuardianEmail"
                        id="parentGuardianEmail"
                        value={formData.parentGuardianEmail}
                        onChange={handleChange}
                        className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg shadow-sm font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                          getFieldError('parentGuardianEmail')
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                        placeholder="Enter parent/guardian email address"
                      />
                      {getFieldError('parentGuardianEmail') && (
                        <p className="text-red-600 text-xs sm:text-sm font-apercu-regular">{getFieldError('parentGuardianEmail')}</p>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Navigation Buttons */}
                <div className="pt-4 sm:pt-6 border-t border-gray-200">
                  {currentStep === 2 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-100 mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-gray-600 font-apercu-regular text-center">
                        <strong>Note:</strong> This registration is for information collection only.
                        Simple and easy registration for children.
                      </p>
                    </div>
                  )}

                  {/* Step 1 Buttons */}
                  {currentStep === 1 && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        type="button"
                        onClick={() => router.push('/register')}
                        variant="outline"
                        className="flex-1 font-apercu-medium px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Main Form
                      </Button>
                      <Button
                        type="submit"
                        disabled={stepTransitioning || !formData.fullName || !formData.dateOfBirth || !formData.gender || !formData.address}
                        className="flex-1 font-apercu-medium px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {stepTransitioning ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <span className="hidden sm:inline">Loading...</span>
                            <span className="sm:hidden">Loading...</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline text-white">Continue to Parent Info</span>
                            <span className="sm:hidden text-white">Continue</span>
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Step 2 Buttons */}
                  {currentStep === 2 && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        type="button"
                        onClick={handlePrevious}
                        variant="outline"
                        disabled={stepTransitioning}
                        className="flex-1 font-apercu-medium px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Child Info
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || !formData.parentGuardianName || !formData.parentGuardianPhone || !formData.parentGuardianEmail}
                        className="flex-1 font-apercu-medium px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <span className="hidden sm:inline">Submitting...</span>
                            <span className="sm:hidden">Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Baby className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline text-white">
                              {isEditMode ? 'Update Registration' : 'Submit Registration'}
                            </span>
                            <span className="sm:hidden text-white">
                              {isEditMode ? 'Update' : 'Complete Registration'}
                            </span>
                            <Check className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
