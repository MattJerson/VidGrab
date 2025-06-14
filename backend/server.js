const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const ytdl = require("@distube/ytdl-core");
const { exec } = require("child_process");
const util = require("util");
const asyncExec = util.promisify(exec);

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(cors());

app.get("/api/download", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl)
    return res.status(400).json({ error: "Missing 'url' parameter" });

  try {
    // 🔹 TikTok via RapidAPI
    if (videoUrl.includes("tiktok.com")) {
      console.log("[RapidAPI] Resolving TikTok:", videoUrl);

      const tiktokRes = await fetch(
        `https://tiktok-api23.p.rapidapi.com/api/download/video?url=${encodeURIComponent(
          videoUrl
        )}`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-key":
              "6f78b0d526mshcfc5f22a99191bcp14dcb9jsn3532c6f01716",
            "x-rapidapi-host": "tiktok-api23.p.rapidapi.com",
          },
        }
      );

      if (!tiktokRes.ok) {
        console.error("[RapidAPI] TikTok API failed:", tiktokRes.status);
        return res
          .status(429)
          .json({ error: "TikTok API rate limit exceeded. Try again later." });
      }

      const result = await tiktokRes.json();
      const formats = [];

      if (result.play) {
        formats.push({
          url: result.play,
          format_id: "mp4",
          ext: "mp4",
          quality: "No Watermark",
          size: "Unknown",
        });
      }

      if (result.play_watermark) {
        formats.push({
          url: result.play_watermark,
          format_id: "mp4",
          ext: "mp4",
          quality: "With Watermark",
          size: "Unknown",
        });
      }

      return res.json({
        title: "TikTok Video",
        thumbnail: "",
        formats,
      });
    }

    // 🔹 YouTube via ytdl-core
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      console.log("[YouTube] Using BDBots API:", videoUrl);

      try {
        // 🔹 Step 1: Try BDBots API first
        const bdbotsRes = await fetch(
          `https://yt.bdbots.xyz/dl?url=${encodeURIComponent(videoUrl)}`
        );
        if (!bdbotsRes.ok) {
          throw new Error(`BDBots failed: ${bdbotsRes.status}`);
        }

        const data = await bdbotsRes.json();
        const formats = (data.available_formats || []).map((f) => ({
          url: f.url,
          format_id: f.format_id,
          ext: f.extension,
          quality: f.quality || `${f.width || ""}x${f.height || ""}`,
          size: f.file_size || "Unknown",
        }));

        return res.json({
          title: data.video_info.title || "YouTube Video",
          thumbnail: data.video_info.thumbnail || "",
          formats,
        });
      } catch (err) {
        console.warn("[BDBots API] failed:", err.message);
        // 🔸 Step 2: Fallback to ytdl-core
        try {
          if (!ytdl.validateURL(videoUrl)) {
            throw new Error("Invalid YouTube URL");
          }

          const info = (await ytdl.getInfo(videoUrl)).videoDetails;
          const protocol = req.protocol || "http";

          return res.json({
            title: info.title || "YouTube Video",
            thumbnail: info.thumbnails?.[2]?.url || "",
            formats: [
              {
                url: `${protocol}://${
                  req.headers.host
                }/api/stream/mp4?url=${encodeURIComponent(videoUrl)}`,
                format_id: "mp4",
                ext: "mp4",
                quality: "highest",
                size: "Streaming",
              },
            ],
          });
        } catch (e) {
          console.error("[ytdl-core] also failed:", e.message);
          return res
            .status(500)
            .json({ error: "Failed to resolve YouTube video" });
        }
      }
    }

    // 🔹 Instagram & Facebook via yt-dlp
    if (
      videoUrl.includes("instagram.com") ||
      videoUrl.includes("facebook.com")
    ) {
      console.log("[yt-dlp] Resolving IG/FB:", videoUrl);

      const { stdout } = await asyncExec(
        `python -m yt_dlp -j --no-warnings --merge-output-format mp4 "${videoUrl}"`
      );
      const json = JSON.parse(stdout);

      const formats = (json.formats || [])
        .filter(
          (f) =>
            f.url &&
            f.ext === "mp4" &&
            f.vcodec !== "none" &&
            f.acodec !== "none"
        )
        .map((f) => ({
          url: f.url,
          format_id: f.format_id,
          ext: f.ext,
          quality: f.format_note || (f.height ? `${f.height}p` : "Default"),
          size: f.filesize
            ? `${(f.filesize / 1048576).toFixed(2)} MB`
            : "Unknown",
        }));

      return res.json({
        title: json.title || "Video",
        thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
        formats,
      });
    }

    // 🔸 Unknown platform fallback
    return res.status(400).json({
      error:
        "Unsupported platform. Only YouTube, TikTok, IG, FB are supported.",
    });
  } catch (err) {
    console.error("download error (full):", err);

    const message = err.message || "";

    if (
      message.includes("Sign in to confirm") ||
      message.includes("captcha") ||
      message.includes("cookies")
    ) {
      return res.status(403).json({
        error: "This video requires login or CAPTCHA. Please try another one.",
      });
    }

    return res.status(500).json({ error: "Failed to retrieve video info." });
  }
});

app.get("/api/stream/mp4", async (req, res) => {
  const { url } = req.query;
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).send("Invalid YouTube URL");
  }

  const info = (await ytdl.getInfo(url)).videoDetails;
  const fileName = info.title.replace(/[^\w\s]/gi, "_");

  res.header("Content-Disposition", `attachment; filename="${fileName}.mp4"`);
  res.header("Content-Type", "video/mp4");
  ytdl(url, {
    quality: "highest",
    filter: "audioandvideo",
  }).pipe(res);
});

const fetch = require("node-fetch");

app.get("/api/proxy", async (req, res) => {
  const mediaUrl = req.query.url;
  const fileName = req.query.name || `video.mp4`;

  if (!mediaUrl) return res.status(400).send("Missing media URL");

  const getHeadersForPlatform = (url) => {
    if (url.includes("tiktok.com")) {
      return {
        Referer: "https://www.tiktok.com/",
        Origin: "https://www.tiktok.com/",
      };
    }
    if (url.includes("youtube.com") || url.includes("googlevideo.com")) {
      return {
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com/",
      };
    }
    if (url.includes("facebook.com") || url.includes("fbcdn.net")) {
      return {
        Referer: "https://www.facebook.com/",
        Origin: "https://www.facebook.com/",
      };
    }
    if (url.includes("instagram.com") || url.includes("cdninstagram")) {
      return {
        Referer: "https://www.instagram.com/",
        Origin: "https://www.instagram.com/",
      };
    }
    return {};
  };

  const platformHeaders = getHeadersForPlatform(mediaUrl);

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
        ...platformHeaders,
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch media: ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const ext = contentType.split("/")[1] || "mp4";
    const finalName = fileName || `video.${ext}`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${finalName}"`);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    response.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
