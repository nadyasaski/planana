export class NotificationManager {
  private static instance: NotificationManager
  private scheduledNotifications: Map<string, number> = new Map()

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.log("Browser tidak mendukung notifikasi")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    }

    return false
  }

  scheduleTaskNotification(taskId: string, title: string, dueDate: string, dueTime: string) {
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

    const timeoutId = window.setTimeout(() => {
      this.showNotification(title, `Tugas "${title}" akan jatuh tempo dalam 30 menit!`)
      this.scheduledNotifications.delete(taskId)
    }, timeUntilNotification)

    this.scheduledNotifications.set(taskId, timeoutId)
  }

  clearNotification(taskId: string) {
    const timeoutId = this.scheduledNotifications.get(taskId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.scheduledNotifications.delete(taskId)
    }
  }

  private showNotification(title: string, body: string) {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "planana-task-reminder",
      })
    }
  }

  clearAllNotifications() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.scheduledNotifications.clear()
  }
}
