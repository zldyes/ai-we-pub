package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type DeepSeekProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

func NewDeepSeekProvider(apiKey string) *DeepSeekProvider {
	return &DeepSeekProvider{
		apiKey:  apiKey,
		baseURL: "https://api.deepseek.com",
		model:   "deepseek-chat",
		client:  &http.Client{},
	}
}

func (d *DeepSeekProvider) Name() string { return "DeepSeek" }

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

func (d *DeepSeekProvider) chat(ctx context.Context, messages []chatMessage) (string, error) {
	body := chatRequest{
		Model:    d.model,
		Messages: messages,
	}
	data, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", d.baseURL+"/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+d.apiKey)

	resp, err := d.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("deepseek API error: %s", string(respBody))
	}

	var result chatResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no choices returned")
	}
	return result.Choices[0].Message.Content, nil
}

func (d *DeepSeekProvider) Generate(ctx context.Context, params GenerateParams) (*GenerateResult, error) {
	messages := []chatMessage{
		{Role: "system", Content: DeAifySystemPrompt},
		{Role: "user", Content: fmt.Sprintf("请写一篇关于「%s」的公众号文章，风格：%s，字数：%d-%d字", params.Topic, params.Style, params.WordMin, params.WordMax)},
	}
	content, err := d.chat(ctx, messages)
	if err != nil {
		return nil, err
	}
	return &GenerateResult{Title: params.Topic, Content: content}, nil
}

func (d *DeepSeekProvider) Continue(ctx context.Context, content, instruction string) (string, error) {
	messages := []chatMessage{
		{Role: "user", Content: content},
		{Role: "user", Content: instruction},
	}
	return d.chat(ctx, messages)
}
