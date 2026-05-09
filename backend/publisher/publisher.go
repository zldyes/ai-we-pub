package publisher

import "context"

type Article struct {
	Title      string `json:"title"`
	Content    string `json:"content"`
	CoverURL   string `json:"coverUrl"`
	Author     string `json:"author"`
	IsDraft    bool   `json:"isDraft"`
}

type PublishResult struct {
	Success  bool   `json:"success"`
	Platform string `json:"platform"`
	URL      string `json:"url"`
	Error    string `json:"error,omitempty"`
}

type Publisher interface {
	Name() string
	Publish(ctx context.Context, article Article) (*PublishResult, error)
}

type Manager struct {
	publishers map[string]Publisher
}

func NewManager() *Manager {
	return &Manager{publishers: make(map[string]Publisher)}
}

func (m *Manager) Register(p Publisher) {
	m.publishers[p.Name()] = p
}

func (m *Manager) Get(name string) Publisher {
	return m.publishers[name]
}

func (m *Manager) List() []string {
	var names []string
	for name := range m.publishers {
		names = append(names, name)
	}
	return names
}

func (m *Manager) PublishAll(ctx context.Context, article Article) []*PublishResult {
	var results []*PublishResult
	for name, p := range m.publishers {
		r, err := p.Publish(ctx, article)
		if err != nil {
			r = &PublishResult{Success: false, Platform: name, Error: err.Error()}
		}
		results = append(results, r)
	}
	return results
}
