.PHONY: docker-build docker-up docker-down docker-logs

docker-build:
	docker build -t ai-coding-agent:latest .
	docker build -t ai-agent-proxy:latest -f go/Dockerfile.proxy go

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=100

