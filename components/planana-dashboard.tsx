"use client"

import { useState, useEffect } from "react"
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
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

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

interface PlananaProps {
  user: SupabaseUser
}

export default function PlananaApp({ user }: PlananaProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showCelebration, setShowCelebration] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "personal",
    due_date: "",
    due_time: "",
  })

  // Load tasks from Supabase
  useEffect(() => {
    fetchTasks()
  }, [])

  // Check for celebrations when tasks change
  useEffect(() => {
    checkForCelebration()
  }, [tasks, selectedCategory])

  const fetchTasks = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  const checkForCelebration = () => {
    const today = new Date().toISOString().split("T")[0]
    const todayTasks = tasks.filter((task) => task.due_date === today)
    const categoryTasks =
      selectedCategory === "all" ? todayTasks : todayTasks.filter((task) => task.category === selectedCategory)

    if (categoryTasks.length > 0 && categoryTasks.every((task) => task.completed)) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 3000)
      toast({
        title: "🎉 All Done!",
        description: `All ${selectedCategory === "all" ? "tasks" : categories.find((c) => c.value === selectedCategory)?.label} are done!`,
      })
    }
  }

  const addTask = async () => {
    if (!newTask.title.trim()) return

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
        setTasks([data[0], ...tasks])
        setNewTask({
          title: "",
          description: "",
          category: "personal",
          due_date: "",
          due_time: "",
        })
        setIsAddDialogOpen(false)
        toast({
          title: "Task added!",
          description: "New task is successfully added to your list.",
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
      toast({
        title: "Task updated!",
        description: "Task changes are succcessfully saved.",
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
      toast({
        title: "Task deleted!",
        description: "Task is successfully deleted from your list.",
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

      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
    } catch (error: any) {
      toast({
        title: "Failed updating task status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const getFilteredTasks = () => {
    return selectedCategory === "all" ? tasks : tasks.filter((task) => task.category === selectedCategory)
  }

  const getTodayProgress = () => {
    const today = new Date().toISOString().split("T")[0]
    const todayTasks = tasks.filter((task) => task.due_date === today)
    const completedTasks = todayTasks.filter((task) => task.completed)
    return todayTasks.length > 0 ? (completedTasks.length / todayTasks.length) * 100 : 0
  }

  const getCategoryProgress = (category: string) => {
    const categoryTasks = tasks.filter((task) => task.category === category)
    const completedTasks = categoryTasks.filter((task) => task.completed)
    return categoryTasks.length > 0 ? (completedTasks.length / categoryTasks.length) * 100 : 0
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍌</div>
          <div className="text-lg font-medium text-gray-600">Loading Planana...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <span className="text-yellow-500">🍌</span>
              Planana
            </h1>
            <p className="text-gray-600">Managing tasks made easy and efficient</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <UserIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user.user_metadata?.full_name || user.email}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Progress Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Kemajuan Keseluruhan</span>
                  <span className="text-sm text-gray-500">{Math.round(getTodayProgress())}%</span>
                </div>
                <Progress value={getTodayProgress()} className="h-3" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categories.map((category) => (
                  <div key={category.value} className="text-center">
                    <div className={`w-4 h-4 rounded-full ${category.color} mx-auto mb-1`}></div>
                    <div className="text-xs font-medium">{category.label}</div>
                    <div className="text-xs text-gray-500">{Math.round(getCategoryProgress(category.value))}%</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Task Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Task List</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Insert task title..."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Description (opsional)..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={newTask.category}
                    onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                  >
                    <SelectTrigger>
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
                    <Label htmlFor="due_date">Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_time">Time</Label>
                    <Input
                      id="due_time"
                      type="time"
                      value={newTask.due_time}
                      onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={addTask} className="w-full">
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="all">Semua</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value}>
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
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Circle className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks yet</h3>
                    <p className="text-gray-500">Add your first task to start!</p>
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
                      className={`transition-all duration-200 hover:shadow-md ${
                        task.completed ? "opacity-75 bg-gray-50" : ""
                      } ${isOverdue(task.due_date, task.due_time) && !task.completed ? "border-red-200 bg-red-50" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskCompletion(task.id)}
                            className="p-0 h-auto"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </Button>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-800"}`}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className={`text-sm mt-1 ${task.completed ? "text-gray-400" : "text-gray-600"}`}>
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                <div
                                  className={`w-2 h-2 rounded-full mr-1 ${categories.find((c) => c.value === task.category)?.color}`}
                                ></div>
                                {categories.find((c) => c.value === task.category)?.label}
                              </Badge>

                              {task.due_date && (
                                <div
                                  className={`flex items-center gap-1 text-xs ${
                                    isOverdue(task.due_date, task.due_time) && !task.completed
                                      ? "text-red-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.due_date)}
                                  {task.due_time && ` ${task.due_time}`}
                                </div>
                              )}

                              {isOverdue(task.due_date, task.due_time) && !task.completed && (
                                <Badge variant="destructive" className="text-xs">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Terlambat
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}>
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit Task</DialogTitle>
                                </DialogHeader>
                                {editingTask && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="edit-title">Task Title</Label>
                                      <Input
                                        id="edit-title"
                                        value={editingTask.title}
                                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-description">Description</Label>
                                      <Textarea
                                        id="edit-description"
                                        value={editingTask.description || ""}
                                        onChange={(e) =>
                                          setEditingTask({ ...editingTask, description: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-category">Category</Label>
                                      <Select
                                        value={editingTask.category}
                                        onValueChange={(value) => setEditingTask({ ...editingTask, category: value })}
                                      >
                                        <SelectTrigger>
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
                                        <Label htmlFor="edit-due_date">Date</Label>
                                        <Input
                                          id="edit-due_date"
                                          type="date"
                                          value={editingTask.due_date || ""}
                                          onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="edit-due_time">Time</Label>
                                        <Input
                                          id="edit-due_time"
                                          type="time"
                                          value={editingTask.due_time || ""}
                                          onChange={(e) => setEditingTask({ ...editingTask, due_time: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <Button onClick={() => updateTask(editingTask)} className="w-full">
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
                              className="text-red-500 hover:text-red-700"
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

        {/* Celebration Animation */}
        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-center animate-bounce">
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold text-yellow-600 bg-white px-6 py-3 rounded-full shadow-lg">
                <Sparkles className="w-6 h-6 inline mr-2" />
                All Done!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
