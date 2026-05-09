import { useState, useCallback, useEffect } from 'react'
import { marked } from 'marked'
import { usePipeline } from '../PipelineContext'
import { PublishArticle, GetAppStatus } from '../../../wailsjs/go/main/App'

const TEMPLATE_INLINE_STYLES: Record<string, Record<string, string>> = {
  modern: {
    h1: 'font-size:24px;font-weight:700;margin:20px 0 12px;line-height:1.4;text-align:center;',
    h2: 'font-size:19px;font-weight:600;margin:24px 0 10px;padding-left:12px;border-left:3px solid #2563eb;',
    h3: 'font-size:17px;font-weight:600;margin:20px 0 8px;',
    p: 'margin:12px 0;text-indent:2em;letter-spacing:0.5px;line-height:1.8;',
    blockquote: 'margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;color:#555;',
    ul: 'margin:12px 0;padding-left:24px;',
    ol: 'margin:12px 0;padding-left:24px;',
    li: 'margin:6px 0;',
    code: 'background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:14px;',
    pre: 'background:#1e293b;color:#f8fafc;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;',
    strong: 'color:#2563eb;',
    a: 'color:#2563eb;text-decoration:none;',
  },
  literary: {
    h1: 'font-size:24px;font-weight:700;margin:20px 0 12px;line-height:1.4;text-align:center;color:#92400e;',
    h2: 'font-size:19px;font-weight:600;margin:24px 0 10px;padding-left:12px;border-left:3px solid #d97706;',
    h3: 'font-size:17px;font-weight:600;margin:20px 0 8px;',
    p: 'margin:12px 0;text-indent:2em;letter-spacing:0.5px;line-height:1.8;color:#555;',
    blockquote: 'margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #d97706;border-radius:0 8px 8px 0;color:#78350f;',
    ul: 'margin:12px 0;padding-left:24px;',
    ol: 'margin:12px 0;padding-left:24px;',
    li: 'margin:6px 0;',
    code: 'background:#fef3c7;padding:2px 6px;border-radius:4px;font-size:14px;color:#92400e;',
    pre: 'background:#451a03;color:#fef3c7;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;',
    strong: 'color:#d97706;',
    a: 'color:#d97706;text-decoration:none;',
  },
  knowledge: {
    h1: 'font-size:24px;font-weight:700;margin:20px 0 12px;line-height:1.4;text-align:center;color:#065f46;',
    h2: 'font-size:19px;font-weight:600;margin:24px 0 10px;padding:10px 12px;background:#ecfdf5;border-radius:8px;border-left:3px solid #059669;',
    h3: 'font-size:17px;font-weight:600;margin:20px 0 8px;',
    p: 'margin:12px 0;text-indent:2em;letter-spacing:0.5px;line-height:1.8;',
    blockquote: 'margin:16px 0;padding:12px 16px;background:#ecfdf5;border-left:4px solid #059669;border-radius:0 8px 8px 0;color:#065f46;',
    ul: 'margin:12px 0;padding-left:24px;',
    ol: 'margin:12px 0;padding-left:24px;',
    li: 'margin:6px 0;',
    code: 'background:#d1fae5;padding:2px 6px;border-radius:4px;font-size:14px;color:#065f46;',
    pre: 'background:#064e3b;color:#d1fae5;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;',
    strong: 'color:#059669;',
    a: 'color:#059669;text-decoration:none;',
  },
  news: {
    h1: 'font-size:24px;font-weight:700;margin:20px 0 12px;line-height:1.4;text-align:center;color:#991b1b;',
    h2: 'font-size:19px;font-weight:600;margin:24px 0 10px;border-bottom:2px solid #dc2626;padding-bottom:6px;',
    h3: 'font-size:17px;font-weight:600;margin:20px 0 8px;',
    p: 'margin:12px 0;text-indent:2em;letter-spacing:0.3px;line-height:1.8;color:#333;',
    blockquote: 'margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;color:#991b1b;',
    ul: 'margin:12px 0;padding-left:24px;',
    ol: 'margin:12px 0;padding-left:24px;',
    li: 'margin:6px 0;',
    code: 'background:#fef2f2;padding:2px 6px;border-radius:4px;font-size:14px;color:#991b1b;',
    pre: 'background:#450a0a;color:#fef2f2;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;',
    strong: 'color:#dc2626;',
    a: 'color:#dc2626;text-decoration:none;',
  },
}

