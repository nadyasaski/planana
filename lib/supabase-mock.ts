// Mock Supabase untuk preview - ganti dengan supabase.ts yang asli saat deploy
interface MockUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}

interface MockSession {
  user: MockUser
}

interface MockAuthResponse {
  data: {
    user: MockUser | null
    session: MockSession | null
  }
  error: Error | null
}

class MockSupabaseAuth {
  private currentUser: MockUser | null = null
  private listeners: ((event: string, session: MockSession | null) => void)[] = []

  async signUp({ email, password, options }: any): Promise<MockAuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create consistent user ID based on email
    const userId = btoa(email)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 16)

    const user: MockUser = {
      id: userId,
      email,
      user_metadata: {
        full_name: options?.data?.full_name || email.split("@")[0],
      },
    }

    this.currentUser = user
    const session = { user }

    localStorage.setItem("mock-supabase-user", JSON.stringify(user))
    this.listeners.forEach((listener) => listener("SIGNED_IN", session))

    return {
      data: { user, session },
      error: null,
    }
  }

  async signInWithPassword({ email, password }: any): Promise<MockAuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Use same consistent user ID
    const userId = btoa(email)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 16)

    const user: MockUser = {
      id: userId,
      email,
      user_metadata: {
        full_name: email.split("@")[0],
      },
    }

    this.currentUser = user
    const session = { user }

    localStorage.setItem("mock-supabase-user", JSON.stringify(user))
    this.listeners.forEach((listener) => listener("SIGNED_IN", session))

    return {
      data: { user, session },
      error: null,
    }
  }

  async signInWithOAuth({ provider }: any): Promise<MockAuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const email = `user@${provider}.com`
    const userId = btoa(email)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 16)

    const user: MockUser = {
      id: userId,
      email,
      user_metadata: {
        full_name: `${provider} User`,
      },
    }

    this.currentUser = user
    const session = { user }

    localStorage.setItem("mock-supabase-user", JSON.stringify(user))
    this.listeners.forEach((listener) => listener("SIGNED_IN", session))

    return {
      data: { user, session },
      error: null,
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    this.currentUser = null
    localStorage.removeItem("mock-supabase-user")
    this.listeners.forEach((listener) => listener("SIGNED_OUT", null))

    return { error: null }
  }

  async getSession(): Promise<{ data: { session: MockSession | null } }> {
    const savedUser = localStorage.getItem("mock-supabase-user")
    if (savedUser) {
      const user = JSON.parse(savedUser)
      this.currentUser = user
      return {
        data: { session: { user } },
      }
    }

    return {
      data: { session: null },
    }
  }

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    this.listeners.push(callback)

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.listeners.indexOf(callback)
            if (index > -1) {
              this.listeners.splice(index, 1)
            }
          },
        },
      },
    }
  }
}

class MockSupabaseDatabase {
  private getStorageKey(table: string, userId: string) {
    return `mock-supabase-${table}-${userId}`
  }

  from(table: string) {
    return {
      select: (columns = "*") => ({
        eq: (column: string, value: string) => ({
          order: (orderColumn: string, options?: any) => {
            const data = this.getData(table, value)
            if (options?.ascending === false) {
              data.reverse()
            }
            return Promise.resolve({ data, error: null })
          },
        }),
      }),

      insert: (records: any[]) => ({
        select: () => {
          const userId = records[0]?.user_id
          if (!userId) return Promise.resolve({ data: null, error: new Error("No user_id") })

          const newRecords = records.map((record) => ({
            ...record,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
          }))

          const existingData = this.getData(table, userId)
          const updatedData = [newRecords[0], ...existingData]
          this.saveData(table, userId, updatedData)

          return Promise.resolve({ data: newRecords, error: null })
        },
      }),

      update: (updates: any) => ({
        eq: (column: string, value: string) => {
          // Find user_id from existing data
          const allUsers = this.getAllUserData(table)
          let targetUserId = null
          let updatedRecord = null

          for (const [userId, userData] of Object.entries(allUsers)) {
            const data = userData as any[]
            const recordIndex = data.findIndex((item: any) => item[column] === value)
            if (recordIndex !== -1) {
              targetUserId = userId
              data[recordIndex] = { ...data[recordIndex], ...updates }
              updatedRecord = data[recordIndex]
              this.saveData(table, userId, data)
              break
            }
          }

          return Promise.resolve({ data: updatedRecord, error: null })
        },
      }),

      delete: () => ({
        eq: (column: string, value: string) => {
          const allUsers = this.getAllUserData(table)

          for (const [userId, userData] of Object.entries(allUsers)) {
            const data = userData as any[]
            const filteredData = data.filter((item: any) => item[column] !== value)
            if (filteredData.length !== data.length) {
              this.saveData(table, userId, filteredData)
              break
            }
          }

          return Promise.resolve({ error: null })
        },
      }),
    }
  }

  private getData(table: string, userId: string): any[] {
    const key = this.getStorageKey(table, userId)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  private saveData(table: string, userId: string, data: any[]): void {
    const key = this.getStorageKey(table, userId)
    localStorage.setItem(key, JSON.stringify(data))
  }

  private getAllUserData(table: string): Record<string, any[]> {
    const result: Record<string, any[]> = {}

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`mock-supabase-${table}-`)) {
        const userId = key.replace(`mock-supabase-${table}-`, "")
        const data = localStorage.getItem(key)
        if (data) {
          result[userId] = JSON.parse(data)
        }
      }
    }

    return result
  }
}

// Export mock supabase client
export const supabase = {
  auth: new MockSupabaseAuth(),
  from: (table: string) => new MockSupabaseDatabase().from(table),
}
