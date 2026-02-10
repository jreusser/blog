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

Hashtags:
- Use Twitter-like hashtags in markdown content, e.g. `#this-is-fine`.
- `#this is fine` is interpreted as the tag `this`.
- The blog home page shows aggregated hashtag counts; clicking a hashtag filters posts.

Markdown image links like `![alt](image.png)` will resolve via the backend at:

`/content/<post_id>/image.png`

## Run

- `docker compose up --build`
- Frontend: http://localhost:8088
- Backend: http://localhost:8000

## Install as a systemd service (server boot)

This installs a unit that runs `docker compose up -d` on boot.

- `sudo bash install.sh`
- Check status: `systemctl status reusserstudioblog.service`
- Logs: `journalctl -u reusserstudioblog.service -e`

API:
- `GET /api/posts`
- `GET /api/posts/{post_id}`

Cache:
- The backend caches the computed index for 1 hour in-memory.
- It also auto-invalidates the index cache when the mounted content directory changes.
