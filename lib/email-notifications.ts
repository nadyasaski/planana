export class EmailNotificationManager {
  private static instance: EmailNotificationManager
  private scheduledEmails: Map<string, number> = new Map()

  static getInstance(): EmailNotificationManager {
    if (!EmailNotificationManager.instance) {
      EmailNotificationManager.instance = new EmailNotificationManager()
    }
    return EmailNotificationManager.instance
  }

  scheduleTaskEmailNotification(taskId: string, title: string, dueDate: string, dueTime: string, userEmail: string) {
    // Clear existing notification for this task
    this.clearNotification(taskId)

    if (!dueDate) return

    const dueDateTimeString = `${dueDate}T${dueTime || "23:59"}:00`
    const dueDateTime = new Date(dueDateTimeString)
    const notificationTime = new Date(dueDateTime.getTime() - 30 * 60 * 1000) // 30 minutes before
    const now = new Date()

    if (notificationTime <= now) {
      return // Don't schedule notifications for past times
    }

    const timeUntilNotification = notificationTime.getTime() - now.getTime()

    const timeoutId = window.setTimeout(async () => {
      await this.sendEmailNotification(title, dueDate, dueTime, userEmail)
      this.scheduledEmails.delete(taskId)
    }, timeUntilNotification)

    this.scheduledEmails.set(taskId, timeoutId)
  }

  private async sendEmailNotification(taskTitle: string, dueDate: string, dueTime: string, userEmail: string) {
    try {
      // Format tanggal dan waktu untuk email
      const formattedDate = new Date(dueDate + "T00:00:00").toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      const emailData = {
        to: userEmail,
        subject: `🍌 Planana Reminder: "${taskTitle}" akan jatuh tempo!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #92400E; font-size: 32px; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
                🍌 Planana
              </h1>
              <p style="color: #A16207; margin: 8px 0 0 0; font-size: 16px;">Tugas rapih, hati happy</p>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1F2937; margin: 0 0 16px 0; font-size: 24px;">⏰ Pengingat Tugas</h2>
              
              <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <h3 style="color: #92400E; margin: 0 0 8px 0; font-size: 18px;">"${taskTitle}"</h3>
                <p style="color: #A16207; margin: 0; font-size: 14px;">
                  📅 Jatuh tempo: ${formattedDate}<br>
                  🕐 Waktu: ${dueTime || "23:59"}
                </p>
              </div>
              
              <p style="color: #4B5563; margin: 16px 0; line-height: 1.6;">
                Halo! Tugas Anda akan jatuh tempo dalam <strong>30 menit</strong>. 
                Jangan lupa untuk menyelesaikannya ya! 🎯
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${window.location.origin}" 
                   style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 12px 24px; 
                          border-radius: 8px; 
                          font-weight: bold;
                          display: inline-block;">
                  Buka Planana 🍌
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #A16207; font-size: 12px; margin: 0;">
                Email ini dikirim otomatis oleh Planana.<br>
                Tetap produktif dan semangat! 💪
              </p>
            </div>
          </div>
        `,
      }

      // Send email via API route
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        throw new Error("Failed to send email notification")
      }

      console.log("Email notification sent successfully")
    } catch (error) {
      console.error("Error sending email notification:", error)
    }
  }

  clearNotification(taskId: string) {
    const timeoutId = this.scheduledEmails.get(taskId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.scheduledEmails.delete(taskId)
    }
  }

  clearAllNotifications() {
    this.scheduledEmails.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.scheduledEmails.clear()
  }
}
