'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  Check,
  ChevronDown
} from 'lucide-react'
import { getLanguages, type Language } from '@/lib/i18n/index'
import { useLanguage } from '@/contexts/LanguageContext'

export function SystemBranding() {
  const { currentLanguage, setLanguage, t, isHydrated } = useLanguage()
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleLanguageChange = async (lang: Language) => {
    setSaving(true)
    setShowLangDropdown(false)

    try {
      // Use the setLanguage function from context
      setLanguage(lang)

      // Save to backend (optional - language is already persisted in localStorage)
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'branding',
          key: 'language',
          value: lang
        })
      })
    } catch (error) {
      console.error('Failed to save language:', error)
    }

    setSaving(false)
  }

  const languages = getLanguages()
  const currentLangData = languages.find(l => l.code === currentLanguage)

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">{t('settings.language')}</h3>
              <p className="font-apercu-regular text-sm text-gray-600">
                Choose your preferred language for the interface
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-apercu-medium">
            {languages.length} languages
          </Badge>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            disabled={saving}
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {currentLangData?.code.toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="font-apercu-medium text-sm text-gray-900">
                  {currentLangData?.native}
                </p>
                <p className="font-apercu-regular text-xs text-gray-500">
                  {currentLangData?.name}
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
              showLangDropdown ? 'rotate-180' : ''
            }`} />
          </button>

          {showLangDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {lang.code.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-apercu-medium text-sm text-gray-900">
                        {lang.native}
                      </p>
                      <p className="font-apercu-regular text-xs text-gray-500">
                        {lang.name}
                      </p>
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {saving && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">Saving language preference...</p>
        </div>
      )}
    </div>
  )
}
