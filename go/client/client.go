package client

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

type Client struct {
    BaseURL string
    APIKey  string
    http    *http.Client
}

func New(baseURL, apiKey string) *Client {
    return &Client{
        BaseURL: stringsTrimRightSlash(baseURL),
        APIKey:  apiKey,
        http:    &http.Client{Timeout: 30 * time.Second},
    }
}

func stringsTrimRightSlash(s string) string {
    for len(s) > 0 && s[len(s)-1] == '/' {
        s = s[:len(s)-1]
    }
    return s
}

func (c *Client) request(method, path string, body any) (*http.Response, error) {
    var rdr io.Reader
    if body != nil {
        b, err := json.Marshal(body)
        if err != nil { return nil, err }
        rdr = bytes.NewReader(b)
    }
    req, err := http.NewRequest(method, c.BaseURL+path, rdr)
    if err != nil { return nil, err }
    req.Header.Set("Content-Type", "application/json")
    if c.APIKey != "" { req.Header.Set("x-api-key", c.APIKey) }
    return c.http.Do(req)
}

// Health
func (c *Client) Health() (map[string]any, error) {
    resp, err := c.request(http.MethodGet, "/healthz", nil)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var out map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
    if resp.StatusCode >= 400 { return out, fmt.Errorf("status %d", resp.StatusCode) }
    return out, nil
}

// Platform
func (c *Client) PlatformStatus() (map[string]any, error) {
    resp, err := c.request(http.MethodGet, "/api/platform", nil)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var out map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
    return out, nil
}

func (c *Client) PlatformInit() (map[string]any, error) {
    resp, err := c.request(http.MethodPost, "/api/platform/init", map[string]string{})
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var out map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
    return out, nil
}

// Files
func (c *Client) ReadFile(p string) (string, error) {
    u := fmt.Sprintf("%s/api/file?path=%s", c.BaseURL, url.QueryEscape(p))
    req, _ := http.NewRequest(http.MethodGet, u, nil)
    if c.APIKey != "" { req.Header.Set("x-api-key", c.APIKey) }
    resp, err := c.http.Do(req)
    if err != nil { return "", err }
    defer resp.Body.Close()
    b, _ := io.ReadAll(resp.Body)
    if resp.StatusCode >= 400 { return "", fmt.Errorf("status %d: %s", resp.StatusCode, string(b)) }
    return string(b), nil
}

func (c *Client) WriteFile(p, content string) error {
    _, err := c.request(http.MethodPost, "/api/file", map[string]any{"path": p, "content": content})
    return err
}

func (c *Client) DeleteFile(p string) error {
    _, err := c.request(http.MethodPost, "/api/file/delete", map[string]any{"path": p})
    return err
}

func (c *Client) MoveFile(from, to string) error {
    _, err := c.request(http.MethodPost, "/api/file/move", map[string]any{"from": from, "to": to})
    return err
}

// Chains / Jobs
type ExecuteResponse struct { JobID string `json:"jobId"` }

func (c *Client) ExecuteChainAsJob(id string, vars map[string]any) (string, error) {
    resp, err := c.request(http.MethodPost, "/api/chains/"+id+"/execute", map[string]any{"variables": vars, "asJob": true})
    if err != nil { return "", err }
    defer resp.Body.Close()
    var out ExecuteResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return "", err }
    if out.JobID == "" { return "", fmt.Errorf("no job id returned") }
    return out.JobID, nil
}

func (c *Client) GetJob(id string) (map[string]any, error) {
    resp, err := c.request(http.MethodGet, "/api/jobs/"+id, nil)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var out map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
    return out, nil
}

func (c *Client) CancelJob(id string) error {
    _, err := c.request(http.MethodPost, "/api/jobs/"+id+"/cancel", nil)
    return err
}

func (c *Client) RetryJob(id string) (string, error) {
    resp, err := c.request(http.MethodPost, "/api/jobs/"+id+"/retry", nil)
    if err != nil { return "", err }
    defer resp.Body.Close()
    var out ExecuteResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return "", err }
    return out.JobID, nil
}

