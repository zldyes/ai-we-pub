import { useState, useCallback, useEffect } from 'react'
import { marked } from 'marked'
import { usePipeline } from '../PipelineContext'
import { GenerateArticle } from '../../../wailsjs/go/main/App'
import type { ArticleData } from '../PipelineContext'

const STYLES = ['通俗易懂', '专业深度', '轻松幽默', '情感温暖', '故事叙述']
const WORD_RANGES = [
  { label: '800-1000 字', min: 800, max: 1000 },
  { label: '1000-1500 字', min: 1000, max: 1500 },
  { label: '1500-2000 字', min: 1500, max: 2000 },
  { label: '2000-3000 字', min: 2000, max: 3000 },
]

function Step1Create() {
  const { state, setArticle } = usePipeline()
  const [topic, setTopic] = useState(state.article.title || '')
  const [style, setStyle] = useState(STYLES[0])
  const [wordRange, setWordRange] = useState(WORD_RANGES[1])
  const [model, setModel] = useState('DeepSeek')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewHTML, setPreviewHTML] = useState('')

  // 异步加载文章后同步到本地 topic 状态
  useEffect(() => {
    setTopic(state.article.title || '')
  }, [state.article.title])

  useEffect(() => {
    if (!state.article.content.trim()) { setPreviewHTML(''); return }
    ;(async () => {
      try { setPreviewHTML(await marked.parse(state.article.content)) }
      catch { setPreviewHTML('<p style="color:red">解析失败</p>') }
    })()
  }, [state.article.content])

  const handleContentChange = useCallback((markdown: string) => {
    setArticle({ title: topic, content: markdown } as ArticleData)
  }, [topic, setArticle])

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('请输入文章主题'); return }
    setLoading(true)
    setError('')
    try {
      const result = await GenerateArticle(model, topic, style, wordRange.min, wordRange.max)
      if (result.startsWith('error:')) {
        setError(result)
        return
      }
      const data = JSON.parse(result)
      const content = data.content || ''
      setArticle({ title: data.title || topic, content })
      setTopic(data.title || topic)
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }, [topic, style, wordRange, model, setArticle])

  const hasContent = state.article.content.trim().length > 0

  return (
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📝</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800">第一步：创作文章</h2>
          <p className="text-sm text-gray-500">输入主题，AI 生成 Markdown 格式的去 AI 味文章</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-[3]">
            <label className="block text-sm font-medium text-gray-700 mb-1">文章主题</label>
            <input
              type="text" value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例如：2026年人工智能发展趋势"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
              {STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">字数</label>
            <select value={wordRange.label} onChange={e => {
              const r = WORD_RANGES.find(w => w.label === e.target.value)
              if (r) setWordRange(r)
            }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
              {WORD_RANGES.map(w => <option key={w.label}>{w.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">AI 模型</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
              <option>DeepSeek</option>
              <option disabled>OpenAI (即将上线)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
        )}

        <button onClick={handleGenerate} disabled={loading}
          className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2">
          {loading ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> AI 生成中...</>
          ) : '🤖 AI 生成文章'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!showPreview ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              ✏️ 编辑
            </button>
            <button onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${showPreview ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              👁️ 预览
            </button>
          </div>
          <span className="text-xs text-gray-400">
            Markdown · {state.article.content.length} 字符
          </span>
          <span className="flex-1" />
          {hasContent && <span className="text-xs text-success">✓ 自动保存</span>}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {showPreview ? (
            <div
              className="prose prose-sm max-w-none p-4 min-h-[400px] max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHTML || '<p style="color:#999">加载中...</p>' }}
            />
          ) : (
            <textarea
              value={state.article.content}
              onChange={e => handleContentChange(e.target.value)}
              className="w-full min-h-[400px] max-h-[500px] p-4 font-mono text-sm leading-relaxed border-0 focus:outline-none resize-vertical"
              placeholder="AI 生成的文章将显示在这里，你也可以直接编辑 Markdown 内容..."
            />
          )}
        </div>

        {hasContent && (
          <div className="text-center text-sm text-success">
            ✓ 文章已生成，可直接编辑 Markdown 或切换到预览模式查看效果
          </div>
        )}
      </div>
    </div>
  )
}

export default Step1Create
