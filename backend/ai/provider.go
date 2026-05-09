package ai

import "context"

type GenerateParams struct {
	Topic   string `json:"topic"`
	Style   string `json:"style"`
	WordMin int    `json:"wordMin"`
	WordMax int    `json:"wordMax"`
}

type GenerateResult struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type Provider interface {
	Name() string
	Generate(ctx context.Context, params GenerateParams) (*GenerateResult, error)
	Continue(ctx context.Context, content, instruction string) (string, error)
}

type Manager struct {
	providers map[string]Provider
	default_  string
}

func NewManager() *Manager {
	return &Manager{providers: make(map[string]Provider)}
}

func (m *Manager) Register(p Provider) {
	m.providers[p.Name()] = p
	if m.default_ == "" {
		m.default_ = p.Name()
	}
}

func (m *Manager) Get(name string) Provider {
	if p, ok := m.providers[name]; ok {
		return p
	}
	return m.providers[m.default_]
}

func (m *Manager) List() []string {
	var names []string
	for name := range m.providers {
		names = append(names, name)
	}
	return names
}
