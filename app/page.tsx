"use client"

import { useEffect, useState } from "react"
import {
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  Bell,
  Trophy,
  Sparkles,
  LogOut,
  UserIcon,
  CalendarDays,
  List,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { supabase } from "@/lib/supabase"
import { EmailNotificationManager } from "@/lib/email-notifications"
import AuthForm from "@/components/auth/auth-form"
import CalendarView from "@/components/calendar-view"

interface User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}

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

const categories = [
  { value: "work", label: "Work", color: "bg-blue-500" },
  { value: "personal", label: "Personal", color: "bg-green-500" },
  { value: "health", label: "Health", color: "bg-red-500" },
  { value: "learning", label: "Learning", color: "bg-purple-500" },
  { value: "shopping", label: "Shopping", color: "bg-orange-500" },
]

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showCelebration, setShowCelebration] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "personal",
    due_date: "",
    due_time: "",
  })

  const emailNotificationManager = EmailNotificationManager.getInstance()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTasks()
      if (emailNotificationsEnabled) {
        toast({
          title: "📧 Email notifications active!",
          description: "You received a reminder email 30 minutes before your task due.",
        })
      }
    }
  }, [user])

  useEffect(() => {
    if (tasks.length > 0) {
      checkForCelebration()
      scheduleEmailNotifications()
    }
  }, [tasks, selectedCategory])

  const scheduleEmailNotifications = () => {
    if (!emailNotificationsEnabled || !user) return

    tasks.forEach((task) => {
      if (!task.completed && task.due_date && task.due_time) {
        emailNotificationManager.scheduleTaskEmailNotification(
          task.id,
          task.title,
          task.due_date,
          task.due_time,
          user.email,
        )
      }
    })
  }

  const fetchTasks = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error: any) {
      toast({
        title: "Failed loading task",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const checkForCelebration = () => {
    const relevantTasks = getRelevantTasks()
    const categoryTasks =
      selectedCategory === "all" ? relevantTasks : relevantTasks.filter((task) => task.category === selectedCategory)

    if (categoryTasks.length > 0 && categoryTasks.every((task) => task.completed)) {
      if (!showCelebration) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
        toast({
          title: "🎉 Selamat!",
          description: `All ${selectedCategory === "of your" ? "tasks" : categories.find((c) => c.value === selectedCategory)?.label} tasks are done!`,
        })
      }
    }
  }

  // Get tasks that are relevant for "today" - includes overdue tasks but excludes future tasks
  const getRelevantTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => {
      if (!task.due_date) return false
      // Include tasks due today or overdue (before today)
      return task.due_date <= today
    })
  }

  const addTask = async () => {
    if (!newTask.title.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            user_id: user.id,
            title: newTask.title,
            description: newTask.description || null,
            category: newTask.category,
            due_date: newTask.due_date || null,
            due_time: newTask.due_time || null,
            completed: false,
          },
        ])
        .select()

      if (error) throw error

      if (data) {
        const newTaskData = data[0]
        setTasks([newTaskData, ...tasks])

        // Schedule email notification for new task
        if (emailNotificationsEnabled && newTaskData.due_date && newTaskData.due_time) {
          emailNotificationManager.scheduleTaskEmailNotification(
            newTaskData.id,
            newTaskData.title,
            newTaskData.due_date,
            newTaskData.due_time,
            user.email,
          )
        }

        setNewTask({
          title: "",
          description: "",
          category: "personal",
          due_date: "",
          due_time: "",
        })
        setIsAddDialogOpen(false)
        toast({
          title: "🍌 Task Added!",
          description: "New task is added to your list.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Failed adding task",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const updateTask = async (updatedTask: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          category: updatedTask.category,
          due_date: updatedTask.due_date,
          due_time: updatedTask.due_time,
          completed: updatedTask.completed,
        })
        .eq("id", updatedTask.id)

      if (error) throw error

      setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
      setEditingTask(null)

      // Update email notification
      if (emailNotificationsEnabled && user) {
        if (updatedTask.completed || !updatedTask.due_date || !updatedTask.due_time) {
          emailNotificationManager.clearNotification(updatedTask.id)
        } else {
          emailNotificationManager.scheduleTaskEmailNotification(
            updatedTask.id,
            updatedTask.title,
            updatedTask.due_date,
            updatedTask.due_time,
            user.email,
          )
        }
      }

      toast({
        title: "✅ Task updated!",
        description: "Task changes are saved.",
      })
    } catch (error: any) {
      toast({
        title: "Failed updating task",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (error) throw error

      setTasks(tasks.filter((task) => task.id !== taskId))
      emailNotificationManager.clearNotification(taskId)

      toast({
        title: "🗑️ Task deleted!",
        description: "Task successfully deleted from your list.",
      })
    } catch (error: any) {
      toast({
        title: "Failed deleting task",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const { error } = await supabase.from("tasks").update({ completed: !task.completed }).eq("id", taskId)

      if (error) throw error

      const updatedTask = { ...task, completed: !task.completed }
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)))

      // Update email notification
      if (emailNotificationsEnabled && user) {
        if (updatedTask.completed) {
          emailNotificationManager.clearNotification(taskId)
        } else if (updatedTask.due_date && updatedTask.due_time) {
          emailNotificationManager.scheduleTaskEmailNotification(
            updatedTask.id,
            updatedTask.title,
            updatedTask.due_date,
            updatedTask.due_time,
            user.email,
          )
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed updating task status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    emailNotificationManager.clearAllNotifications()
    await supabase.auth.signOut()
  }

  const getFilteredTasks = () => {
    const relevantTasks = getRelevantTasks()
    return selectedCategory === "all"
      ? relevantTasks
      : relevantTasks.filter((task) => task.category === selectedCategory)
  }

  const getTodayProgress = () => {
    const relevantTasks = getRelevantTasks()
    const completedTasks = relevantTasks.filter((task) => task.completed)
    return {
      completed: completedTasks.length,
      total: relevantTasks.length,
      percentage: relevantTasks.length > 0 ? (completedTasks.length / relevantTasks.length) * 100 : 0,
    }
  }

  const getCategoryProgress = (category: string) => {
    const categoryTasks = tasks.filter((task) => task.category === category)
    const completedTasks = categoryTasks.filter((task) => task.completed)
    return {
      completed: completedTasks.length,
      total: categoryTasks.length,
      percentage: categoryTasks.length > 0 ? (completedTasks.length / categoryTasks.length) * 100 : 0,
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString + "T00:00:00") // Fix timezone issue
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const isOverdue = (dueDate: string | null, dueTime: string | null) => {
    if (!dueDate) return false
    const now = new Date()
    const taskDate = new Date(`${dueDate}T${dueTime || "23:59"}`)
    return taskDate < now
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-yellow-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍌</div>
          <div className="text-xl font-bold text-orange-800 animate-pulse">Memuat Planana...</div>
          <div className="text-sm text-orange-600 mt-2">Rencana rapi, hati happy</div>
        </div>
      </div>
    )
  }

  const todayProgress = getTodayProgress()

  return (
    <>
      {user ? (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-yellow-200 p-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="text-center flex-1">
                <h1 className="text-5xl font-bold text-orange-800 mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
                  <span className="text-6xl animate-pulse">🍌</span>
                  <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    Planana
                  </span>
                </h1>
                <p className="text-orange-700 text-lg font-medium">Rencana rapi, hati happy</p>
              </div>

              <div className="flex items-center gap-3">
                {emailNotificationsEnabled && (
                  <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-100">
                    <Mail className="h-4 w-4 mr-1" />
                    <span className="text-xs">Email ON</span>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg"
                    >
                      <UserIcon className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-bold text-orange-800">{user.user_metadata?.full_name || user.email}</p>
                        <p className="w-[200px] truncate text-sm text-orange-600">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Progress Overview */}
            <Card className="mb-6 bg-gradient-to-br from-white to-yellow-50 border-yellow-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Trophy className="w-6 h-6" />
                  <span> Tasks Due Today </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-orange-800">Progress Bar</span>
                      <span className="text-lg font-bold text-orange-600 bg-yellow-100 px-3 py-1 rounded-full">
                        {todayProgress.completed}/{todayProgress.total} ({Math.round(todayProgress.percentage)}%)
                      </span>
                    </div>
                    <Progress value={todayProgress.percentage} className="h-4 bg-yellow-200" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {categories.map((category) => {
                      const progress = getCategoryProgress(category.value)
                      return (
                        <div
                          key={category.value}
                          className="text-center bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className={`w-6 h-6 rounded-full ${category.color} mx-auto mb-2 shadow-md`}></div>
                          <div className="text-sm font-bold text-gray-800">{category.label}</div>
                          <div className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full mt-1">
                            {progress.completed}/{progress.total}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Toggle */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-orange-800 flex items-center gap-2">
                <span>{viewMode === "list" ? "📝" : "📅"}</span>
                {viewMode === "list" ? "Task List" : "Task Calendar"}
              </h2>
              <div className="flex gap-3">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setViewMode("list")}
                  className={
                    viewMode === "list"
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
                      : "border-yellow-400 text-orange-700 hover:bg-yellow-100"
                  }
                >
                  <List className="w-5 h-5 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setViewMode("calendar")}
                  className={
                    viewMode === "calendar"
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
                      : "border-yellow-400 text-orange-700 hover:bg-yellow-100"
                  }
                >
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Calendar
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      <span className="font-bold">Add Task</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
{/*                         <span className="text-2xl">🍌</span> */}
                        Add New Task
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-orange-800 font-medium">
                          Task Title
                        </Label>
                        <Input
                          id="title"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="Insert task title..."
                          className="border-yellow-300 focus:border-orange-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-orange-800 font-medium">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Description (opsional)..."
                          className="border-yellow-300 focus:border-orange-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-orange-800 font-medium">
                          Category
                        </Label>
                        <Select
                          value={newTask.category}
                          onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                        >
                          <SelectTrigger className="border-yellow-300 focus:border-orange-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                  {category.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="due_date" className="text-orange-800 font-medium">
                            Date
                          </Label>
                          <Input
                            id="due_date"
                            type="date"
                            value={newTask.due_date}
                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                            className="border-yellow-300 focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="due_time" className="text-orange-800 font-medium">
                            Time
                          </Label>
                          <Input
                            id="due_time"
                            type="time"
                            value={newTask.due_time}
                            onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                            className="border-yellow-300 focus:border-orange-400"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={addTask}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {viewMode === "calendar" ? (
              <CalendarView tasks={tasks} categories={categories} onToggleTask={toggleTaskCompletion} />
            ) : (
              <>
                {/* Category Filter */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
                  <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-white border-yellow-300 shadow-lg">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-400 data-[state=active]:text-white font-medium"
                    >
                      Semua
                    </TabsTrigger>
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category.value}
                        value={category.value}
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-400 data-[state=active]:text-white font-medium"
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${category.color}`}></div>
                          <span className="hidden sm:inline">{category.label}</span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={selectedCategory} className="mt-6">
                    <div className="grid gap-4">
                      {getFilteredTasks().length === 0 ? (
                        <Card className="bg-gradient-to-br from-white to-yellow-50 border-yellow-200 shadow-lg">
                          <CardContent className="text-center py-16">
                            <div className="text-yellow-400 mb-6">
                              <Circle className="w-20 h-20 mx-auto" />
                            </div>
                            <h3 className="text-2xl font-bold text-orange-800 mb-3">No tasks yet 🍌</h3>
                            <p className="text-orange-600 text-lg">Add your first task to start!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        getFilteredTasks()
                          .sort((a, b) => {
                            if (a.completed !== b.completed) {
                              return a.completed ? 1 : -1
                            }
                            return new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime()
                          })
                          .map((task) => (
                            <Card
                              key={task.id}
                              className={`transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 ${
                                task.completed
                                  ? "opacity-75 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                                  : "bg-gradient-to-r from-white to-yellow-50 border-yellow-200"
                              } ${
                                isOverdue(task.due_date, task.due_time) && !task.completed
                                  ? "border-red-300 bg-gradient-to-r from-red-50 to-pink-50 shadow-red-200"
                                  : ""
                              }`}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleTaskCompletion(task.id)}
                                    className="p-0 h-auto hover:scale-110 transition-transform"
                                  >
                                    {task.completed ? (
                                      <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-md" />
                                    ) : (
                                      <Circle className="w-6 h-6 text-orange-400 hover:text-orange-600" />
                                    )}
                                  </Button>

                                  <div className="flex-1 min-w-0">
                                    <h3
                                      className={`font-bold text-lg ${
                                        task.completed ? "line-through text-gray-500" : "text-gray-800"
                                      }`}
                                    >
                                      {task.title}
                                    </h3>
                                    {task.description && (
                                      <p
                                        className={`text-sm mt-2 ${task.completed ? "text-gray-400" : "text-gray-600"}`}
                                      >
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-3 mt-3">
                                      <Badge
                                        variant="secondary"
                                        className="text-sm bg-gradient-to-r from-yellow-200 to-orange-200 text-orange-800 font-medium"
                                      >
                                        <div
                                          className={`w-2 h-2 rounded-full mr-2 ${
                                            categories.find((c) => c.value === task.category)?.color
                                          }`}
                                        ></div>
                                        {categories.find((c) => c.value === task.category)?.label}
                                      </Badge>

                                      {task.due_date && (
                                        <div
                                          className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
                                            isOverdue(task.due_date, task.due_time) && !task.completed
                                              ? "text-red-700 bg-red-100"
                                              : "text-orange-700 bg-yellow-100"
                                          }`}
                                        >
                                          <Calendar className="w-4 h-4" />
                                          {formatDate(task.due_date)}
                                          {task.due_time && ` ${task.due_time}`}
                                        </div>
                                      )}

                                      {isOverdue(task.due_date, task.due_time) && !task.completed && (
                                        <Badge variant="destructive" className="text-sm font-bold animate-pulse">
                                          <Bell className="w-3 h-3 mr-1" />
                                          You're Late!
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingTask(task)}
                                          className="hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300">
                                        <DialogHeader>
                                          <DialogTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
                                            <span className="text-2xl">✏️</span>
                                            Edit Task
                                          </DialogTitle>
                                        </DialogHeader>
                                        {editingTask && (
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="edit-title" className="text-orange-800 font-medium">
                                                Task Title
                                              </Label>
                                              <Input
                                                id="edit-title"
                                                value={editingTask.title}
                                                onChange={(e) =>
                                                  setEditingTask({ ...editingTask, title: e.target.value })
                                                }
                                                className="border-yellow-300 focus:border-orange-400"
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="edit-description" className="text-orange-800 font-medium">
                                                Deskripsi
                                              </Label>
                                              <Textarea
                                                id="edit-description"
                                                value={editingTask.description || ""}
                                                onChange={(e) =>
                                                  setEditingTask({ ...editingTask, description: e.target.value })
                                                }
                                                className="border-yellow-300 focus:border-orange-400"
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="edit-category" className="text-orange-800 font-medium">
                                                Kategori
                                              </Label>
                                              <Select
                                                value={editingTask.category}
                                                onValueChange={(value) =>
                                                  setEditingTask({ ...editingTask, category: value })
                                                }
                                              >
                                                <SelectTrigger className="border-yellow-300 focus:border-orange-400">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {categories.map((category) => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                      <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                                        {category.label}
                                                      </div>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label htmlFor="edit-due_date" className="text-orange-800 font-medium">
                                                  Date
                                                </Label>
                                                <Input
                                                  id="edit-due_date"
                                                  type="date"
                                                  value={editingTask.due_date || ""}
                                                  onChange={(e) =>
                                                    setEditingTask({ ...editingTask, due_date: e.target.value })
                                                  }
                                                  className="border-yellow-300 focus:border-orange-400"
                                                />
                                              </div>
                                              <div>
                                                <Label htmlFor="edit-due_time" className="text-orange-800 font-medium">
                                                  Time
                                                </Label>
                                                <Input
                                                  id="edit-due_time"
                                                  type="time"
                                                  value={editingTask.due_time || ""}
                                                  onChange={(e) =>
                                                    setEditingTask({ ...editingTask, due_time: e.target.value })
                                                  }
                                                  className="border-yellow-300 focus:border-orange-400"
                                                />
                                              </div>
                                            </div>
                                            <Button
                                              onClick={() => updateTask(editingTask)}
                                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 shadow-lg"
                                            >
                                              <Edit3 className="w-4 h-4 mr-2" />
                                              Save Changes
                                            </Button>
                                          </div>
                                        )}
                                      </DialogContent>
                                    </Dialog>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteTask(task.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {/* Celebration Animation */}
            {showCelebration && (
              <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                <div className="text-center animate-bounce">
                  <div className="text-8xl mb-6 animate-spin">🎉</div>
                  <div className="text-3xl font-bold text-yellow-600 bg-gradient-to-r from-white to-yellow-100 px-8 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400">
                    <Sparkles className="w-8 h-8 inline mr-3" />
                    <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      All done!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AuthForm />
      )}
      <Toaster />
    </>
  )
}
