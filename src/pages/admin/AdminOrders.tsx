import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'react-hot-toast'
import { useAdminAuth } from '../../hooks/useAdminAuth'

export default function AdminOrders() {
  const navigate = useNavigate()
  
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [viewFilter, setViewFilter] = useState<'all' | number>('all')

  const [rawOrders, setRawOrders] = useState<any[]>([])
  const [masterOrders, setMasterOrders] = useState<any[]>([])
  const [displayedOrders, setDisplayedOrders] = useState<any[]>([])
  
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pageSize = 20

  const { user } = useUser()
  const { isAdmin, isSuperAdmin, companyId, checking } = useAdminAuth()

  // ⚡ BLAZING FAST COMBINED INIT (Auth + Data in one shot)
  const initializeDashboard = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setAuthLoading(true)
    
    try {
      if (!user) return navigate('/login')
      if (checking) return

      // Fetch all 3 order tables SIMULTANEOUSLY
      const [ordersRes, itemsRes, productsRes] = await Promise.all([
        fetch('/api/orders').then(res => res.json()),
        fetch('/api/order_items').then(res => res.json()),
        fetch('/api/products').then(res => res.json())
      ])

      if (!isAdmin && !isSuperAdmin) {
        toast.error("Unauthorized Access.")
        return navigate('/')
      }

      const activeCompany = companyId || 3
      setCurrentCompanyId(activeCompany)

      // Map Products
      const productCompanyMap: Record<string, number> = {}
      if (Array.isArray(productsRes)) productsRes.forEach(p => { productCompanyMap[p.id] = Number(p.company) })

      // Filter Orders
      const secureOrders = (Array.isArray(ordersRes) ? ordersRes : []).map(order => {
        const itemsInThisOrder = (Array.isArray(itemsRes) ? itemsRes : []).filter(item => item.order_id === order.id)
        const extractedCompanies = itemsInThisOrder.map(item => productCompanyMap[item.product_id]).filter(id => id === 1 || id === 2) 
        return { ...order, involvedCompanies: Array.from(new Set(extractedCompanies)) }
      }).filter(order => {
        if (activeCompany === 3) return true
        return order.involvedCompanies.includes(activeCompany)
      })

      setRawOrders(secureOrders)
    } catch (err: any) {
      console.error("Order Engine Crash:", err)
    } finally {
      if (!isSilentRefresh) setAuthLoading(false)
    }
  }, [navigate, user, isAdmin, isSuperAdmin, companyId, checking])

  useEffect(() => {
    if (!checking) {
      initializeDashboard()
    }
  }, [initializeDashboard, checking])

  // Realtime Live Refresh removed since TiDB doesn't have native subscriptions
  // Polling could be added here if necessary
  useEffect(() => {
    if (currentCompanyId === null) return
    // Polling every 15 seconds to simulate realtime
    const interval = setInterval(() => {
      initializeDashboard(true)
    }, 15000)
    return () => clearInterval(interval)
  }, [currentCompanyId, initializeDashboard])

  // Filters & Search
  useEffect(() => {
    if (rawOrders.length === 0) { setMasterOrders([]); setDisplayedOrders([]); return }
    let filtered = [...rawOrders]
    if (currentCompanyId === 3 && viewFilter !== 'all') filtered = filtered.filter(order => order.involvedCompanies.includes(viewFilter))
    if (search.trim() !== '') {
      const q = search.toLowerCase()
      filtered = filtered.filter(order => (order.order_number || '').toLowerCase().includes(q) || (order.customers?.name || '').toLowerCase().includes(q) || (order.customers?.phone || '').toLowerCase().includes(q))
    }
    setMasterOrders(filtered)
    setPage(0)
    setDisplayedOrders(filtered.slice(0, pageSize))
    setHasMore(filtered.length > pageSize)
  }, [rawOrders, currentCompanyId, viewFilter, search])

  // Pagination
  const loadMore = useCallback(() => {
    if (!hasMore) return
    const nextPage = page + 1
    const nextOrders = masterOrders.slice(0, (nextPage + 1) * pageSize)
    setDisplayedOrders(nextOrders)
    setPage(nextPage)
    setHasMore(masterOrders.length > nextOrders.length)
  }, [page, masterOrders, hasMore])

  const lastOrderRef = useCallback((node: HTMLDivElement) => {
    if (authLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) loadMore() })
    if (node) observerRef.current.observe(node)
  }, [authLoading, hasMore, loadMore])

  if (authLoading) return <div className="p-6 text-center text-sm font-medium text-gray-400">Verifying administrative clearance...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 pb-28">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Orders Dashboard</h1>
            <span className="flex h-3 w-3 relative mt-1" title="Live Server Connection Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
          <p className="text-xs text-gray-500">Track and manage customer fulfillment pipelines.</p>
        </div>
        <button onClick={() => navigate('/admin/products')} className="px-4 py-2 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 shadow-xs hover:bg-gray-50 transition-colors">Switch to Products →</button>
      </div>

      {currentCompanyId === 3 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => setViewFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${viewFilter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>🌍 All Orders</button>
          <button onClick={() => setViewFilter(1)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${viewFilter === 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>⛏️ Mineazy Deliveries</button>
          <button onClick={() => setViewFilter(2)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${viewFilter === 2 ? 'bg-green-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>🚜 Farmeazy Deliveries</button>
        </div>
      )}

      <div className="mb-6 relative">
        <input type="text" placeholder="🔎 Search by Order Ref, Customer Name, or Phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-xs" />
      </div>

      {!authLoading && <div className="text-xs font-bold text-gray-400 mb-3 ml-1">{masterOrders.length} Invoices Found</div>}

      {displayedOrders.length === 0 ? (
        <div className="text-center py-12 text-xs font-bold text-gray-400 border border-dashed rounded-xl bg-gray-50">No orders found matching your clearance parameters.</div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order, index) => {
            const isMixedCart = order.involvedCompanies.length > 1
            const isMineazyOnly = order.involvedCompanies.includes(1) && !isMixedCart
            const isFarmeazyOnly = order.involvedCompanies.includes(2) && !isMixedCart

            return (
              <div key={order.id} ref={index === displayedOrders.length - 1 ? lastOrderRef : null} onClick={() => navigate(`/admin/orders/${order.id}`)} className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-base">{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'dispatched' ? 'bg-blue-100 text-blue-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      order.payment_status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
                      order.payment_status === 'failed' ? 'bg-red-50 border-red-200 text-red-600' :
                      'bg-amber-50 border-amber-200 text-amber-600'
                    }`}>
                      {order.payment_status === 'paid' ? 'Paid 💸' : order.payment_status === 'failed' ? 'Failed ❌' : 'Unpaid ⏳'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-600">{order.customers?.name || 'Guest'} <span className="text-gray-300 mx-1">|</span> {order.customers?.phone || 'No Phone'}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {isMineazyOnly && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">⛏️ Mineazy Equipment</span>}
                    {isFarmeazyOnly && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">🚜 Farmeazy Agline</span>}
                  </div>
                </div>
                <div className="flex sm:flex-col justify-between sm:items-end sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-xs text-gray-400 font-medium mb-1">{new Date(order.created_at).toLocaleDateString()}</div>
                  <div className="font-mono font-black text-lg text-blue-600">${(order.total_amount + (order.delivery_fee || 0)).toFixed(2)}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Via {order.payment_method}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}