# Image Extractor Pro — Vercel

A responsive webpage that extracts public image URLs from direct image links and common HTML image metadata/tags.

## Deploy on Vercel
1. Upload the contents of this folder to a GitHub repository.
2. Import the repository at https://vercel.com/new.
3. Choose Other if asked for a framework. Leave build/output commands empty.
4. Deploy. No environment variables are needed.

## Use
Open the deployed site, paste a public webpage URL, and press **Extract images**. Preview the results and copy an image URL for your Telegram bot's `IMAGE_LINKS` list.

## Supported
- Direct public image URLs
- Open Graph and Twitter preview image metadata
- Standard `<img>` tags, lazy image attributes, `srcset`, `<picture>` sources, and `link rel=image_src`
- Up to 80 image candidates per page

## Limitations
This tool does not run page JavaScript, sign in, bypass paywalls, or bypass anti-bot restrictions. Some sites intentionally hide or block images. Use only images you have permission to download or share.

This is a starter project for personal use. A public deployment should add rate limiting, usage limits, and further abuse protection.
