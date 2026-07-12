# Kirtan Audio Placeholder

Place your ambient kirtan MP3 file here:

```
public/audio/kirtan.mp3
```

## Recommended Sources

- Record a simple harmonium/mridanga track
- Use royalty-free kirtan recordings
- ISKCON's official kirtan recordings (check licensing)

## Suggested: Convert to web-optimized format

```bash
# Convert to a web-friendly MP3 (128kbps is fine for background music)
ffmpeg -i input.mp3 -b:a 128k -ac 1 kirtan.mp3
```

The audio player will silently fail if the file is missing — no crash.
