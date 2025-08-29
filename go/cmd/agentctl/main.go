package main

import (
    "flag"
    "fmt"
    "os"
    c "ai-coding-agent/client"
)

func main() {
    base := getenv("AGENT_URL", "http://localhost:3000")
    key := os.Getenv("AGENT_API_KEY")
    cli := c.New(base, key)

    if len(os.Args) < 2 {
        usage()
        return
    }
    cmd := os.Args[1]
    switch cmd {
    case "health":
        h, err := cli.Health()
        must(err)
        fmt.Println(h)
    case "platform:init":
        out, err := cli.PlatformInit()
        must(err)
        fmt.Println(out)
    case "file:get":
        fs := flag.NewFlagSet("file:get", flag.ExitOnError)
        path := fs.String("path", "", "file path")
        fs.Parse(os.Args[2:])
        if *path == "" { must(fmt.Errorf("--path required")) }
        content, err := cli.ReadFile(*path)
        must(err)
        fmt.Println(content)
    case "file:put":
        fs := flag.NewFlagSet("file:put", flag.ExitOnError)
        path := fs.String("path", "", "file path")
        fs.Parse(os.Args[2:])
        if *path == "" { must(fmt.Errorf("--path required")) }
        b, _ := os.ReadFile("-")
        err := cli.WriteFile(*path, string(b))
        must(err)
        fmt.Println("ok")
    case "chain:run":
        fs := flag.NewFlagSet("chain:run", flag.ExitOnError)
        id := fs.String("id", "", "chain id")
        fs.Parse(os.Args[2:])
        if *id == "" { must(fmt.Errorf("--id required")) }
        job, err := cli.ExecuteChainAsJob(*id, map[string]any{})
        must(err)
        fmt.Println(job)
    default:
        usage()
    }
}

func getenv(k, d string) string { if v := os.Getenv(k); v != "" { return v }; return d }
func must(err error) { if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) } }
func usage() { fmt.Println("usage: agentctl [health|platform:init|file:get --path P|file:put --path P|chain:run --id ID]") }

