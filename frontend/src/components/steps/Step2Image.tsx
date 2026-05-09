import { useState, useCallback, useEffect, useRef } from 'react'
import { usePipeline, type ImageItem } from '../PipelineContext'
import { SearchImages } from '../../../wailsjs/go/main/App'

function Step2Image() {
  const { state, addImage, removeImage } = usePipeline()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sources, setSources] = useState({ unsplash: true, pexels: true, pixabay: true })

  const [searched, setSearched] = useState(false)
  const titleRef = useRef(state.article.title)
  const searchRef = useRef<Function>()

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = q || query || state.article.title
    if (!searchQuery.trim()) { setError('请输入搜索关键词'); return }
    setLoading(true)
    setError('')
    try {
      const result = await SearchImages(searchQuery, 20)
      if (result.startsWith('error:')) {
        setError(result)
        return
      }
      setResults(JSON.parse(result))
      setSearched(true)
    } catch (e: any) {
      setError(e.message || '搜索失败')
    } finally {
      setLoading(false)
    }
  }, [query, state.article.title])

  useEffect(() => {
    if (state.article.title && state.article.title !== titleRef.current && !searched) {
      titleRef.current = state.article.title
      setQuery(state.article.title)
    }
  }, [state.article.title])

  const isSelected = (id: string) => state.images.some(img => img.id === id)

  return (
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🖼️</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800">第二步：配图</h2>
          <p className="text-sm text-gray-500">搜索免费版权图片，点击插入文章</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索图片关键词（留空则使用文章标题）"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            {state.article.title && !query && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                将使用：{state.article.title}
              </span>
            )}
          </div>
          <button onClick={() => handleSearch()} disabled={loading}
            className="btn-primary whitespace-nowrap flex items-center gap-2">
            {loading ? '搜索中...' : '🔍 搜索'}
          </button>
        </div>

        <div className="flex gap-4 text-xs text-gray-500 items-center">
          <span>图源筛选：</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={sources.unsplash}
              onChange={e => setSources(s => ({ ...s, unsplash: e.target.checked }))}
              className="accent-primary" /> Unsplash
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={sources.pexels}
              onChange={e => setSources(s => ({ ...s, pexels: e.target.checked }))}
              className="accent-primary" /> Pexels
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={sources.pixabay}
              onChange={e => setSources(s => ({ ...s, pixabay: e.target.checked }))}
              className="accent-primary" /> Pixabay
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {results
              .filter(img => {
                if (!sources.unsplash && img.source === 'Unsplash') return false
                if (!sources.pexels && img.source === 'Pexels') return false
                if (!sources.pixabay && img.source === 'Pixabay') return false
                return true
              })
              .map(img => (
                <div key={img.id}
                  onClick={() => isSelected(img.id) ? removeImage(img.id) : addImage(img)}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                    isSelected(img.id) ? 'border-primary ring-2 ring-primary-light' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={img.thumbUrl} alt={img.id}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-[10px] text-white">{img.source} · {img.author}</span>
                  </div>
                  {isSelected(img.id) && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
          </div>
        )}

        {!searched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            输入关键词或使用文章标题自动搜索免费版权图片<br/>
            <span className="text-xs text-gray-300">Demo 图源无需 API Key 即可使用</span>
          </div>
        )}
        {searched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            未找到相关图片，请尝试其他关键词
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{results.length > 0 ? `共 ${results.length} 张图片` : ''}</span>
          {state.images.length > 0 && (
            <span className="text-primary font-medium">
              已选 {state.images.length} 张
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Step2Image
