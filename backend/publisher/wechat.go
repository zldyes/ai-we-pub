package publisher

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

type WeChatPublisher struct {
	appID     string
	appSecret string
	client    *http.Client
}

func NewWeChatPublisher(appID, appSecret string) *WeChatPublisher {
	return &WeChatPublisher{appID: appID, appSecret: appSecret, client: &http.Client{}}
}

func (w *WeChatPublisher) Name() string { return "wechat" }

// supported tags for WeChat article content
var wechatAllowTags = map[string]bool{
	"a": true, "b": true, "blockquote": true, "br": true, "code": true,
	"dd": true, "div": true, "dl": true, "dt": true, "em": true,
	"h1": true, "h2": true, "h3": true, "h4": true, "h5": true, "h6": true,
	"hr": true, "i": true, "li": true, "ol": true, "p": true,
	"pre": true, "section": true, "span": true, "strong": true,
	"table": true, "td": true, "th": true, "tr": true, "ul": true,
}

var (
	reTag       = regexp.MustCompile(`<(/)?([a-zA-Z0-9]+)([^>]*)>`)
	reAttr      = regexp.MustCompile(`\s+(class|id|data-\w+)="[^"]*"`)
	reBr        = regexp.MustCompile(`<br\s*/?>`)
	reFigure    = regexp.MustCompile(`</?figure[^>]*>`)
	reFigcap    = regexp.MustCompile(`</?figcaption[^>]*>`)
	reImg       = regexp.MustCompile(`<img[^>]+>`)
	reImgSrc    = regexp.MustCompile(`src="([^"]+)"`)
	reExtraNL   = regexp.MustCompile(`\n{3,}`)
	reTrailingP = regexp.MustCompile(`<p>\s*</p>`)
)

func sanitizeWeChatContent(html string) string {
	// remove img tags (WeChat requires uploading images first via media/uploadimg)
	html = reImg.ReplaceAllString(html, "[图片]")

	// remove figure/figcaption wrappers
	html = reFigure.ReplaceAllString(html, "")
	html = reFigcap.ReplaceAllString(html, "")

	// normalize br
	html = reBr.ReplaceAllString(html, "<br>")

	// remove style/class/id/data-* attributes from remaining tags
	html = reAttr.ReplaceAllString(html, "")

	// strip unsupported tags (keep inner content)
	result := reTag.ReplaceAllStringFunc(html, func(match string) string {
		parts := reTag.FindStringSubmatch(match)
		if len(parts) < 3 {
			return match
		}
		isClose := parts[1] == "/"
		tagName := strings.ToLower(parts[2])

		if wechatAllowTags[tagName] {
			return match
		}

		// strip unsupported tags, keep their content
		if isClose {
			return ""
		}
		return ""
	})

	// clean up extra newlines and empty paragraphs
	result = reExtraNL.ReplaceAllString(result, "\n")
	result = reTrailingP.ReplaceAllString(result, "")

	return strings.TrimSpace(result)
}

type wechatTokenResp struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	ErrCode     int    `json:"errcode,omitempty"`
	ErrMsg      string `json:"errmsg,omitempty"`
}

func (w *WeChatPublisher) getAccessToken(ctx context.Context) (string, error) {
	query := url.Values{}
	query.Set("grant_type", "client_credential")
	query.Set("appid", w.appID)
	query.Set("secret", w.appSecret)

	req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.weixin.qq.com/cgi-bin/token?"+query.Encode(), nil)
	resp, err := w.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result wechatTokenResp
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.ErrCode != 0 {
		return "", fmt.Errorf("wechat token error: %s", result.ErrMsg)
	}
	return result.AccessToken, nil
}

type draftContent struct {
	Title            string `json:"title"`
	ThumbMediaID     string `json:"thumb_media_id,omitempty"`
	Author           string `json:"author,omitempty"`
	Digest           string `json:"digest,omitempty"`
	ShowCoverPic     int    `json:"show_cover_pic,omitempty"`
	Content          string `json:"content"`
	ContentSourceURL string `json:"content_source_url,omitempty"`
}

type addDraftReq struct {
	Articles []draftContent `json:"articles"`
}

type addDraftResp struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	MediaID string `json:"media_id"`
}

// uploadImage uploads an image from a URL to WeChat CDN and returns the media_id.
func (w *WeChatPublisher) uploadImage(ctx context.Context, token, imageURL string) (string, error) {
	// download the image first
	imgResp, err := w.client.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("download image failed: %w", err)
	}
	defer imgResp.Body.Close()

	imgData, err := io.ReadAll(imgResp.Body)
	if err != nil {
		return "", fmt.Errorf("read image failed: %w", err)
	}

	// build multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("media", "cover.jpg")
	if err != nil {
		return "", fmt.Errorf("create form file failed: %w", err)
	}
	_, _ = part.Write(imgData)
	writer.Close()

	apiURL := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=%s&type=image", token)
	req, _ := http.NewRequestWithContext(ctx, "POST", apiURL, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := w.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		MediaID string `json:"media_id"`
		URL     string `json:"url"`
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	json.Unmarshal(respBody, &result)

	if result.ErrCode != 0 {
		return "", fmt.Errorf("upload image error: errcode=%d %s", result.ErrCode, result.ErrMsg)
	}
	if result.MediaID == "" {
		return "", fmt.Errorf("upload image returned empty media_id")
	}
	return result.MediaID, nil
}

func (w *WeChatPublisher) Publish(ctx context.Context, article Article) (*PublishResult, error) {
	token, err := w.getAccessToken(ctx)
	if err != nil {
		return &PublishResult{Success: false, Platform: "wechat", Error: err.Error()}, nil
	}

	sanitized := sanitizeWeChatContent(article.Content)

	// upload cover image if provided
	var thumbMediaID string
	if article.CoverURL != "" {
		mid, err := w.uploadImage(ctx, token, article.CoverURL)
		if err != nil {
			// log upload error but still proceed without cover
			println("upload cover image failed:", err.Error())
		} else {
			thumbMediaID = mid
		}
	}

	draftReq := addDraftReq{
		Articles: []draftContent{{
			Title:        article.Title,
			ThumbMediaID: thumbMediaID,
			Content:      sanitized,
		}},
	}

	data, _ := json.Marshal(draftReq)
	apiURL := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/draft/add?access_token=%s", token)
	req, _ := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")

	resp, err := w.client.Do(req)
	if err != nil {
		return &PublishResult{Success: false, Platform: "wechat", Error: err.Error()}, nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result addDraftResp
	json.Unmarshal(body, &result)

	if result.ErrCode != 0 {
		return &PublishResult{
			Success:  false,
			Platform: "wechat",
			Error:    fmt.Sprintf("errcode=%d: %s", result.ErrCode, result.ErrMsg),
		}, nil
	}

	return &PublishResult{
		Success:  true,
		Platform: "wechat",
		URL:      "",
	}, nil
}
