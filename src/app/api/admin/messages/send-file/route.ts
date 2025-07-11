import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const recipientId = formData.get('recipientId') as string
    const recipientType = formData.get('recipientType') as string
    const subject = formData.get('subject') as string

    if (!file || !recipientId || !recipientType || !subject) {
      return NextResponse.json(
        { error: 'File, recipient ID, type, and subject are required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'messages')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name
    // const extension = originalName.split('.').pop() // Commented out as unused
    const filename = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Get recipient info
    let recipientName = 'Unknown'
    let recipientEmail = recipientId

    if (recipientType === 'admin') {
      const recipient = await prisma.admin.findFirst({
        where: { email: recipientId }
      })
      if (recipient) {
        recipientName = recipient.name
        recipientEmail = recipient.email
      }
    } else {
      const recipient = await prisma.user.findFirst({
        where: { email: recipientId }
      })
      if (recipient) {
        recipientName = recipient.name
        recipientEmail = recipient.email
      }
    }

    // Create message with file attachment
    const message = await prisma.message.create({
      data: {
        subject,
        content: `📎 File attachment: ${originalName}`,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        recipientEmail,
        recipientName,
        senderType: currentUser.type,
        recipientType,
        status: 'sent',
        sentAt: new Date(),
        // Store file info in a JSON field if your schema supports it
        // fileAttachment: {
        //   originalName,
        //   filename,
        //   size: file.size,
        //   type: file.type,
        //   url: `/uploads/messages/${filename}`
        // }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'File sent successfully',
      messageId: message.id,
      fileUrl: `/uploads/messages/${filename}`
    })

  } catch (error) {
    console.error('Error sending file:', error)
    return NextResponse.json(
      { error: 'Failed to send file' },
      { status: 500 }
    )
  }
}
