import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { SaveLastArticle, LoadLastArticle } from '../../wailsjs/go/main/App'

export interface ArticleData {
  title: string
  content: string
}

export interface ImageItem {
  id: string
  url: string
  thumbUrl: string
  author: string
  source: string
  pageUrl: string
}

interface PipelineState {
  article: ArticleData
  images: ImageItem[]
  template: string
  publishTargets: string[]
}

interface PipelineContextType {
  state: PipelineState
  setArticle: (article: ArticleData) => void
  setImages: (images: ImageItem[]) => void
  addImage: (image: ImageItem) => void
  removeImage: (id: string) => void
  setTemplate: (template: string) => void
  togglePublishTarget: (target: string) => void
  reset: () => void
}

const initialState: PipelineState = {
  article: { title: '', content: '' },
  images: [],
  template: 'modern',
  publishTargets: ['wechat'],
}

const PipelineContext = createContext<PipelineContextType | null>(null)

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PipelineState>(initialState)

  // 启动时恢复上次的文章
  useEffect(() => {
    LoadLastArticle().then(json => {
      try {
        const data = JSON.parse(json)
        if (data.title || data.content) {
          setState(s => ({ ...s, article: { title: data.title || '', content: data.content || '' } }))
        }
      } catch { /* ignore */ }
    })
  }, [])

  // 文章内容变化时自动持久化
  const persistArticle = useCallback((article: ArticleData) => {
    SaveLastArticle(article.title, article.content).then(res => {
      if (res.startsWith('error:')) console.error('SaveLastArticle failed:', res)
    }).catch(e => console.error('SaveLastArticle error:', e))
  }, [])

  const setArticle = useCallback((article: ArticleData) => {
    setState(s => ({ ...s, article }))
    persistArticle(article)
  }, [persistArticle])

  const setImages = (images: ImageItem[]) => setState(s => ({ ...s, images }))
  const addImage = (image: ImageItem) => setState(s => ({
    ...s, images: [...s.images, image]
  }))
  const removeImage = (id: string) => setState(s => ({
    ...s, images: s.images.filter(img => img.id !== id)
  }))
  const setTemplate = (template: string) => setState(s => ({ ...s, template }))
  const togglePublishTarget = (target: string) => setState(s => ({
    ...s,
    publishTargets: s.publishTargets.includes(target)
      ? s.publishTargets.filter(t => t !== target)
      : [...s.publishTargets, target]
  }))
  const reset = () => setState(initialState)

  return (
    <PipelineContext.Provider value={{
      state, setArticle, setImages, addImage, removeImage,
      setTemplate, togglePublishTarget, reset
    }}>
      {children}
    </PipelineContext.Provider>
  )
}

export function usePipeline() {
  const ctx = useContext(PipelineContext)
  if (!ctx) throw new Error('usePipeline must be used within PipelineProvider')
  return ctx
}
