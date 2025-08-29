package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "os"
    "time"
)

func main() {
    target := getenv("AGENT_URL", "http://localhost:3000")
    apiKey := os.Getenv("AGENT_API_KEY")
    u, err := url.Parse(target)
    if err != nil { log.Fatal(err) }
    proxy := httputil.NewSingleHostReverseProxy(u)

    // basic logging + simple rate limiting via sleep when bursty
    last := time.Now()
    proxy.ModifyResponse = func(resp *http.Response) error {
        log.Printf("%s %s %d", resp.Request.Method, resp.Request.URL.Path, resp.StatusCode)
        return nil
    }
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if apiKey != "" { r.Header.Set("x-api-key", apiKey) }
        // naive throttle: sleep if requests too close (<2ms apart)
        now := time.Now()
        if now.Sub(last) < 2*time.Millisecond { time.Sleep(2 * time.Millisecond) }
        last = now
        proxy.ServeHTTP(w, r)
    })

    addr := getenv("PROXY_ADDR", ":8080")
    log.Println("agent proxy listening on", addr, "->", target)
    log.Fatal(http.ListenAndServe(addr, handler))
}

func getenv(k, d string) string { if v := os.Getenv(k); v != "" { return v }; return d }

