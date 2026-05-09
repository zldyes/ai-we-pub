package image

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type PixabaySource struct {
	apiKey string
	client *http.Client
}

func NewPixabaySource(apiKey string) *PixabaySource {
	return &PixabaySource{apiKey: apiKey, client: &http.Client{}}
}

func (p *PixabaySource) Name() string { return "Pixabay" }

func (p *PixabaySource) Search(ctx context.Context, params SearchParams) ([]ImageItem, error) {
	query := url.Values{}
	query.Set("key", p.apiKey)
	query.Set("q", params.Query)
	query.Set("per_page", fmt.Sprint(params.Count))
	query.Set("safesearch", "true")

	req, _ := http.NewRequestWithContext(ctx, "GET", "https://pixabay.com/api/?"+query.Encode(), nil)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("pixabay error: %s", string(body))
	}

	var result struct {
		Hits []struct {
			ID           int    `json:"id"`
			WebformatURL string `json:"webformatURL"`
			PreviewURL   string `json:"previewURL"`
			PageURL      string `json:"pageURL"`
			User         string `json:"user"`
			LargeImageURL string `json:"largeImageURL"`
		} `json:"hits"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	var items []ImageItem
	for _, hit := range result.Hits {
		items = append(items, ImageItem{
			ID:       fmt.Sprintf("pixabay_%d", hit.ID),
			URL:      hit.LargeImageURL,
			ThumbURL: hit.PreviewURL,
			Author:   hit.User,
			Source:   "Pixabay",
			PageURL:  hit.PageURL,
		})
	}
	return items, nil
}
