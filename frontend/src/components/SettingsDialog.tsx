import { useState, useEffect } from 'react'
import { GetSettings, SaveSettings, GetAppStatus } from '../../wailsjs/go/main/App'

interface SettingEntry {
  key: string
  value: string
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

const FIELDS: { key: string; label: string; placeholder: string; group: string }[] = [
  { key: 'deepseek_api_key', label: 'DeepSeek API Key', placeholder: 'sk-xxxxxxxxxxxx', group: '🤖 AI 模型' },
  { key: 'openai_api_key', label: 'OpenAI API Key（可选）', placeholder: 'sk-xxxxxxxxxxxx', group: '🤖 AI 模型' },
  { key: 'unsplash_api_key', label: 'Unsplash Access Key', placeholder: 'xxxxxxxxxxxx', group: '🖼️ 图片源' },
  { key: 'pexels_api_key', label: 'Pexels API Key', placeholder: 'xxxxxxxxxxxx', group: '🖼️ 图片源' },
  { key: 'pixabay_api_key', label: 'Pixabay API Key', placeholder: 'xxxxxxxxxxxx', group: '🖼️ 图片源' },
  { key: 'wechat_app_id', label: '微信公众号 AppID', placeholder: 'wxxxxxxxxxxxxx', group: '💬 发布平台' },
  { key: 'wechat_app_secret', label: '微信公众号 AppSecret', placeholder: 'xxxxxxxxxxxx', group: '💬 发布平台' },
]

const DEFAULTS: { key: string; label: string; options: { label: string; value: string }[]; group: string }[] = [
  {
    key: 'default_style',
    label: '默认文章风格',
    options: [
      { label: '通俗易懂', value: '通俗易懂' },
      { label: '专业深度', value: '专业深度' },
      { label: '轻松幽默', value: '轻松幽默' },
      { label: '情感温暖', value: '情感温暖' },
    ],
    group: '⚙️ 默认设置',
  },
]

function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setMessage(null)
    GetSettings().then(json => {
      try {
        const arr: SettingEntry[] = JSON.parse(json)
        const map: Record<string, string> = {}
        arr.forEach(s => { map[s.key] = s.value })
        setSettings(map)
      } catch { /* ignore */ }
    })
    GetAppStatus().then(json => {
      try {
        const s = JSON.parse(json)
        const ai = s.aiProviders?.length ? s.aiProviders.join(', ') : '未配置'
        const img = s.imageSources?.length ? s.imageSources.join(', ') : '未配置'
        const pub = s.publishers?.length ? s.publishers.join(', ') : '未配置'
        setStatus(`AI: ${ai} ｜ 图源: ${img} ｜ 发布: ${pub}`)
      } catch { setStatus('') }
    })
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const entries = Object.entries(settings)
      .filter(([, v]) => v.trim())
      .map(([key, value]) => ({ key, value }))
    try {
      const result = await SaveSettings(JSON.stringify(entries))
      if (result === 'success') {
        setMessage({ type: 'success', text: '✓ 保存成功！请重启应用使配置生效。' })
      } else {
        setMessage({ type: 'error', text: result })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const groups = [...new Set(FIELDS.map(f => f.group))]
  const defaultGroups = [...new Set(DEFAULTS.map(f => f.group))]
  const allGroups = [...groups]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[680px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">⚙️ 设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {status && (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{status}</div>
          )}

          {allGroups.map(group => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{group}</h3>
              <div className="space-y-3">
                {FIELDS.filter(f => f.group === group).map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                    <input
                      type="password"
                      value={settings[field.key] || ''}
                      onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">⚙️ 默认设置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">默认文章风格</label>
                <select
                  value={settings['default_style'] || '通俗易懂'}
                  onChange={e => setSettings(s => ({ ...s, default_style: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  {DEFAULTS[0].options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">默认最少字数</label>
                  <input type="number" value={settings['default_word_min'] || '1000'}
                    onChange={e => setSettings(s => ({ ...s, default_word_min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">默认最多字数</label>
                  <input type="number" value={settings['default_word_max'] || '1500'}
                    onChange={e => setSettings(s => ({ ...s, default_word_max: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox"
                  checked={settings['default_is_draft'] !== 'false'}
                  onChange={e => setSettings(s => ({ ...s, default_is_draft: e.target.checked ? 'true' : 'false' }))}
                  className="accent-primary"
                />
                默认发布为草稿
              </label>
            </div>
          </div>

          <div className="text-xs text-gray-400 bg-yellow-50 rounded-lg px-3 py-2">
            💡 API Key 修改后需要重启应用才能生效
          </div>

          {message && (
            <div className={`text-sm rounded-lg px-3 py-2 ${
              message.type === 'success' ? 'bg-green-50 text-success' : 'bg-red-50 text-red-600'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary text-sm">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm flex items-center gap-2">
            {saving ? '保存中...' : '💾 保存设置'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsDialog
