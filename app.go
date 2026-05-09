package main

import (
	"context"
	"encoding/json"
	"os"

	"ai-we-pub/backend/ai"
	"ai-we-pub/backend/config"
	"ai-we-pub/backend/image"
	"ai-we-pub/backend/models"
	"ai-we-pub/backend/publisher"
	"ai-we-pub/backend/scheduler"
)

type App struct {
	ctx       context.Context
	aiMgr     *ai.Manager
	imgAgg    *image.Aggregator
	pubMgr    *publisher.Manager
	sched     *scheduler.Scheduler
	cfg       *config.Config
	status    AppStatus
}

type AppStatus struct {
	AIProviders  []string `json:"aiProviders"`
	ImageSources []string `json:"imageSources"`
	Publishers   []string `json:"publishers"`
	DBReady      bool     `json:"dbReady"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.status = AppStatus{}

	cfg, err := config.New("data/ai-we-pub.db")
	if err != nil {
		println("config init error:", err.Error())
		return
	}
	a.cfg = cfg
	cfg.AutoMigrate(&models.Article{}, &models.PlatformConfig{}, &models.Setting{}, &scheduler.Task{})
	a.status.DBReady = true

	a.aiMgr = ai.NewManager()
	if key := a.getSettingOrEnv(models.KeyDeepSeekKey, "DEEPSEEK_API_KEY"); key != "" {
		a.aiMgr.Register(ai.NewDeepSeekProvider(key))
		a.status.AIProviders = append(a.status.AIProviders, "DeepSeek")
	}

	a.imgAgg = image.NewAggregator()
	if key := a.getSettingOrEnv(models.KeyUnsplashKey, "UNSPLASH_API_KEY"); key != "" {
		a.imgAgg.Add(image.NewUnsplashSource(key))
		a.status.ImageSources = append(a.status.ImageSources, "Unsplash")
	}
	if key := a.getSettingOrEnv(models.KeyPexelsKey, "PEXELS_API_KEY"); key != "" {
		a.imgAgg.Add(image.NewPexelsSource(key))
		a.status.ImageSources = append(a.status.ImageSources, "Pexels")
	}
	if key := a.getSettingOrEnv(models.KeyPixabayKey, "PIXABAY_API_KEY"); key != "" {
		a.imgAgg.Add(image.NewPixabaySource(key))
		a.status.ImageSources = append(a.status.ImageSources, "Pixabay")
	}
	// fallback demo source (always available, no API key needed)
	a.imgAgg.Add(image.NewDemoSource())
	a.status.ImageSources = append(a.status.ImageSources, "Demo")

	a.pubMgr = publisher.NewManager()
	if id := a.getSettingOrEnv(models.KeyWechatAppID, "WECHAT_APP_ID"); id != "" {
		if secret := a.getSettingOrEnv(models.KeyWechatSecret, "WECHAT_APP_SECRET"); secret != "" {
			a.pubMgr.Register(publisher.NewWeChatPublisher(id, secret))
			a.status.Publishers = append(a.status.Publishers, "wechat")
		}
	}

	a.sched = scheduler.New()
	a.sched.OnTask(func(task *scheduler.Task) {
		println("executing task:", task.Name)
	})
	a.sched.Start()

	println("AI 公众号助手 started")
}

func (a *App) getSettingOrEnv(key, envName string) string {
	if a.cfg != nil {
		var s models.Setting
		if err := a.cfg.DB.First(&s, "key = ?", key).Error; err == nil && s.Value != "" {
			return s.Value
		}
	}
	return os.Getenv(envName)
}

func (a *App) shutdown(ctx context.Context) {
	if a.sched != nil {
		a.sched.Stop()
	}
}

func (a *App) GetAppStatus() string {
	data, _ := json.Marshal(a.status)
	return string(data)
}

func (a *App) SaveSettings(settingsJSON string) string {
	var settings []models.Setting
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return "error: " + err.Error()
	}
	for i := range settings {
		if settings[i].Value == "" {
			continue
		}
		if err := a.cfg.DB.Save(&settings[i]).Error; err != nil {
			return "error: " + err.Error()
		}
	}
	return "success"
}

func (a *App) GetSettings() string {
	var all []models.Setting
	a.cfg.DB.Find(&all)
	data, _ := json.Marshal(all)
	return string(data)
}

func (a *App) SaveLastArticle(title, content string) string {
	blob, _ := json.Marshal(map[string]string{"title": title, "content": content})
	println("SaveLastArticle: title=", title, " len(content)=", len(content))
	if err := a.cfg.DB.Save(&models.Setting{Key: "last_article", Value: string(blob)}).Error; err != nil {
		println("SaveLastArticle error:", err.Error())
		return "error: " + err.Error()
	}
	println("SaveLastArticle: success")
	return "success"
}

func (a *App) LoadLastArticle() string {
	type result struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	var s models.Setting
	if err := a.cfg.DB.Where("key = ?", "last_article").First(&s).Error; err == nil {
		var r result
		if err := json.Unmarshal([]byte(s.Value), &r); err == nil {
			println("LoadLastArticle: found from settings, title=", r.Title, " len(content)=", len(r.Content))
			data, _ := json.Marshal(r)
			return string(data)
		}
	}
	// migration: check old format (two separate rows)
	var oldTitle models.Setting
	if err := a.cfg.DB.Where("key = ?", "last_article_title").First(&oldTitle).Error; err == nil {
		var oldContent models.Setting
		a.cfg.DB.Where("key = ?", "last_article_content").First(&oldContent)
		blob, _ := json.Marshal(map[string]string{"title": oldTitle.Value, "content": oldContent.Value})
		a.cfg.DB.Save(&models.Setting{Key: "last_article", Value: string(blob)})
		a.cfg.DB.Delete(&models.Setting{Key: "last_article_title"})
		a.cfg.DB.Delete(&models.Setting{Key: "last_article_content"})
		println("LoadLastArticle: migrated old format, title=", oldTitle.Value)
		data, _ := json.Marshal(result{Title: oldTitle.Value, Content: oldContent.Value})
		return string(data)
	}
	// fallback: get latest article from articles table
	var art models.Article
	if err := a.cfg.DB.Order("id desc").First(&art).Error; err == nil {
		println("LoadLastArticle: fallback to articles table, title=", art.Title, " len(content)=", len(art.Content))
		data, _ := json.Marshal(result{Title: art.Title, Content: art.Content})
		return string(data)
	}
	println("LoadLastArticle: nothing found")
	data, _ := json.Marshal(result{Title: "", Content: ""})
	return string(data)
}

func (a *App) GetAIProviders() []string {
	return a.aiMgr.List()
}

func (a *App) GenerateArticle(provider, topic, style string, wordMin, wordMax int) string {
	p := a.aiMgr.Get(provider)
	if p == nil {
		return "error: 未配置 AI 提供者，请设置环境变量 DEEPSEEK_API_KEY"
	}
	result, err := p.Generate(a.ctx, ai.GenerateParams{
		Topic:   topic,
		Style:   style,
		WordMin: wordMin,
		WordMax: wordMax,
	})
	if err != nil {
		return "error: " + err.Error()
	}
	data, _ := json.Marshal(result)

	a.cfg.DB.Create(&models.Article{
		Title:   result.Title,
		Content: result.Content,
		Style:   style,
	})

	return string(data)
}

func (a *App) SearchImages(query string, count int) string {
	items := a.imgAgg.SearchAll(a.ctx, image.SearchParams{
		Query: query,
		Count: count,
	})
	if items == nil {
		items = []image.ImageItem{}
	}
	data, _ := json.Marshal(items)
	return string(data)
}

func (a *App) PublishArticle(platform, title, content, coverURL string, isDraft bool) string {
	p := a.pubMgr.Get(platform)
	if p == nil {
		return `{"success":false,"error":"请先配置微信 API Key"}`
	}
	result, err := p.Publish(a.ctx, publisher.Article{
		Title:    title,
		Content:  content,
		CoverURL: coverURL,
		IsDraft:  isDraft,
	})
	if err != nil {
		data, _ := json.Marshal(&publisher.PublishResult{Success: false, Platform: platform, Error: err.Error()})
		return string(data)
	}
	data, _ := json.Marshal(result)
	return string(data)
}

func (a *App) AddScheduledTask(name, topic, cronExpr, style, platforms string) string {
	task := &scheduler.Task{
		Name:      name,
		Topic:     topic,
		CronExpr:  cronExpr,
		Style:     style,
		Platforms: platforms,
		Status:    scheduler.TaskStatusPending,
	}
	a.cfg.DB.Create(task)
	err := a.sched.AddTask(task)
	if err != nil {
		return "error: " + err.Error()
	}
	return "success"
}

func (a *App) ListTasks() string {
	var tasks []scheduler.Task
	a.cfg.DB.Find(&tasks)
	data, _ := json.Marshal(tasks)
	return string(data)
}

func (a *App) RemoveTask(taskID int) string {
	a.sched.RemoveTask(uint(taskID))
	a.cfg.DB.Delete(&scheduler.Task{}, taskID)
	return "success"
}
