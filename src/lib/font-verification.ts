/**
 * Font Verification Utility
 * Ensures Apercu Pro fonts are loaded and available
 */

export interface FontStatus {
  loaded: boolean
  family: string
  weight: string
  error?: string
}

export class FontVerifier {
  private static instance: FontVerifier
  private fontStatuses: Map<string, FontStatus> = new Map()
  private loadingPromises: Map<string, Promise<FontStatus>> = new Map()

  static getInstance(): FontVerifier {
    if (!FontVerifier.instance) {
      FontVerifier.instance = new FontVerifier()
    }
    return FontVerifier.instance
  }

  /**
   * Verify if a specific Apercu Pro font is loaded
   */
  async verifyFont(family: string = 'Apercu Pro', weight: string = '400'): Promise<FontStatus> {
    const key = `${family}-${weight}`
    
    // Return cached result if available
    if (this.fontStatuses.has(key)) {
      return this.fontStatuses.get(key)!
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!
    }

    // Create new loading promise
    const loadingPromise = this.loadFont(family, weight)
    this.loadingPromises.set(key, loadingPromise)

    try {
      const result = await loadingPromise
      this.fontStatuses.set(key, result)
      this.loadingPromises.delete(key)
      return result
    } catch (error) {
      this.loadingPromises.delete(key)
      throw error
    }
  }

  /**
   * Load and verify a font
   */
  private async loadFont(family: string, weight: string): Promise<FontStatus> {
    try {
      // Check if FontFace API is supported
      if (!('fonts' in document)) {
        return {
          loaded: false,
          family,
          weight,
          error: 'FontFace API not supported'
        }
      }

      // Check if font is already loaded
      const isLoaded = document.fonts.check(`${weight} 16px "${family}"`)
      if (isLoaded) {
        return {
          loaded: true,
          family,
          weight
        }
      }

      // Wait for fonts to be ready
      await document.fonts.ready

      // Check again after fonts are ready
      const isLoadedAfterReady = document.fonts.check(`${weight} 16px "${family}"`)
      
      return {
        loaded: isLoadedAfterReady,
        family,
        weight,
        error: isLoadedAfterReady ? undefined : 'Font not found after loading'
      }
    } catch (error) {
      return {
        loaded: false,
        family,
        weight,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify all Apercu Pro font weights
   */
  async verifyAllApercuFonts(): Promise<FontStatus[]> {
    const weights = ['400', '500', '700']
    const promises = weights.map(weight => this.verifyFont('Apercu Pro', weight))
    return Promise.all(promises)
  }

  /**
   * Get font loading status
   */
  getFontStatus(family: string = 'Apercu Pro', weight: string = '400'): FontStatus | null {
    const key = `${family}-${weight}`
    return this.fontStatuses.get(key) || null
  }

  /**
   * Force reload all fonts
   */
  async reloadFonts(): Promise<void> {
    this.fontStatuses.clear()
    this.loadingPromises.clear()
    
    if ('fonts' in document) {
      // Clear font cache
      document.fonts.clear()
      
      // Reload fonts
      await this.verifyAllApercuFonts()
    }
  }

  /**
   * Check if all critical Apercu fonts are loaded
   */
  areAllFontsLoaded(): boolean {
    const criticalWeights = ['400', '500', '700']
    return criticalWeights.every(weight => {
      const status = this.getFontStatus('Apercu Pro', weight)
      return status?.loaded === true
    })
  }

  /**
   * Get a summary of all font statuses
   */
  getFontSummary(): { loaded: number; total: number; details: FontStatus[] } {
    const details = Array.from(this.fontStatuses.values())
    const loaded = details.filter(status => status.loaded).length
    
    return {
      loaded,
      total: details.length,
      details
    }
  }
}

// Export singleton instance
export const fontVerifier = FontVerifier.getInstance()

// Utility functions
export const verifyApercuFonts = () => fontVerifier.verifyAllApercuFonts()
export const areApercuFontsLoaded = () => fontVerifier.areAllFontsLoaded()
export const getFontSummary = () => fontVerifier.getFontSummary()
