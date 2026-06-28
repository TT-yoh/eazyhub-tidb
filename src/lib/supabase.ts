// Mock Supabase Client for TiDB Migration

class QueryBuilder {
  private table: string
  private action: string
  private queryData: any
  private filters: any = {}
  private inFilter: any = null
  private neqFilter: any = null
  private orderConfig: any = null
  private rangeConfig: any = null
  private isSingle: boolean = false

  constructor(table: string, action: string, data?: any) {
    this.table = table
    this.action = action
    this.queryData = data
  }

  select(_columns: string = '*') {
    // Columns are currently ignored in the backend, always fetches *
    return this
  }

  insert(data: any) {
    this.action = 'insert'
    this.queryData = data
    return this
  }

  update(data: any) {
    this.action = 'update'
    this.queryData = data
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: any) {
    this.filters[column] = value
    return this
  }
  
  neq(column: string, value: any) {
    this.neqFilter = { column, value }
    return this
  }

  in(column: string, values: any[]) {
    this.inFilter = { column, values }
    return this
  }

  order(column: string, config?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: config?.ascending !== false }
    return this
  }

  range(from: number, to: number) {
    this.rangeConfig = { from, to }
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isSingle = true
    return this
  }

  upsert(data: any) {
    this.action = 'update' // fallback since API uses update
    this.queryData = data
    return this
  }

  async then(resolve: (value: any) => void) {
    try {
      const payload = {
        table: this.table,
        action: this.action,
        match: Object.keys(this.filters).length > 0 ? this.filters : undefined,
        data: this.queryData,
        inFilter: this.inFilter,
        neqFilter: this.neqFilter,
        order: this.orderConfig,
        range: this.rangeConfig,
        isSingle: this.isSingle
      }

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      resolve(result)
    } catch (error: any) {
      resolve({ data: null, error: { message: error.message } })
    }
  }
}

export const supabase = {
  from: (table: string) => {
    return new QueryBuilder(table, 'select')
  },
  auth: {
    getUser: async (): Promise<{ data: { user: any }, error: any }> => {
      // Mock auth getUser since we use Clerk now, it shouldn't be called if we cleaned it up,
      // but just in case, we return a mock user or null.
      return { data: { user: null }, error: null }
    },
    getSession: async (): Promise<any> => {
      return { data: { session: null }, error: null }
    },
    updateUser: async (): Promise<any> => {
      return { data: { user: null }, error: null }
    },
    resetPasswordForEmail: async (): Promise<any> => {
      return { data: null, error: null }
    },
    onAuthStateChange: (callback?: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  channel: (name?: string) => {
    return {
      on: (event?: any, filter?: any, callback?: any) => ({ subscribe: () => ({}) }),
      subscribe: () => ({})
    }
  },
  removeChannel: () => {},
  functions: {
    invoke: async (functionName: string, options: any) => {
      try {
        const response = await fetch(`/api/${functionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options.body)
        })
        const result = await response.json()
        return { data: result, error: null }
      } catch (error) {
        return { data: null, error }
      }
    }
  }
}

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''