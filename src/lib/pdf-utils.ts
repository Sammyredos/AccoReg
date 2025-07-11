/**
 * PDF Generation Utilities
 * Provides client-side PDF generation using browser's print functionality
 */

export interface PDFOptions {
  title?: string
  filename?: string
  orientation?: 'portrait' | 'landscape'
  margins?: string
}

/**
 * Generate PDF from HTML content using browser's print functionality
 */
export const generatePDFFromHTML = async (
  htmlContent: string, 
  options: PDFOptions = {}
): Promise<void> => {
  const {
    title = 'Document',
    filename = 'document.pdf',
    orientation = 'portrait',
    margins = '20mm'
  } = options

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your browser\'s popup settings.')
  }

  // Enhanced HTML with print styles
  const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        @page {
            size: A4 ${orientation};
            margin: ${margins};
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .no-print {
                display: none !important;
            }
            
            .print-only {
                display: block !important;
            }
            
            table {
                page-break-inside: avoid;
            }
            
            tr {
                page-break-inside: avoid;
            }
            
            .avoid-break {
                page-break-inside: avoid;
            }
        }
        
        @media screen {
            body {
                padding: 20px;
                max-width: 210mm;
                margin: 0 auto;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            
            .print-only {
                display: none;
            }
        }
        
        /* Enhanced table styles */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        /* Header styles */
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #333;
        }
        
        .header p {
            color: #666;
            font-size: 14px;
        }
        
        /* Section styles */
        .section {
            margin-bottom: 25px;
        }
        
        .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .section h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #555;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    ${htmlContent}
    
    <div class="footer print-only">
        <p>Generated on ${new Date().toLocaleString()}</p>
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
 * Download HTML content as a file (fallback when print fails)
 */
export const downloadHTMLFile = (htmlContent: string, filename: string): void => {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate PDF with fallback to HTML download
 */
export const generatePDFWithFallback = async (
  htmlContent: string,
  options: PDFOptions = {}
): Promise<void> => {
  try {
    await generatePDFFromHTML(htmlContent, options)
  } catch (error) {
    console.warn('PDF generation failed, falling back to HTML download:', error)
    const filename = options.filename?.replace('.pdf', '.html') || 'document.html'
    downloadHTMLFile(htmlContent, filename)
    throw error // Re-throw to let caller know about the fallback
  }
}

/**
 * Create a print-optimized HTML structure
 */
export const createPrintHTML = (content: string, title: string = 'Document'): string => {
  return `
<div class="header">
    <h1>${title}</h1>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
</div>

<div class="content">
    ${content}
</div>`
}