function applyInlineStyles(html: string, templateId: string): string {
  const styles = TEMPLATE_INLINE_STYLES[templateId]
  if (!styles) return html
  for (const [tag, style] of Object.entries(styles)) {
    const re = new RegExp(`<${tag}(\\s[^>]*?)?>`, 'gi')
    html = html.replace(re, (match, attrs) => {
      if (attrs && /style="/i.test(attrs)) return match
      return `<${tag}${attrs || ''} style="${style}">`
    })
  }
  return html
}

const PLATFORMS = [
  { id: 'wechat', label: '微信公众号', icon: '💬', desc: '发布到草稿箱', coming: false },
  { id: 'zhihu', label: '知乎', icon: '📕', desc: '即将上线', coming: true },
  { id: 'toutiao', label: '今日头条', icon: '📰', desc: '即将上线', coming: true },
]

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

function Step4Publish() {
  const { state } = usePipeline()
  const [target, setTarget] = useState('wechat')
  const [title, setTitle] = useState(state.article.title)
  const [isDraft, setIsDraft] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [coverURL, setCoverURL] = useState(state.images[0]?.url || '')
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (state.article.title !== title && !title) {
      setTitle(state.article.title)
    }
  }, [state.article.title])

  useEffect(() => {
    GetAppStatus().then(json => {
      try {
        const s = JSON.parse(json)
        setConfigured(s.publishers?.includes('wechat'))
      } catch { /* ignore */ }
    })
  }, [])

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { time, message, type }])
  }

  const handlePublish = useCallback(async () => {
    if (!state.article.content) { addLog('请先生成文章内容', 'error'); return }

    if (!configured) {
      addLog('✗ 未配置微信公众号 API，请先到设置页面配置 AppID 和 AppSecret', 'error')
      return
    }

    setPublishing(true)

    // 从 AI 内容中提取标题（第一行 # 标题），用作发布标题
    const aiTitle = (state.article.content.match(/^# (.+)/m) || [])[1] || ''
    const finalTitle = title || aiTitle || state.article.title || '未命名文章'

    // 去掉正文第一行的标题（避免与标题字段重复）
    const contentBody = state.article.content.replace(/^# .+(\n|$)/, '')

    // 将 Markdown 转为 HTML（微信草稿箱需要 HTML 格式）
    let htmlContent = contentBody
    try {
      htmlContent = await marked.parse(contentBody)
      htmlContent = applyInlineStyles(htmlContent, state.template || 'modern')
    } catch {
      addLog('⚠ Markdown 转 HTML 失败，使用原文', 'info')
    }

    addLog(`开始发布《${finalTitle}》到微信公众号...`, 'info')

    try {
      const result = await PublishArticle(target, finalTitle, htmlContent, coverURL, isDraft)
      const data = JSON.parse(result)
      if (data.success) {
        addLog(`✓ 发布成功！已${isDraft ? '存入草稿箱' : '发布'}`, 'success')
      } else {
        addLog(`✗ 发布失败: ${data.error}`, 'error')
      }
    } catch (e: any) {
      addLog(`✗ 发布异常: ${e.message}`, 'error')
    } finally {
      setPublishing(false)
    }
  }, [target, title, coverURL, isDraft, state.article, configured])

  return (
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🚀</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800">第四步：发布</h2>
          <p className="text-sm text-gray-500">一键发布到各平台草稿箱</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">选择发布平台</label>
          <div className="grid grid-cols-3 gap-4">
            {PLATFORMS.map(p => (
              <div key={p.id}
                onClick={() => !p.coming && setTarget(p.id)}
                className={`border-2 rounded-xl p-5 text-center cursor-pointer transition-all ${
                  p.coming ? 'border-gray-200 opacity-50 cursor-not-allowed' :
                  target === p.id ? 'border-primary bg-primary-light/20' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
                {p.id === 'wechat' && !configured && (
                  <div className="text-[10px] text-red-400 mt-1">未配置</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">发布配置</label>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">文章标题</label>
            <input type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="文章标题"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">封面图</label>
            {state.images.length > 0 ? (
              <div className="flex gap-2">
                {state.images.slice(0, 5).map(img => (
                  <div key={img.id}
                    onClick={() => setCoverURL(img.url)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${
                      coverURL === img.url ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <img src={img.thumbUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                请在第二步选择配图作为封面
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={isDraft}
              onChange={e => setIsDraft(e.target.checked)}
              className="accent-primary" />
            发布为草稿（不直接发布）
          </label>
        </div>

        {!configured && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg p-3">
            ⚠ 未配置微信公众号 API。请点击右上角 ⚙️ 设置，填入 AppID 和 AppSecret 后重启应用。
          </div>
        )}

        <button onClick={handlePublish} disabled={publishing || !state.article.content}
          className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2">
          {publishing ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> 发布中...</>
          ) : '🚀 一键发布'}
        </button>

        <div className="border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
          <div className="text-sm font-medium text-gray-700 mb-2">发布日志</div>
          {logs.length === 0 ? (
            <div className="text-xs text-gray-300">等待发布...</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={`text-xs ${
                  log.type === 'success' ? 'text-success' :
                  log.type === 'error' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  <span className="text-gray-300">[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Step4Publish
