# Reusser Studio Blog (BE/FE)

## Content directory format

Mounted into the backend as `/content` (see `docker-compose.yml`).

Expected pattern:

```
blog-content/
  2026/
    February/
      10/
        my-first-post/
          index.md
          image.png   (optional)
```

Rules:
- Each entry has its own folder.
- Exactly **one** `.md` file per entry folder.
- Images can live alongside the `.md` file.

Markdown image links like `![alt](image.png)` will resolve via the backend at:

`/content/<post_id>/image.png`

## Run

- `docker compose up --build`
- Frontend: http://localhost:8080
- Backend: http://localhost:8000

API:
- `GET /api/posts`
- `GET /api/posts/{post_id}`

Cache:
- The backend caches the computed index for 1 hour in-memory.
- It also auto-invalidates the index cache when the mounted content directory changes.
