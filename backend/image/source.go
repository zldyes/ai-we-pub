package image

import "context"

type ImageItem struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	ThumbURL string `json:"thumbUrl"`
	Author   string `json:"author"`
	Source   string `json:"source"`
	PageURL  string `json:"pageUrl"`
}

type SearchParams struct {
	Query string `json:"query"`
	Count int    `json:"count"`
}

type Source interface {
	Name() string
	Search(ctx context.Context, params SearchParams) ([]ImageItem, error)
}

type Aggregator struct {
	sources []Source
}

func NewAggregator() *Aggregator {
	return &Aggregator{}
}

func (a *Aggregator) Add(s Source) {
	a.sources = append(a.sources, s)
}

func (a *Aggregator) SearchAll(ctx context.Context, params SearchParams) []ImageItem {
	type result struct {
		items []ImageItem
		src   string
	}
	ch := make(chan result, len(a.sources))
	for _, s := range a.sources {
		s := s
		go func() {
			items, err := s.Search(ctx, params)
			if err != nil {
				ch <- result{items: nil, src: s.Name()}
				return
			}
			ch <- result{items: items, src: s.Name()}
		}()
	}

	var all []ImageItem
	for range a.sources {
		r := <-ch
		all = append(all, r.items...)
	}
	return all
}
