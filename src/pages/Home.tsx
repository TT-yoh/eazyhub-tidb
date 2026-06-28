import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

interface Product {
  id: string
  "Item No": string
  "Name": string
  "Unit": string
  "Excl VAT": number
  "Incl VAT": number
  stock: number
  company: number 
  Company?: number // Added for strict-type safety fallback
  company_id?: number // Added for strict-type safety fallback
  image_url?: string
  created_at?: string
}

export default function Home() {
  // ⭐ MEMORY ENGINE STATES
  const [rawDatabase, setRawDatabase] = useState<Product[]>([])
  const [masterCatalog, setMasterCatalog] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pageSize = 30

  // ========================================================
  // ⭐ DEEP FETCH ENGINE: Fetches entire catalog from TiDB
  // ========================================================
  const fetchEntireCatalog = async () => {
    const res = await fetch('/api/products?is_active=true')
    if (!res.ok) throw new Error('Failed to fetch products')
    const data = await res.json()
    return data
  }

  // ========================================================
  // ⚡ STEP 1: LOAD ENTIRE DATABASE INTO MEMORY ONCE
  // ========================================================
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true)
      try {
        const fullDatabase = await fetchEntireCatalog()
        setRawDatabase(fullDatabase)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
        setInitialLoad(false)
      }
    }

    fetchAllProducts()
  }, [])

  // ========================================================
  // ⚡ STEP 2: APPLY FILTERS, INSTANT SEARCH, AND SHUFFLE
  // ========================================================
  useEffect(() => {
    if (rawDatabase.length === 0) return

    let filtered = [...rawDatabase]

    // A. Brand Filtering (Bulletproof Company ID Matcher)
    if (companyFilter !== 'all') {
      filtered = filtered.filter(p => String(p.company || p.Company || p.company_id || 1) === companyFilter)
    }

    // B. Instant Memory Search
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(p => {
        const title = (p.Name || '').toLowerCase()
        const sku = (p["Item No"] || '').toLowerCase()
        return title.includes(searchLower) || sku.includes(searchLower)
      })
    }

    // C. Haphazard Shuffle Logic
    if (companyFilter === 'all' && search.trim() === '') {
      // Shuffle randomly if viewing all brands with no search query
      filtered = filtered.sort(() => Math.random() - 0.5)
    } else {
      // Sort by newest if searching or viewing a specific brand
      filtered = filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }

    setMasterCatalog(filtered)
    setPage(0)
    setProducts(filtered.slice(0, pageSize))
    setHasMore(filtered.length > pageSize)

  }, [rawDatabase, companyFilter, search])

  // ========================================================
  // ⚡ STEP 3: HIGH-SPEED MEMORY PAGINATION (SCROLLING)
  // ========================================================
  const loadMore = useCallback(() => {
    if (!hasMore) return
    const nextPage = page + 1
    const nextProducts = masterCatalog.slice(0, (nextPage + 1) * pageSize)
    
    setProducts(nextProducts)
    setPage(nextPage)
    setHasMore(masterCatalog.length > nextProducts.length)
  }, [page, masterCatalog, hasMore])

  const lastProductRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !initialLoad) {
        loadMore()
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, initialLoad, loadMore])

  return (
    <div className="px-1 pb-12">
      {/* Search Input Sticky Container */}
      <div className="sticky top-[57px] bg-white z-20 pb-3 pt-1 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full text-base border border-gray-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Pill Filter Navigation Row */}
      <div className="flex gap-2 my-4 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setCompanyFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            companyFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Products
        </button>
        <button
          onClick={() => setCompanyFilter('1')} 
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            companyFilter === '1' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-100'
          }`}
        >
          ⛏️ Mineazy
        </button>
        <button
          onClick={() => setCompanyFilter('2')} 
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            companyFilter === '2' ? 'bg-green-600 text-white shadow-md' : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-100'
          }`}
        >
          🚜 Farmeazy
        </button>
      </div>

      {/* Dynamic Results Counter */}
      {!initialLoad && (
        <div className="text-xs font-bold text-gray-400 mb-3 ml-1 flex justify-between">
          <span>{masterCatalog.length} Items Found</span>
          {search && <span className="text-blue-600 cursor-pointer" onClick={() => setSearch('')}>Clear Search ✕</span>}
        </div>
      )}

      {/* Loading & Rendering States */}
      {initialLoad && products.length === 0 ? (
        <div className="text-center py-12 text-xs font-bold text-gray-400 animate-pulse">Loading full catalog from database...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-xs font-bold text-gray-400 border border-dashed rounded-xl bg-gray-50">
          No matches found inside database criteria.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product, index) => (
            <div key={product.id} ref={index === products.length - 1 ? lastProductRef : null}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      {/* Scroll Footer Load Indicators */}
      {hasMore && products.length > 0 && (
        <div className="text-center py-6 text-xs font-bold text-blue-600 animate-pulse">Loading more items...</div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="text-center py-8 text-xs font-bold text-gray-400">✓ All {masterCatalog.length} matched products loaded</div>
      )}
    </div>
  )
}