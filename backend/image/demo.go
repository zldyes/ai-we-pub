package image

import (
	"context"
	"fmt"
	"math/rand"
)

type DemoSoure struct{}

func NewDemoSource() *DemoSoure {
	return &DemoSoure{}
}

func (d *DemoSoure) Name() string { return "Demo" }

func (d *DemoSoure) Search(ctx context.Context, params SearchParams) ([]ImageItem, error) {
	count := params.Count
	if count <= 0 || count > 30 {
		count = 12
	}

	seed := rand.Intn(1000)
	var items []ImageItem
	for i := 0; i < count; i++ {
		id := seed + i
		items = append(items, ImageItem{
			ID:       fmt.Sprintf("demo_%d", id),
			URL:      fmt.Sprintf("https://picsum.photos/seed/%d/800/600", id),
			ThumbURL: fmt.Sprintf("https://picsum.photos/seed/%d/400/300", id),
			Author:   "Picsum Photos",
			Source:   "Demo",
			PageURL:  "https://picsum.photos",
		})
	}
	return items, nil
}
