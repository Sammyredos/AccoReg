'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Phone, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface SMSAuthProps {
  onSuccess?: (token: string) => void
  onError?: (error: string) => void
}

export function SMSAuth({ onSuccess, onError }: SMSAuthProps) {
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [codeSent, setCodeSent] = useState(false)

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setError('')
  }

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/sms/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, '') // Send only digits
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      setCodeSent(true)
      setStep('verify')
      setError('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/sms/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          code: verificationCode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAttemptsRemaining(data.attemptsRemaining)
        throw new Error(data.error || 'Invalid verification code')
      }

      // Success
      onSuccess?.(data.token)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/sms/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, '')
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code')
      }

      setCodeSent(true)
      setError('')
      setAttemptsRemaining(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setVerificationCode('')
    setError('')
    setAttemptsRemaining(null)
    setCodeSent(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {step === 'phone' ? (
            <Phone className="h-6 w-6 text-indigo-600" />
          ) : (
            <MessageSquare className="h-6 w-6 text-indigo-600" />
          )}
        </div>
        <h2 className="text-xl font-apercu-bold text-gray-900">
          {step === 'phone' ? 'Phone Verification' : 'Enter Verification Code'}
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {step === 'phone' 
            ? 'Enter your phone number to receive a verification code'
            : `We sent a 6-digit code to ${phoneNumber}`
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {attemptsRemaining !== null && attemptsRemaining > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
          </p>
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-apercu-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="text-center text-lg"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleSendCode}
            disabled={loading || !phoneNumber.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-apercu-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <Input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setVerificationCode(value)
                setError('')
              }}
              placeholder="123456"
              className="text-center text-lg tracking-widest"
              disabled={loading}
              maxLength={6}
            />
          </div>

          <Button
            onClick={handleVerifyCode}
            disabled={loading || verificationCode.length !== 6}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Code
              </>
            )}
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleBackToPhone}
              disabled={loading}
              className="flex-1"
            >
              Change Number
            </Button>
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Resend Code'
              )}
            </Button>
          </div>
        </div>
      )}

      {codeSent && step === 'verify' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">
            Verification code sent successfully!
          </p>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to receive SMS messages for verification purposes.
          Standard message rates may apply.
        </p>
      </div>
    </Card>
  )
}
