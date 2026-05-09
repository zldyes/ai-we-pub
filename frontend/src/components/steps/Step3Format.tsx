import { useEffect, useState } from 'react'
import { marked } from 'marked'
import { usePipeline } from '../PipelineContext'

const TEMPLATES = [
  { id: 'modern', label: '现代简约', desc: '简洁大气，适合科技/商业', icon: '◻️', color: '#2563eb', bg: '#ffffff' },
  { id: 'literary', label: '文艺清新', desc: '柔和色调，适合情感/生活', icon: '🌸', color: '#d97706', bg: '#fffbeb' },
  { id: 'knowledge', label: '知识干货', desc: '卡片式布局，适合教程', icon: '📚', color: '#059669', bg: '#f0fdf4' },
  { id: 'news', label: '新闻资讯', desc: '信息流风格，适合新闻', icon: '📰', color: '#dc2626', bg: '#fef2f2' },
]

function getCSS(t: typeof TEMPLATES[0]): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 16px; line-height: 1.8; color: #333; padding: 20px 18px;
  background: ${t.bg};
}
h1 { font-size: 24px; font-weight: 700; margin: 20px 0 12px; line-height: 1.4; text-align: center; }
h2 { font-size: 19px; font-weight: 600; margin: 24px 0 10px; padding-left: 12px; border-left: 3px solid ${t.color}; }
h3 { font-size: 17px; font-weight: 600; margin: 20px 0 8px; }
p { margin: 12px 0; text-indent: 2em; letter-spacing: 0.5px; }
blockquote {
  margin: 16px 0; padding: 12px 16px; background: #f8fafc;
  border-left: 4px solid ${t.color}; border-radius: 0 8px 8px 0; color: #555;
}
blockquote p { text-indent: 0; margin: 4px 0; }
ul, ol { margin: 12px 0; padding-left: 24px; }
li { margin: 6px 0; }
img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
figure { margin: 16px 0; text-align: center; }
figcaption { font-size: 13px; color: #999; text-align: center; margin-top: 6px; }
code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
pre { background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
pre code { background: none; padding: 0; color: inherit; }
hr { margin: 24px 0; border: none; border-top: 1px solid #eee; }
strong { color: ${t.color}; }
a { color: ${t.color}; text-decoration: none; }
`.trim()
}

function Step3Format() {
  const { state, setTemplate } = usePipeline()
  const [showImages, setShowImages] = useState(true)
  const [renderedHTML, setRenderedHTML] = useState('')

  useEffect(() => {
    async function render() {
      if (!state.article.content.trim()) { setRenderedHTML(''); return }

      const t = TEMPLATES.find(x => x.id === state.template) || TEMPLATES[0]
      const css = getCSS(t)

      let body = await marked.parse(state.article.content)

      if (showImages && state.images.length > 0) {
        const imgs = state.images.map(img =>
          `<figure><img src="${img.url}" alt=""><figcaption>图片来自 ${img.source} · ${img.author}</figcaption></figure>`
        ).join('')
        const idx = body.indexOf('</p>')
        body = idx > 0 ? body.slice(0, idx + 4) + imgs + body.slice(idx + 4) : imgs + body
      }

      setRenderedHTML(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>${css}</style>
</head><body>
${body}
</body></html>`)
    }
    render()
  }, [state.article, state.images, state.template, showImages])

  return (
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">✨</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800">第三步：排版</h2>
          <p className="text-sm text-gray-500">Markdown 自动解析排版，实时预览手机端效果</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">选择排版模板</label>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map(t => (
                <div key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    state.template === t.id
                      ? 'border-primary bg-primary-light/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {state.article.content.trim() ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-gray-400">标题</span>
                  <span className="font-medium truncate">{state.article.title || '（无标题）'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-gray-400">图片</span>
                  <span>{state.images.length} 张</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-gray-400">字数</span>
                  <span>{state.article.content.replace(/[#*>`_~\[\]]/g, '').length} 字（Markdown）</span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={showImages}
                  onChange={e => setShowImages(e.target.checked)}
                  className="accent-primary" />
                在文章中显示配图
              </label>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400">
                💡 Markdown 中的 <code className="bg-gray-200 px-1 rounded">#</code> <code className="bg-gray-200 px-1 rounded">**</code> <code className="bg-gray-200 px-1 rounded">&gt;</code> 等语法会自动解析为对应样式
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
              <p className="text-base mb-1">暂无文章内容</p>
              <p className="text-sm">请先完成「创作文章」步骤</p>
            </div>
          )}
        </div>

        <div className="w-[375px] flex-shrink-0">
          <div className="text-center text-sm text-gray-500 mb-2">📱 手机预览</div>
          <div className="border-2 border-gray-200 rounded-[32px] overflow-hidden bg-white shadow-lg">
            <div className="bg-gray-100 h-7 flex items-center justify-center text-[10px] text-gray-400 border-b">
              AI 公众号助手 · 预览
            </div>
            <div className="h-[620px] bg-white">
              {renderedHTML ? (
                <iframe
                  srcDoc={renderedHTML}
                  title="preview"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                  <div className="text-center">
                    <p className="text-lg mb-2">暂无内容</p>
                    <p>请先完成第一步创作文章</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step3Format
