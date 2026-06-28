import { useEffect, useState, useCallback, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Papa from 'papaparse'
import { useAdminAuth } from '../../hooks/useAdminAuth'

const COMPANY_STATIC: Record<number, { name: string; shortName: string; icon: string; logoUrl: string }> = {
  1: { 
    name: 'Mineazy Mining Solutions', 
    shortName: 'Mineazy', 
    icon: '⛏️',
    logoUrl: 'https://plmwckgshtxwgvwmbsvq.supabase.co/storage/v1/object/public/product-images/company-logos/mineazy-logo.png'
  },
  2: { 
    name: 'Farmeazy Farming Solutions', 
    shortName: 'Farmeazy', 
    icon: '🚜',
    logoUrl: 'https://plmwckgshtxwgvwmbsvq.supabase.co/storage/v1/object/public/product-images/company-logos/farmeazy-logo.png'
  }
};

interface ModalSettings {
  isOpen: boolean; title: string; message: string; confirmButtonText: string; theme: 'danger' | 'success'; onConfirm: () => void;
}

export default function AdminProducts() {
  const navigate = useNavigate()
  const { id } = useParams() 
  const { isAdmin, isSuperAdmin, companyId, checking } = useAdminAuth()
  
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [viewFilter, setViewFilter] = useState<'all' | number>('all')

  const [rawDatabase, setRawDatabase] = useState<any[]>([])
  const [masterCatalog, setMasterCatalog] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  const [targetingProductId, setTargetingProductId] = useState<string | null>(null)

  const [editForm, setEditForm] = useState({ Name: '', "Item No": '', "Excl VAT": 0, "Incl VAT": 0, stock: 0, image_url: '', company: 1 })
  const [saving, setSaving] = useState(false)

  const [unsavedStock, setUnsavedStock] = useState<Record<string, number>>({})
  const [batchSaving, setBatchSaving] = useState(false)
  const [globalStockValue, setGlobalStockValue] = useState<string>('')

  const [modal, setModal] = useState<ModalSettings>({
    isOpen: false, title: '', message: '', confirmButtonText: '', theme: 'danger', onConfirm: () => {},
  })

  // ========================================================
  // ⭐ DEEP FETCH ENGINE: Uses TiDB API instead of Supabase
  // ========================================================
  const fetchEntireCatalog = async () => {
    const res = await fetch('/api/products')
    if (!res.ok) throw new Error('Failed to fetch catalog from server')
    return await res.json()
  }

  // ========================================================
  // ⚡ DASHBOARD INITIALIZATION
  // ========================================================
  useEffect(() => {
    const initializeDashboard = async () => {
      if (checking) return
      setAuthLoading(true)
      setLoading(true)
      try {
        if (!isAdmin && !isSuperAdmin) {
          toast.error("Unauthorized Access Channel. Redirecting...")
          navigate('/')
          return
        }

        const activeCompany = companyId || 3
        setCurrentCompanyId(activeCompany)

        // If editing a product
        if (id && id !== 'new') {
          const res = await fetch('/api/products')
          const productsData = await res.json()
          const data = productsData.find((p: any) => p.id === id)
          if (data) {
            setEditForm({
              Name: data.Name || data.name || '',
              "Item No": data["Item No"] || data.item_no || '',
              "Excl VAT": data["Excl VAT"] || data.excl_vat || 0,
              "Incl VAT": data["Incl VAT"] || data.incl_vat || 0,
              stock: data.stock || 0,
              image_url: data.image_url || '',
              company: Number(data.company || data.Company || data.company_id || 1) 
            })
          }
        } 
        // If creating a new product
        else if (id === 'new') {
          setEditForm({ 
            Name: '', "Item No": '', "Excl VAT": 0, "Incl VAT": 0, stock: 0, image_url: '', 
            company: activeCompany === 3 ? 1 : activeCompany 
          })
        } 
        // If loading the main grid
        else if (!id) {
          const fullDatabase = await fetchEntireCatalog()
          setRawDatabase(fullDatabase)
        }

      } catch (err) {
        console.error("Initialization breakdown:", err)
        toast.error("Failed to fetch secure catalog.")
      } finally {
        setAuthLoading(false)
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [id, navigate, isAdmin, isSuperAdmin, companyId, checking])

  const refreshRawDatabase = async () => {
    try {
      const fullDatabase = await fetchEntireCatalog()
      setRawDatabase(fullDatabase)
    } catch (err: any) {
      console.error("Failed to load inventory memory:", err.message)
    }
  }

  // ========================================================
  // ⚡ BULLETPROOF FILTERS, SEARCH, AND SHUFFLE
  // ========================================================
  useEffect(() => {
    if (rawDatabase.length === 0) return

    let filtered = [...rawDatabase]

    // ⭐ INDESTRUCTIBLE COMPANY MATCHER
    if (currentCompanyId !== 3) {
      filtered = filtered.filter(p => Number(p.company || p.Company || p.company_id) === Number(currentCompanyId))
    } else if (viewFilter !== 'all') {
      filtered = filtered.filter(p => Number(p.company || p.Company || p.company_id) === Number(viewFilter))
    }

    if (search.trim() !== '') {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(p => {
        const title = (p.Name || p.name || '').toLowerCase()
        const sku = (p["Item No"] || p.item_no || '').toLowerCase()
        return title.includes(searchLower) || sku.includes(searchLower)
      })
    }

    if (currentCompanyId === 3 && viewFilter === 'all' && search.trim() === '') {
      filtered = filtered.sort(() => Math.random() - 0.5)
    } else {
      filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    setMasterCatalog(filtered)
    setPage(0)
    setProducts(filtered.slice(0, 30))
    setHasMore(filtered.length > 30)

  }, [rawDatabase, currentCompanyId, viewFilter, search])

  // ========================================================
  // ⚡ HIGH-SPEED PAGINATION
  // ========================================================
  const loadMore = useCallback(() => {
    if (!hasMore) return
    const nextPage = page + 1
    const nextProducts = masterCatalog.slice(0, (nextPage + 1) * 30)
    setProducts(nextProducts)
    setPage(nextPage)
    setHasMore(masterCatalog.length > nextProducts.length)
  }, [page, masterCatalog, hasMore])

  const lastProductRef = useCallback((node: HTMLDivElement) => {
    if (loading || id) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) loadMore()
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, loadMore, id])


  const handleExportCSV = () => {
    if (masterCatalog.length === 0) { toast.error('No products found in the current view.'); return }
    const headers = ['SKU', 'Product Name', 'Price (Excl VAT)', 'Stock Balance', 'Company ID']
    const csvRows = masterCatalog.map(product => [
      `"${product["Item No"] || product.item_no || ''}"`,
      `"${product.Name || product.name || ''}"`,
      product["Excl VAT"] || product.excl_vat || 0,
      product.stock || 0,
      Number(product.company || product.Company || product.company_id || 1)
    ].join(','))

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const exportTarget = currentCompanyId !== 3 ? Number(currentCompanyId) : (viewFilter === 'all' ? null : Number(viewFilter));
    const brandName = exportTarget ? COMPANY_STATIC[exportTarget]?.shortName : 'System_Master'
    link.setAttribute('download', `${brandName}_Catalog_Export.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Inventory report exported successfully!')
  }

  const openImagePicker = (productId: string | null = null) => {
    setTargetingProductId(productId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    const mediaToast = toast.loading('Uploading asset file to storage buckets...')

    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
      })
      const base64Data = await base64Promise

      const res = await fetch('/api/upload-image-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, base64Data })
      })
      if (!res.ok) throw new Error('Failed to upload image via backend proxy')
      
      const { publicUrl } = await res.json()

      if (targetingProductId) {
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetingProductId, image_url: publicUrl })
        })
        refreshRawDatabase() 
      } else {
        setEditForm(prev => ({ ...prev, image_url: publicUrl }))
      }
      toast.success('Image asset compiled and assigned cleanly!', { id: mediaToast })
    } catch (err: any) {
      toast.error(`Image upload breakdown: ${err.message}`, { id: mediaToast })
    } finally {
      setTargetingProductId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ========================================================
  // ⭐ STOCK OVERRIDES
  // ========================================================
  const handleLocalStockChange = (productId: string, originalStock: number, valueString: string) => {
    const parsedValue = parseInt(valueString)
    if (isNaN(parsedValue) || parsedValue < 0) return

    if (parsedValue === originalStock) {
      setUnsavedStock(prev => {
        const updated = { ...prev }
        delete updated[productId]
        return updated
      })
    } else {
      setUnsavedStock(prev => ({ ...prev, [productId]: parsedValue }))
    }
  }

  const executeGlobalStockOverride = async (parsedGlobal: number) => {
    setBatchSaving(true)
    const overrideToast = toast.loading('Executing system-wide baseline warehouse updates...')
    try {
      const targetProducts = masterCatalog.filter(p => {
        if (currentCompanyId && currentCompanyId !== 3) return Number(p.company) === currentCompanyId
        if (viewFilter !== 'all') return Number(p.company) === viewFilter
        return true
      })
      
      // Batch promises in chunks
      const chunkSize = 20
      for (let i = 0; i < targetProducts.length; i += chunkSize) {
        const chunk = targetProducts.slice(i, i + chunkSize)
        await Promise.all(chunk.map(p => 
          fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, stock: parsedGlobal })
          })
        ))
      }

      setUnsavedStock({}) 
      setGlobalStockValue('')
      await refreshRawDatabase() 
      
      setModal({ isOpen: true, title: 'Override Successful', message: `All target inventory listings have been globally calibrated to an absolute count of ${parsedGlobal} items.`, confirmButtonText: 'Continue', theme: 'success', onConfirm: () => {} })
      toast.dismiss(overrideToast)
    } catch (err: any) {
      toast.error(`Bulk write crash: ${err.message}`, { id: overrideToast })
    } finally {
      setBatchSaving(false)
    }
  }

  const handleApplyGlobalStockDatabaseWide = () => {
    const parsedGlobal = parseInt(globalStockValue)
    if (isNaN(parsedGlobal) || parsedGlobal < 0) { toast.error('Please specify a valid positive integer count.'); return }

    const alertMsg = (currentCompanyId === 3 && viewFilter === 'all')
      ? `This will instantly overwrite and set the stock level to ${parsedGlobal} units for EVERY single product across ALL companies in the database.`
      : `This will instantly overwrite and set the stock level to ${parsedGlobal} units for EVERY product tracked under the ${currentCompanyId !== 3 ? COMPANY_STATIC[Number(currentCompanyId)]?.shortName : COMPANY_STATIC[Number(viewFilter)]?.shortName} division.`;

    setModal({ isOpen: true, title: '🚨 CRITICAL BULK EXECUTOR ALERT', message: `${alertMsg} This change cannot be automatically reversed. Proceed?`, confirmButtonText: '💥 Overwrite Database', theme: 'danger', onConfirm: () => executeGlobalStockOverride(parsedGlobal) })
  }

  const executeBatchStockSave = async () => {
    const totalEdits = Object.keys(unsavedStock).length
    setBatchSaving(true)
    const batchToast = toast.loading(`Synchronizing ${totalEdits} inventory adjustments...`)
    try {
      const entries = Object.entries(unsavedStock)
      const chunkSize = 20
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize)
        await Promise.all(chunk.map(([productId, updatedCount]) =>
          fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, stock: updatedCount })
          })
        ))
      }
      setUnsavedStock({}) 
      await refreshRawDatabase() 
      setModal({ isOpen: true, title: 'Balances Synchronized', message: `Successfully written ${totalEdits} separate physical item stock levels into system records.`, confirmButtonText: 'Acknowledge', theme: 'success', onConfirm: () => {} })
      toast.dismiss(batchToast)
    } catch (err: any) {
      toast.error(`Batch tracking broken: ${err.message}`, { id: batchToast })
    } finally {
      setBatchSaving(false)
    }
  }

  const handleBatchSaveStock = () => {
    const totalEdits = Object.keys(unsavedStock).length
    if (totalEdits === 0) return
    setModal({ isOpen: true, title: 'Save Grid Adjustments', message: `Commit and push all ${totalEdits} altered inventory stock counts directly into the production cluster tables?`, confirmButtonText: '💾 Push Changes', theme: 'success', onConfirm: executeBatchStockSave })
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formsToast = toast.loading('Syncing specification records with master tables...')
    const isNew = id === 'new'

    try {
      const payload = {
        Name: editForm.Name,
        "Item No": editForm["Item No"],
        "Excl VAT": Number(editForm["Excl VAT"]),
        "Incl VAT": Number(editForm["Incl VAT"]),
        stock: Number(editForm.stock),
        image_url: editForm.image_url,
        company: Number(editForm.company), 
        is_active: true
      }

      if (isNew) {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Failed to insert new product')
      } else {
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload })
        })
        if (!res.ok) throw new Error('Failed to update existing product')
      }
      
      toast.dismiss(formsToast)
      setModal({ isOpen: true, title: isNew ? 'Product Created' : 'Changes Saved', message: `"${editForm.Name}" catalog information records have been fully updated.`, confirmButtonText: 'Return to Catalog', theme: 'success', onConfirm: () => navigate('/admin/products') })
    } catch (err: any) {
      toast.error(`Save structural mismatch: ${err.message}`, { id: formsToast })
    } finally {
      setSaving(false)
    }
  }

  // ========================================================
  // ⭐ SECURE SCOPED DELETION ENGINE
  // ========================================================
  const executeSingleProductDeletion = async (productId: string) => {
    const trashToast = toast.loading('Scrubbing product allocation records out of indices...')
    try {
      const targetItem = products.find(p => p.id === productId)
      if (currentCompanyId !== 3 && Number(targetItem?.company) !== currentCompanyId) {
         throw new Error("Clearance rejected: Item does not belong to your division.")
      }

      const res = await fetch(`/api/products?id=${productId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete product')
      
      setRawDatabase(prev => prev.filter(p => p.id !== productId))
      toast.success('Product identity removed from deployment catalog items.', { id: trashToast })
    } catch (err: any) {
      toast.error(err.message || 'Product has active transactional dependencies.', { id: trashToast })
    }
  }

  const handleDelete = (productId: string) => {
    const targetItem = products.find(p => p.id === productId)
    setModal({ isOpen: true, title: 'Delete Catalog Item', message: `Are you completely certain you want to permanently erase "${targetItem?.Name || targetItem?.name || 'this item'}" from store logs? This will disrupt active customer cart values.`, confirmButtonText: '🗑️ Obliterate Item', theme: 'danger', onConfirm: () => executeSingleProductDeletion(productId) })
  }

  // ==========================================
  // RENDER MODES
  // ==========================================
  if (authLoading) return <div className="p-6 text-center text-sm font-medium text-gray-400">Verifying administrative terminal profile...</div>

  // VIEW 1: FULL PRODUCT CREATE/EDIT FORM
  if (id) {
    const isNew = id === 'new'
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border mt-6 relative">
        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />

        <div className="flex justify-between items-center mb-6 gap-2">
          <button onClick={() => navigate('/admin/products')} className="text-xs sm:text-sm font-bold text-gray-600 hover:text-blue-600">← Back to Catalog</button>
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full text-center ${isNew ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{isNew ? '✨ CREATE NEW ITEM' : '✏️ EDITING EXISTING ITEM'}</span>
        </div>

        {loading && !isNew ? (
          <div className="text-center py-12 text-sm font-bold text-gray-400">Loading item attributes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Image</label>
              <button type="button" onClick={() => openImagePicker(null)} className="w-full aspect-square max-w-[260px] mx-auto border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden hover:border-blue-500 bg-gray-50 transition-colors">
                {editForm.image_url ? <img src={editForm.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl text-gray-300">🖼️</span>}
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="md:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500">Product Name</label>
                <input type="text" value={editForm.Name} onChange={e => setEditForm(prev => ({ ...prev, Name: e.target.value }))} required className="w-full border p-2.5 rounded-lg text-sm mt-1 focus:border-blue-500 focus:outline-none" />
              </div>

              {currentCompanyId === 3 && (
                <div>
                  <label className="text-xs font-bold text-gray-500">Brand / Company Assignment</label>
                  <select value={editForm.company} onChange={e => setEditForm(prev => ({ ...prev, company: Number(e.target.value) }))} className="w-full border p-2.5 rounded-lg text-sm mt-1 bg-gray-50 font-bold focus:border-blue-500 focus:outline-none">
                    <option value={1}>⛏️ Mineazy Mining Solutions</option>
                    <option value={2}>🚜 Farmeazy Farming Solutions</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500">SKU / Item No</label><input type="text" value={editForm["Item No"]} onChange={e => setEditForm(prev => ({ ...prev, "Item No": e.target.value }))} required className="w-full border p-2.5 rounded-lg text-sm mt-1 focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="text-xs font-bold text-gray-500">Stock</label><input type="number" value={editForm.stock} onChange={e => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))} required className="w-full border p-2.5 rounded-lg text-sm mt-1 focus:border-blue-500 focus:outline-none" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500">Price Excl VAT ($)</label><input type="number" step="0.01" value={editForm["Excl VAT"]} onChange={e => setEditForm(prev => ({ ...prev, "Excl VAT": Number(e.target.value) }))} required className="w-full border p-2.5 rounded-lg text-sm mt-1 focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="text-xs font-bold text-gray-500">Price Incl VAT ($)</label><input type="number" step="0.01" value={editForm["Incl VAT"]} onChange={e => setEditForm(prev => ({ ...prev, "Incl VAT": Number(e.target.value) }))} required className="w-full border p-2.5 rounded-lg text-sm mt-1 focus:border-blue-500 focus:outline-none" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => navigate('/admin/products')} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg disabled:bg-blue-300 shadow-sm hover:bg-blue-700 transition-colors">{saving ? 'Processing...' : isNew ? '+ Add to Database' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        )}
        {modal.isOpen && <RenderCustomModal modal={modal} setModal={setModal} />}
      </div>
    )
  }

  const totalChangedItems = Object.keys(unsavedStock).length

  // VIEW 2: GRID LIST CATALOG OVERVIEW
  return (
    <div className="w-full max-w-7xl mx-auto p-4 pb-28 relative">
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />

      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Products Catalog</h1>
          <p className="text-xs text-gray-500">Modify numbers individually, or run a global database override to change all table stock numbers instantly.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={handleExportCSV} className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100">📥 Export CSV</button>
          <button onClick={() => navigate('/admin/products/edit/new')} className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700">+ Add New Product</button>
          <button onClick={() => navigate('/')} className="flex-1 sm:flex-initial border border-gray-200 px-3 py-2 rounded-lg text-xs font-bold bg-white text-gray-700 shadow-xs hover:bg-gray-50">← Storefront</button>
        </div>
      </div>

      {masterCatalog.length > 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-3 shadow-xs">
          <span className="text-blue-500 text-xl">📦</span>
          <div><span className="block text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Total Database Matches</span><span className="block text-sm font-black text-blue-800 leading-none">{masterCatalog.length} Active Products</span></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
          {currentCompanyId === 3 && (
            <select value={viewFilter} onChange={(e) => setViewFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-blue-500 bg-gray-50 font-bold text-gray-700 shadow-xs w-full sm:w-auto">
              <option value="all">🌍 All Brands</option>
              <option value={1}>⛏️ Mineazy Only</option>
              <option value={2}>🚜 Farmeazy Only</option>
            </select>
          )}
          <div className="relative flex-1">
            <input type="text" placeholder="🔎 Search products instantly..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors h-full shadow-xs" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-gray-200 text-gray-500 w-7 h-7 flex items-center justify-center rounded-full text-xs font-black">✕</button>}
          </div>
        </div>
        <div className="bg-red-50/40 border border-red-200 rounded-xl p-2 flex items-center gap-2 shadow-xs">
          <input type="number" placeholder="Set DB..." value={globalStockValue} onChange={e => setGlobalStockValue(e.target.value)} className="w-20 sm:w-24 border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold text-center focus:outline-none focus:border-red-500 bg-white" />
          <button type="button" onClick={handleApplyGlobalStockDatabaseWide} disabled={batchSaving || loading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-[10px] font-black tracking-wider uppercase p-2.5 rounded-lg shadow-xs text-center">{batchSaving ? 'Syncing...' : '⚠️ Set Database'}</button>
        </div>
      </div>

      {masterCatalog.length === 0 && !loading ? (
        <div className="text-center py-12 text-sm text-gray-400">No matches found for active view parameters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {products.map((product, index) => {
            const targetCompanyId = Number(product.company || product.Company || product.company_id || 1);
            const brand = COMPANY_STATIC[targetCompanyId] || { name: 'General', icon: '📦', logoUrl: '' };
            const isThisUploading = targetingProductId === product.id;
            const hasUnsavedChanges = unsavedStock[product.id] !== undefined;
            const displayedStockValue = hasUnsavedChanges ? unsavedStock[product.id] : product.stock;

            return (
              <div key={product.id} ref={index === products.length - 1 ? lastProductRef : null} className={`bg-white border rounded-xl p-2.5 sm:p-4 shadow-xs flex flex-col justify-between relative transition-all ${hasUnsavedChanges ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/5' : 'hover:border-gray-200'}`}>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => openImagePicker(product.id)} className="w-full h-24 sm:h-32 rounded-lg bg-gray-50 border flex-shrink-0 flex items-center justify-center overflow-hidden hover:border-blue-500 relative group">
                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xl opacity-40">📦</span>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold">EDIT</div>
                    {isThisUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></div></div>}
                  </button>
                  <div className="min-w-0 space-y-0.5">
                    <span className="block font-mono text-[9px] text-gray-400 truncate">SKU: {product["Item No"] || product.item_no}</span>
                    <h3 className="font-bold text-xs sm:text-sm text-gray-800 line-clamp-2 leading-tight min-h-[32px]">{product["Name"] || product.name}</h3>
                    <div className="text-xs font-black text-blue-600">${Number(product["Excl VAT"] || product.excl_vat || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 w-full">
                  <div className="flex items-center justify-between xl:justify-start gap-1.5 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Stock:</span>
                    <input type="number" value={displayedStockValue} onChange={(e) => handleLocalStockChange(product.id, product.stock, e.target.value)} className={`w-12 sm:w-16 p-1 text-xs font-mono font-bold text-center border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasUnsavedChanges ? 'bg-blue-50 text-blue-700 border-blue-300' : product.stock === 0 ? 'bg-red-600 border-red-200' : 'bg-gray-50 text-gray-800 border-gray-200'}`} />
                    {hasUnsavedChanges && <span className="text-[9px] font-black text-blue-600 animate-pulse">●</span>}
                  </div>
                  <div className="flex gap-1 w-full xl:w-auto">
                    <button onClick={() => navigate(`/admin/products/edit/${product.id}`)} className="flex-1 xl:flex-initial px-1.5 py-1 text-[10px] font-bold border rounded bg-gray-50 text-gray-700 hover:bg-gray-100">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="flex-1 xl:flex-initial px-1.5 py-1 text-[10px] font-bold border border-red-100 text-red-600 rounded bg-red-50 hover:bg-red-100">Delete</button>
                  </div>
                </div>
                <div className="absolute top-4 right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border bg-white flex items-center justify-center text-xs shadow-sm">
                  {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" /> : <span>{brand.icon}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalChangedItems > 0 && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-gray-900 border border-gray-800 text-white rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 z-50">
          <div className="text-left"><span className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest">Unsaved Register</span><span className="text-xs font-semibold text-gray-300">Queued: <strong className="text-white text-sm font-black">{totalChangedItems} items</strong></span></div>
          <div className="flex gap-2 justify-end w-full sm:w-auto">
            <button onClick={() => setUnsavedStock({})} disabled={batchSaving} className="px-3 py-2 border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-xl flex-1 sm:flex-initial">Reset</button>
            <button onClick={handleBatchSaveStock} disabled={batchSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs font-black tracking-wide rounded-xl shadow-md">{batchSaving ? 'Saving...' : '💾 Save All'}</button>
          </div>
        </div>
      )}

      {loading && !targetingProductId && masterCatalog.length === 0 && <div className="text-center text-xs font-bold text-blue-600 py-4">Loading inventory updates...</div>}



      {modal.isOpen && <RenderCustomModal modal={modal} setModal={setModal} />}
    </div>
  )
}

function RenderCustomModal({ modal, setModal }: { modal: ModalSettings, setModal: (v: any) => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="bg-white border border-gray-100 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
        <div className={`flex items-center gap-2.5 ${modal.theme === 'danger' ? 'text-red-600' : 'text-green-600'}`}>
          <span className="text-xl">{modal.theme === 'danger' ? '⚠️' : '✨'}</span>
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">{modal.title}</h3>
        </div>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">{modal.message}</p>
        <div className="flex gap-2 pt-1">
          {modal.theme === 'danger' && <button type="button" onClick={() => setModal((prev: any) => ({ ...prev, isOpen: false }))} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all">Cancel</button>}
          <button type="button" onClick={() => { modal.onConfirm(); setModal((prev: any) => ({ ...prev, isOpen: false })) }} className={`py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs text-center ${modal.theme === 'danger' ? 'flex-1 bg-red-600 hover:bg-red-700' : 'w-full bg-green-600 hover:bg-green-700'}`}>{modal.confirmButtonText}</button>
        </div>
      </div>
    </div>
  )
}