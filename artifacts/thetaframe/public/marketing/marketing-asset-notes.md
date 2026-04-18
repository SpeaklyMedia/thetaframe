# C49 Marketing Asset Notes

Date: 2026-04-18

## Source Files

- Stress screamer source: `https://drive.google.com/file/d/1pV2dinm7wh4wZYCqWwpnddCl-c7nho1F/view?usp=sharing`
- Beach chair screamer source: `https://drive.google.com/file/d/1FimKf0sArrXARg88eReEU529peyGljZe/view?usp=sharing`

Both source links resolved as PNG files:

- stress source: `1024 x 1536`
- beach chair source: `1024 x 1536`

## Committed Outputs

- `screamer-stress.webp`
- `screamer-beach-chair.webp`

## Transform

The source PNG files were downloaded to `/tmp/thetaframe-c49`, stripped, and converted with ImageMagick:

```bash
convert <source>.png -strip -resize '1800x1800>' -quality 82 <output>.webp
```

The raw PNG downloads were not committed.
