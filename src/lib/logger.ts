/**
 * Simple console logger - no heavy winston dependencies for better performance
 */

interface LogLevel {
  error: number
  warn: number
  info: number
  debug: number
}

const logLevels: LogLevel = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

class SimpleLogger {
  private level: number = logLevels.info

  setLevel(level: keyof LogLevel) {
    this.level = logLevels[level]
  }

  error(message: string, meta?: any) {
    if (this.level >= logLevels.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  warn(message: string, meta?: any) {
    if (this.level >= logLevels.warn) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  info(message: string, meta?: any) {
    if (this.level >= logLevels.info) {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  debug(message: string, meta?: any) {
    if (this.level >= logLevels.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  // Compatibility methods for existing code
  log(level: string, message: string, meta?: any) {
    switch (level) {
      case 'error':
        this.error(message, meta)
        break
      case 'warn':
        this.warn(message, meta)
        break
      case 'info':
        this.info(message, meta)
        break
      case 'debug':
        this.debug(message, meta)
        break
      default:
        this.info(message, meta)
    }
  }
}

// Create and export logger instance
const loggerInstance = new SimpleLogger()

// Set level based on environment
if (process.env.NODE_ENV === 'development') {
  loggerInstance.setLevel('debug')
} else {
  loggerInstance.setLevel('info')
}

export default loggerInstance

// Export constructor function for compatibility
export function Logger(name?: string) {
  return loggerInstance
}

// Export class for direct instantiation
export { SimpleLogger }

// Export the logger instance as named export
export const logger = loggerInstance

// Export compatibility functions
export const createLogger = (name?: string) => loggerInstance
