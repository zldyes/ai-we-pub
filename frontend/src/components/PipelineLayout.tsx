import { useState } from 'react'
import { PipelineProvider } from './PipelineContext'
import SettingsDialog from './SettingsDialog'
import Step1Create from './steps/Step1Create'
import Step2Image from './steps/Step2Image'
import Step3Format from './steps/Step3Format'
import Step4Publish from './steps/Step4Publish'

const STEPS = [
  { id: 1, label: '创作文章', icon: '📝', desc: 'AI 生成 + 人工编辑' },
  { id: 2, label: '配图', icon: '🖼️', desc: '搜索免费版权图片' },
  { id: 3, label: '排版', icon: '✨', desc: '精美排版 + 手机预览' },
  { id: 4, label: '发布', icon: '🚀', desc: '一键发布到草稿箱' },
]

function PipelineLayout() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const goNext = () => {
    if (currentStep < STEPS.length) {
      setCompletedSteps(prev => new Set(prev).add(currentStep))
      setCurrentStep(s => s + 1)
    }
  }

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Create />
      case 2: return <Step2Image />
      case 3: return <Step3Format />
      case 4: return <Step4Publish />
      default: return null
    }
  }

  return (
    <PipelineProvider>
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <h1 className="text-xl font-bold text-gray-800">AI 公众号助手</h1>
          <span className="text-xs text-gray-400 ml-2">流水线 v1.0</span>
          <span className="flex-1" />
          <button onClick={() => setSettingsOpen(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
            title="设置">
            ⚙️
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center max-w-4xl mx-auto">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`step-circle ${
                  completedSteps.has(step.id)
                    ? 'bg-success text-white'
                    : currentStep === step.id
                      ? 'bg-primary text-white ring-4 ring-primary-light'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {completedSteps.has(step.id) ? '✓' : step.icon}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  currentStep === step.id ? 'text-primary' : 'text-gray-500'
                }`}>{step.label}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{step.desc}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`step-line mx-4 ${
                  completedSteps.has(step.id) ? 'bg-success' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 1}
            className="btn-secondary flex items-center gap-2"
          >
            ◀ 上一步
          </button>
          <span className="text-sm text-gray-400">
            步骤 {currentStep} / {STEPS.length}
          </span>
          {currentStep < STEPS.length ? (
            <button onClick={goNext} className="btn-primary flex items-center gap-2">
              下一步 ▶
            </button>
          ) : (
            <span className="text-sm text-success font-medium">✓ 已完成全部步骤</span>
          )}
        </div>
      </footer>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
    </PipelineProvider>
  )
}

export default PipelineLayout
