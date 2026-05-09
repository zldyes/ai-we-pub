package models

type Setting struct {
	Key   string `json:"key" gorm:"primaryKey;size:100"`
	Value string `json:"value" gorm:"type:text"`
}

const (
	KeyDeepSeekKey    = "deepseek_api_key"
	KeyOpenAIKey      = "openai_api_key"
	KeyUnsplashKey    = "unsplash_api_key"
	KeyPexelsKey      = "pexels_api_key"
	KeyPixabayKey     = "pixabay_api_key"
	KeyWechatAppID    = "wechat_app_id"
	KeyWechatSecret   = "wechat_app_secret"
	KeyDefaultStyle   = "default_style"
	KeyDefaultWordMin = "default_word_min"
	KeyDefaultWordMax = "default_word_max"
	KeyDefaultDraft   = "default_is_draft"
)
