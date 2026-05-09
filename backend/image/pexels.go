package image

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type PexelsSource struct {
	apiKey string
	client *http.Client
}

func NewPexelsSource(apiKey string) *PexelsSource {
	return &PexelsSource{apiKey: apiKey, client: &http.Client{}}
}

func (p *PexelsSource) Name() string { return "Pexels" }

func (p *PexelsSource) Search(ctx context.Context, params SearchParams) ([]ImageItem, error) {
	query := url.Values{}
	query.Set("query", params.Query)
	query.Set("per_page", fmt.Sprint(params.Count))

	req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.pexels.com/v1/search?"+query.Encode(), nil)
	req.Header.Set("Authorization", p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("pexels error: %s", string(body))
	}

	var result struct {
		Photos []struct {
			ID  int `json:"id"`
			Src struct {
				Original string `json:"original"`
				Medium   string `json:"medium"`
				Tiny     string `json:"tiny"`
			} `json:"src"`
			Photographer string `json:"photographer"`
			URL          string `json:"url"`
		} `json:"photos"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	var items []ImageItem
	for _, photo := range result.Photos {
		items = append(items, ImageItem{
			ID:       fmt.Sprintf("pexels_%d", photo.ID),
			URL:      photo.Src.Original,
			ThumbURL: photo.Src.Tiny,
			Author:   photo.Photographer,
			Source:   "Pexels",
			PageURL:  photo.URL,
		})
	}
	return items, nil
}
