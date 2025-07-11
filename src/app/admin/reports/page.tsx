'use client'

import { useState, useEffect } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import { useUser } from '@/contexts/UserContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { FileText, Download, Calendar, Users, BarChart3, Loader2, TrendingUp } from 'lucide-react'
import { SimpleBarChart, SimpleDoughnutChart, SimpleLineChart, SimpleStats } from '@/components/ui/simple-charts'

interface AnalyticsData {
  overview: {
    totalRegistrations: number
    registrationsToday: number
    registrationsThisWeek: number
    registrationsThisMonth: number
    averageAge: number
  }
  demographics: {
    ageGroups: Record<string, number>
    genderDistribution: Record<string, number>
  }
  trends: {
    dailyRegistrations: Array<{ date: string; count: number }>
  }
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [customReport, setCustomReport] = useState({
    dateRange: 'last30days',
    reportType: 'summary',
    format: 'html'
  })
  const { currentUser } = useUser()

  // Check if user can download reports
  const canDownload = currentUser?.role?.name && ['Super Admin', 'Admin', 'Manager'].includes(currentUser.role.name)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: string, format: string = 'html') => {
    setGenerating(true)
    try {
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          dateRange: customReport.dateRange,
          format
        }),
      })

      if (response.ok) {
        if (format === 'pdf') {
          // For PDF, the server returns HTML content that opens in a new window for printing
          const htmlContent = await response.text()
          const printWindow = window.open('', '_blank', 'width=800,height=600')

          if (printWindow) {
            printWindow.document.write(htmlContent)
            printWindow.document.close()
          } else {
            // Fallback: download as HTML file
            const blob = new Blob([htmlContent], { type: 'text/html' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.html`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          }
        } else {
          // For other formats, download the file directly
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        alert('Failed to generate report')
      }
    } catch (error) {
      console.error('Report generation failed:', error)
      alert('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const reports = [
    {
      name: 'Registration Summary',
      description: 'Complete overview of all registrations',
      type: 'HTML',
      reportType: 'summary',
      icon: Users,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      name: 'Analytics Report',
      description: 'Trends and statistical analysis',
      type: 'HTML',
      reportType: 'analytics',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'Demographics Report',
      description: 'Age, gender, and demographic data',
      type: 'HTML',
      reportType: 'demographics',
      icon: FileText,
      color: 'from-purple-500 to-pink-600'
    },
    {
      name: 'PDF Summary',
      description: 'Professional PDF report',
      type: 'PDF',
      reportType: 'summary',
      icon: FileText,
      color: 'from-red-500 to-orange-600'
    },
    {
      name: 'CSV Export',
      description: 'Export all data in CSV format',
      type: 'CSV',
      reportType: 'summary',
      icon: Download,
      color: 'from-indigo-500 to-purple-600'
    }
  ]

  // Reports Page Skeleton Component
  const ReportsPageSkeleton = () => (
    <AdminLayoutNew title="Reports" description="Generate and download program reports">
      <div className="space-y-8">
        {/* Analytics Overview Skeleton */}
        <StatsGrid columns="auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatsCard
              key={i}
              title=""
              value=""
              icon={Users}
              gradient="bg-gradient-to-r from-gray-400 to-gray-500"
              bgGradient="bg-gradient-to-br from-white to-gray-50"
              loading={true}
            />
          ))}
        </StatsGrid>

        {/* Quick Reports Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6 bg-white">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </Card>
          ))}
        </div>

        {/* Custom Report Generator Skeleton */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>

        {/* Demographics Overview Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6 bg-white">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-2 w-24 rounded-full" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Interactive Charts Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-6 bg-white">
                <Skeleton className="h-5 w-32 mb-4" />
                <Skeleton className="h-72 w-full rounded-lg" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayoutNew>
  )

  if (loading) {
    return <ReportsPageSkeleton />
  }

  return (
    <AdminLayoutNew
      title={t('page.reports.title')}
      description={t('page.reports.description')}
    >
      {/* Analytics Overview */}
      {analytics && (
        <StatsGrid columns="auto">
          <StatsCard
            title="Total Registrations"
            value={analytics.overview.totalRegistrations}
            subtitle="All participants"
            icon={Users}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
            bgGradient="bg-gradient-to-br from-white to-blue-50"
          />

          <StatsCard
            title="Today"
            value={analytics.overview.registrationsToday}
            subtitle="Today's registrations"
            icon={TrendingUp}
            gradient="bg-gradient-to-r from-green-500 to-emerald-600"
            bgGradient="bg-gradient-to-br from-white to-green-50"
          />

          <StatsCard
            title="This Week"
            value={analytics.overview.registrationsThisWeek}
            subtitle="Weekly registrations"
            icon={Calendar}
            gradient="bg-gradient-to-r from-purple-500 to-pink-600"
            bgGradient="bg-gradient-to-br from-white to-purple-50"
          />

          <StatsCard
            title="This Month"
            value={analytics.overview.registrationsThisMonth}
            subtitle="Monthly registrations"
            icon={BarChart3}
            gradient="bg-gradient-to-r from-indigo-500 to-purple-600"
            bgGradient="bg-gradient-to-br from-white to-indigo-50"
          />

          <StatsCard
            title="Average Age"
            value={`${analytics.overview.averageAge} years`}
            subtitle="Participant demographics"
            icon={Users}
            gradient="bg-gradient-to-r from-orange-500 to-red-600"
            bgGradient="bg-gradient-to-br from-white to-orange-50"
          />
        </StatsGrid>
      )}

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {reports.map((report, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow duration-200 bg-white">
            <div className="flex items-start justify-between mb-4">
              <div className={`h-12 w-12 bg-gradient-to-r ${report.color} rounded-xl flex items-center justify-center`}>
                <report.icon className="h-6 w-6 text-white" />
              </div>
              <Badge variant="secondary" className="font-apercu-medium text-xs">
                {report.type}
              </Badge>
            </div>

            <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">
              {report.name}
            </h3>
            <p className="font-apercu-regular text-sm text-gray-600 mb-4">
              {report.description}
            </p>

            <div className="flex items-center justify-between">
              <span className="font-apercu-regular text-xs text-gray-500">
                {canDownload ? 'Click to generate' : 'View only'}
              </span>
              {canDownload ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="font-apercu-medium"
                  onClick={() => generateReport(report.reportType, report.type.toLowerCase())}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {generating ? 'Generating...' : 'Generate'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="font-apercu-medium"
                  disabled
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Only
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">Custom Report Generator</h3>
            <p className="font-apercu-regular text-sm text-gray-600">Create custom reports with specific filters</p>
          </div>
          {canDownload ? (
            <Button
              className="font-apercu-medium"
              onClick={() => generateReport(customReport.reportType, customReport.format)}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          ) : (
            <Button
              className="font-apercu-medium"
              disabled
            >
              <FileText className="h-4 w-4 mr-2" />
              View Only Access
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="font-apercu-medium text-sm text-gray-700 mb-2 block">Date Range</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg font-apercu-regular text-sm"
              value={customReport.dateRange}
              onChange={(e) => setCustomReport({...customReport, dateRange: e.target.value})}
            >
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="last3months">Last 3 months</option>
              <option value="last6months">Last 6 months</option>
            </select>
          </div>

          <div>
            <label className="font-apercu-medium text-sm text-gray-700 mb-2 block">Report Type</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg font-apercu-regular text-sm"
              value={customReport.reportType}
              onChange={(e) => setCustomReport({...customReport, reportType: e.target.value})}
            >
              <option value="summary">Registration Summary</option>
              <option value="demographics">Demographics</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          <div>
            <label className="font-apercu-medium text-sm text-gray-700 mb-2 block">Format</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg font-apercu-regular text-sm"
              value={customReport.format}
              onChange={(e) => setCustomReport({...customReport, format: e.target.value})}
            >
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Demographics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="p-6 bg-white">
            <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Age Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analytics.demographics.ageGroups).map(([ageGroup, count]) => (
                <div key={ageGroup} className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-700">{ageGroup} years</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / analytics.overview.totalRegistrations) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-apercu-regular text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Gender Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analytics.demographics.genderDistribution).map(([gender, count]) => (
                <div key={gender} className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-700 capitalize">{gender}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${gender === 'male' ? 'bg-blue-600' : 'bg-pink-600'}`}
                        style={{ width: `${(count / analytics.overview.totalRegistrations) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-apercu-regular text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Interactive Charts Section */}
      {analytics && (
        <div className="mt-8">
          <h2 className="font-apercu-bold text-2xl text-gray-900 mb-6">📊 Interactive Analytics</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Age Distribution Chart */}
            <Card className="p-6 bg-white">
              <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Age Distribution</h3>
              <div style={{ height: '300px' }}>
                <SimpleBarChart
                  data={Object.entries(analytics.demographics.ageGroups).map(([label, value]) => ({
                    label,
                    value: value as number
                  }))}
                  height={300}
                  colors={['#667EEA', '#764BA2', '#4FACFE', '#00F2FE']}
                />
              </div>
            </Card>

            {/* Gender Distribution Chart */}
            <Card className="p-6 bg-white">
              <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Gender Distribution</h3>
              <div style={{ height: '300px' }}>
                <SimpleDoughnutChart
                  data={[
                    { label: 'Male', value: analytics.demographics.genderDistribution.male, color: '#4FACFE' },
                    { label: 'Female', value: analytics.demographics.genderDistribution.female, color: '#F093FB' }
                  ]}
                  size={200}
                />
              </div>
            </Card>
          </div>

          {/* Registration Trends Chart */}
          <Card className="p-6 bg-white">
            <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Registration Trends (Last 30 Days)</h3>
            <div style={{ height: '400px' }}>
              <SimpleLineChart
                data={analytics.trends.dailyRegistrations.map(item => ({
                  label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  value: item.count
                }))}
                height={400}
                color="#667EEA"
              />
            </div>
          </Card>
        </div>
      )}
    </AdminLayoutNew>
  )
}
