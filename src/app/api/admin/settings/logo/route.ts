import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { updateSetting, getSetting } from '@/lib/settings'
import { verifyToken } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Delete old logo file from filesystem
 */
async function deleteOldLogoFile(logoUrl: string | null) {
  if (!logoUrl) return

  try {
    // Extract filename from URL (e.g., "/uploads/branding/logo-123456.png" -> "logo-123456.png")
    const urlParts = logoUrl.split('/')
    const filename = urlParts[urlParts.length - 1]

    // Only delete files that match our logo naming pattern to avoid deleting other files
    if (filename && filename.startsWith('logo-')) {
      const filepath = join(process.cwd(), 'public', 'uploads', 'branding', filename)

      if (existsSync(filepath)) {
        await unlink(filepath)
        console.log(`✅ Deleted old logo file: ${filename}`)
      }
    }
  } catch (error) {
    // Log error but don't fail the upload process
    console.warn('⚠️ Failed to delete old logo file:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user and check permissions
    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission (Super Admin or Admin)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get current logo URL before uploading new one (for cleanup)
    const currentLogoUrl = await getSetting('branding', 'logoUrl', null)

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image file.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Please upload an image smaller than 5MB.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'branding')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `logo-${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Generate public URL
    const logoUrl = `/uploads/branding/${filename}`

    // Save logo URL to settings - use upsert to create if doesn't exist
    await prisma.setting.upsert({
      where: {
        category_key: {
          category: 'branding',
          key: 'logoUrl'
        }
      },
      update: {
        value: JSON.stringify(logoUrl),
        updatedAt: new Date()
      },
      create: {
        category: 'branding',
        key: 'logoUrl',
        name: 'System Logo URL',
        value: JSON.stringify(logoUrl),
        type: 'text',
        description: 'URL path to the uploaded system logo'
      }
    })

    // Delete old logo file after successfully saving the new one
    if (currentLogoUrl && currentLogoUrl !== logoUrl) {
      await deleteOldLogoFile(currentLogoUrl)
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Logo uploaded successfully',
      timestamp: Date.now(), // Add timestamp for cache invalidation
      cacheBust: true // Signal that caches should be cleared
    })

  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload logo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const logoUrl = await getSetting('branding', 'logoUrl', null)

    return NextResponse.json({
      success: true,
      logoUrl
    })
  } catch (error) {
    console.error('Error getting logo:', error)
    return NextResponse.json(
      { error: 'Failed to get logo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const currentUser = await verifyToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has permission (Super Admin or Admin)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get current logo URL
    const currentLogoUrl = await getSetting('branding', 'logoUrl', null)

    if (currentLogoUrl) {
      // Delete the file from filesystem
      await deleteOldLogoFile(currentLogoUrl)

      // Remove logo URL from settings
      await prisma.setting.deleteMany({
        where: {
          category: 'branding',
          key: 'logoUrl'
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Logo deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting logo:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete logo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
