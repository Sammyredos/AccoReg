/**
 * Lightweight Chart Components
 * Simple, fast alternatives to Chart.js for better performance
 */

import React from 'react'

interface SimpleBarChartProps {
  data: { label: string; value: number }[]
  height?: number
  colors?: string[]
}

export function SimpleBarChart({ data, height = 200, colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'] }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1) // Ensure maxValue is at least 1 to avoid division by zero
  const hasData = data.some(d => d.value > 0)

  if (!hasData) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-sm text-gray-500 font-apercu-medium">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => (
          <div key={item.label} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
              style={{
                height: `${(item.value / maxValue) * 80}%`,
                backgroundColor: colors[index % colors.length],
                minHeight: item.value > 0 ? '4px' : '2px'
              }}
            />
            <span className="text-xs text-gray-600 mt-2 text-center font-apercu-regular">
              {item.label}
            </span>
            <span className="text-xs text-gray-900 font-apercu-bold">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SimpleDoughnutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
}

export function SimpleDoughnutChart({ data, size = 150 }: SimpleDoughnutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  const radius = size / 2
  const innerRadius = radius * 0.6

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-sm text-gray-500 font-apercu-medium">No data available</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-center space-x-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = item.value / total
            const angle = percentage * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle
            
            currentAngle += angle
            
            const x1 = radius + radius * Math.cos((startAngle * Math.PI) / 180)
            const y1 = radius + radius * Math.sin((startAngle * Math.PI) / 180)
            const x2 = radius + radius * Math.cos((endAngle * Math.PI) / 180)
            const y2 = radius + radius * Math.sin((endAngle * Math.PI) / 180)
            
            const largeArcFlag = angle > 180 ? 1 : 0
            
            const pathData = [
              `M ${radius} ${radius}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')
            
            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            )
          })}
          {/* Inner circle to create doughnut effect */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="white"
          />
        </svg>
      </div>
      
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-apercu-regular text-gray-700">
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SimpleLineChartProps {
  data: { label: string; value: number }[]
  height?: number
  color?: string
}

export function SimpleLineChart({ data, height = 200, color = '#3B82F6' }: SimpleLineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  
  const width = 300
  const padding = 20
  const chartWidth = width - (padding * 2)
  const chartHeight = height - (padding * 2)
  
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxValue - item.value) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')
  
  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-sm"
        />
        
        {/* Points */}
        {data.map((item, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + ((maxValue - item.value) / range) * chartHeight
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
              className="hover:r-6 transition-all duration-200"
            />
          )
        })}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 px-5">
        {data.map((item, index) => (
          <span key={index} className="text-xs text-gray-600 font-apercu-regular">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

interface SimpleProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}

export function SimpleProgressRing({ 
  percentage, 
  size = 100, 
  strokeWidth = 8, 
  color = '#3B82F6' 
}: SimpleProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-apercu-bold text-gray-900">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}

// Simple stats display component
interface SimpleStatsProps {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  color?: string
}

export function SimpleStats({ title, value, change, changeLabel, color = '#3B82F6' }: SimpleStatsProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-apercu-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-apercu-bold text-gray-900">{value}</span>
        {change !== undefined && (
          <span 
            className={`text-sm font-apercu-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? '+' : ''}{change}%
            {changeLabel && <span className="text-gray-500 ml-1">{changeLabel}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
