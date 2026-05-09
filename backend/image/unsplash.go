package image

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type UnsplashSource struct {
	clientID string
	client   *http.Client
}

func NewUnsplashSource(clientID string) *UnsplashSource {
	return &UnsplashSource{clientID: clientID, client: &http.Client{}}
}

func (u *UnsplashSource) Name() string { return "Unsplash" }

func (u *UnsplashSource) Search(ctx context.Context, params SearchParams) ([]ImageItem, error) {
	query := url.Values{}
	query.Set("query", params.Query)
	query.Set("per_page", fmt.Sprint(params.Count))
	query.Set("orientation", "landscape")

	req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.unsplash.com/search/photos?"+query.Encode(), nil)
	req.Header.Set("Authorization", "Client-ID "+u.clientID)

	resp, err := u.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("unsplash error: %s", string(body))
	}

	var result struct {
		Results []struct {
			ID  string `json:"id"`
			Urls struct {
				Regular string `json:"regular"`
				Thumb   string `json:"thumb"`
			} `json:"urls"`
			User struct {
				Name     string `json:"name"`
				Links    struct {
					HTML string `json:"html"`
				} `json:"links"`
			} `json:"user"`
			Links struct {
				HTML string `json:"html"`
			} `json:"links"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	var items []ImageItem
	for _, r := range result.Results {
		items = append(items, ImageItem{
			ID:       "unsplash_" + r.ID,
			URL:      r.Urls.Regular,
			ThumbURL: r.Urls.Thumb,
			Author:   r.User.Name,
			Source:   "Unsplash",
			PageURL:  r.Links.HTML,
		})
	}
	return items, nil
}
