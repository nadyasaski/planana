"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  due_date: string | null
  due_time: string | null
  completed: boolean
  created_at: string
}

interface CalendarViewProps {
  tasks: Task[]
  categories: Array<{ value: string; label: string; color: string }>
  onToggleTask: (taskId: string) => void
}

export default function CalendarView({ tasks, categories, onToggleTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getTasksForDate = (date: Date | null) => {
    if (!date) return []
    // Fix timezone issue by using local date string
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateString = `${year}-${month}-${day}`

    return tasks.filter((task) => task.due_date === dateString)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const handleDateClick = (date: Date | null) => {
    if (!date) return
    const dayTasks = getTasksForDate(date)
    if (dayTasks.length > 0) {
      setSelectedDate(date)
      setShowTaskModal(true)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : []

  return (
    <>
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xl font-bold">🍌 Kalender Tugas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-xl min-w-[180px] text-center bg-white/20 px-4 py-2 rounded-lg">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-bold text-orange-800 bg-yellow-100 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const dayTasks = getTasksForDate(date)
              const completedTasks = dayTasks.filter((task) => task.completed)

              return (
                <div
                  key={index}
                  className={`min-h-[90px] p-2 border-2 rounded-xl transition-all duration-200 ${
                    date
                      ? "bg-white hover:bg-yellow-50 cursor-pointer hover:shadow-md hover:scale-105"
                      : "bg-gray-50 border-gray-200"
                  } ${isToday(date) ? "ring-4 ring-yellow-400 bg-yellow-100 shadow-lg" : "border-yellow-200"} ${
                    dayTasks.length > 0 ? "hover:shadow-lg border-orange-300" : ""
                  }`}
                  onClick={() => handleDateClick(date)}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-bold mb-2 ${isToday(date) ? "text-orange-600" : "text-gray-700"}`}>
                        {date.getDate()}
                        {isToday(date) && <span className="ml-1">🍌</span>}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded-lg truncate font-medium ${
                              task.completed
                                ? "bg-green-100 text-green-800 line-through"
                                : "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800"
                            }`}
                            title={task.title}
                          >
                            <div
                              className={`w-2 h-2 rounded-full inline-block mr-1 ${
                                categories.find((c) => c.value === task.category)?.color || "bg-gray-400"
                              }`}
                            ></div>
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-orange-600 text-center font-medium bg-yellow-100 rounded-lg py-1">
                            +{dayTasks.length - 2} lagi
                          </div>
                        )}
                        {dayTasks.length > 0 && (
                          <div className="text-xs text-center mt-2">
                            <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">
                              {completedTasks.length}/{dayTasks.length}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task Detail Modal - Fixed: Only one close button */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-800">
              <span className="text-2xl">🍌</span>
              <div>
                <div className="font-bold text-lg">Tugas Hari Ini</div>
                <div className="text-sm font-normal text-orange-600">{selectedDate && formatDate(selectedDate)}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDateTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                  task.completed
                    ? "bg-green-50 border-green-200 opacity-75"
                    : "bg-white border-yellow-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleTask(task.id)}
                    className="p-0 h-auto mt-1 hover:scale-110 transition-transform"
                  >
                    {task.completed ? (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-orange-300 rounded-full hover:border-orange-500"></div>
                    )}
                  </Button>
                  <div className="flex-1">
                    <h4 className={`font-bold ${task.completed ? "line-through text-gray-500" : "text-gray-800"}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className={`text-sm mt-1 ${task.completed ? "text-gray-400" : "text-gray-600"}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gradient-to-r from-yellow-200 to-orange-200 text-orange-800"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-1 ${
                            categories.find((c) => c.value === task.category)?.color
                          }`}
                        ></div>
                        {categories.find((c) => c.value === task.category)?.label}
                      </Badge>
                      {task.due_time && (
                        <span className="text-xs text-orange-600 font-medium bg-yellow-100 px-2 py-1 rounded-full">
                          🕐 {task.due_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
