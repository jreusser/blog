from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .content_index import TTLCache, build_index, load_post


CONTENT_DIR = Path(os.environ.get("BLOG_CONTENT_DIR", "/content")).resolve()
CACHE_SECONDS = int(os.environ.get("BLOG_CACHE_SECONDS", "3600"))

app = FastAPI(title="Reusser Studio Blog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("BLOG_CORS_ORIGIN", "*")],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

index_cache = TTLCache(ttl_seconds=CACHE_SECONDS)

# Serve images and other assets from the content directory
# URLs in markdown like ![alt](image.png) can be resolved client-side to:
# /content/<post_id>/image.png
app.mount("/content", StaticFiles(directory=str(CONTENT_DIR), html=False), name="content")


@app.get("/api/posts")
def get_posts():
    cached = index_cache.get()
    if cached is not None:
        return cached

    data = build_index(CONTENT_DIR)
    index_cache.set(data)
    return data


@app.get("/api/posts/{post_id:path}")
def get_post(post_id: str):
    post = load_post(CONTENT_DIR, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    return {
        "id": post.id,
        "title": post.title,
        "date_path": post.date_path,
        "markdown": post.markdown,
    }


@app.post("/api/cache/clear")
def clear_cache():
    # Simple admin hook; not exposed in UI.
    index_cache.clear()
    return {"ok": True}
