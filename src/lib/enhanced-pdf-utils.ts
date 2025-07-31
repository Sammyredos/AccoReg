/**
 * Enhanced PDF Generation Utilities
 * Beautiful and minimalistic PDF styling with Apercu font
 */

export interface EnhancedPDFOptions {
  title?: string
  filename?: string
  orientation?: 'portrait' | 'landscape'
  margins?: string
  subtitle?: string
  showHeader?: boolean
  showFooter?: boolean
}

/**
 * Generate beautiful PDF from HTML content
 */
export const generateEnhancedPDF = async (
  htmlContent: string, 
  options: EnhancedPDFOptions = {}
): Promise<void> => {
  const {
    title = 'Document',
    filename = 'document.pdf',
    orientation = 'portrait',
    margins = '20mm',
    subtitle = '',
    showHeader = true,
    showFooter = true
  } = options

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your browser\'s popup settings.')
  }

  // Enhanced HTML with beautiful styling
  const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Apercu Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #111827;
            background: #ffffff;
            font-size: 14px;
            font-weight: 400;
        }
        
        @page {
            size: A4 ${orientation};
            margin: ${margins};
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
            letter-spacing: -0.025em;
        }
        
        .header .subtitle {
            color: #6b7280;
            font-size: 16px;
            font-weight: 400;
            margin-bottom: 4px;
        }
        
        .header .meta {
            color: #9ca3af;
            font-size: 14px;
            font-weight: 400;
        }
        
        .content {
            margin-bottom: 40px;
        }
        
        .section {
            margin-bottom: 32px;
        }
        
        .section h2 {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
            letter-spacing: -0.025em;
        }
        
        .section h3 {
            font-size: 18px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 12px;
            letter-spacing: -0.025em;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-bottom: 24px;
        }
        
        .field {
            margin-bottom: 16px;
        }
        
        .field-label {
            font-weight: 500;
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .field-value {
            color: #111827;
            font-size: 15px;
            font-weight: 400;
            word-wrap: break-word;
            line-height: 1.4;
        }
        
        .field-value.large {
            font-size: 18px;
            font-weight: 500;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .table th,
        .table td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .table th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .table td {
            color: #111827;
            font-size: 14px;
            font-weight: 400;
        }
        
        .table tr:last-child td {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .badge-success {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .badge-warning {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .badge-error {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .badge-info {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
        }
        
        .card-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
            letter-spacing: -0.025em;
        }
        
        .card-subtitle {
            color: #6b7280;
            font-size: 14px;
            font-weight: 400;
        }
        
        .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            font-weight: 400;
        }
        
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e7eb, transparent);
            margin: 32px 0;
        }
        
        /* Print-specific styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 12px;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .no-break {
                page-break-inside: avoid;
            }
            
            .header h1 {
                font-size: 28px;
            }
            
            .section h2 {
                font-size: 20px;
            }
            
            .section h3 {
                font-size: 16px;
            }
        }
        
        /* Hide elements that shouldn't be printed */
        .no-print {
            display: none !important;
        }
        
        .print-only {
            display: block;
        }
        
        @media screen {
            .print-only {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${showHeader ? `
        <div class="header">
            <h1>${title}</h1>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
            <div class="meta">Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
        </div>
        ` : ''}
        
        <div class="content">
            ${htmlContent}
        </div>
        
        ${showFooter ? `
        <div class="footer print-only">
            <p>This document was generated automatically • ${new Date().toLocaleDateString()}</p>
        </div>
        ` : ''}
    </div>
    
    <script>
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
                // Close window after printing (with delay to ensure print dialog appears)
                setTimeout(function() {
                    window.close();
                }, 1000);
            }, 500);
        };
        
        // Handle print dialog cancel
        window.onafterprint = function() {
            window.close();
        };
    </script>
</body>
</html>`

  try {
    printWindow.document.write(printHTML)
    printWindow.document.close()
  } catch (error) {
    printWindow.close()
    throw new Error('Failed to generate PDF content')
  }
}

/**
 * Create enhanced print HTML structure with beautiful styling
 */
export const createEnhancedPrintHTML = (
  content: string, 
  title: string = 'Document',
  subtitle?: string
): string => {
  return `
<div class="card no-break">
    <div class="card-header">
        <div class="card-title">${title}</div>
        ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}
    </div>
    ${content}
</div>`
}
