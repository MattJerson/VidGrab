const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const util = require("util");
const https = require("https");

const app = express();
const port = process.env.PORT || 3000;
const asyncExec = util.promisify(exec);

const mimeToExt = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/octet-stream": "ts", // often TikTok fallback
};

app.use(cors());

app.get("/api/download", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' parameter" });
  }

  try {
    if (videoUrl.includes("tiktok.com")) {
      console.log("[RapidAPI] Resolving TikTok:", videoUrl);

      const response = await fetch(
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

      if (!response.ok) {
        console.error("[RapidAPI] TikTok API failed:", response.status);
        return res.status(500).json({ error: "TikTok fetch failed." });
      }

      const result = await response.json();
      console.log("[RapidAPI] TikTok result:", result);

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
        thumbnail: "", // optionally use another endpoint to fetch cover
        formats,
      });
    }

    // 🔁 Otherwise fallback to yt-dlp for YT, FB, IG
    const { stdout } = await asyncExec(
      `python3 -m yt_dlp -j --no-warnings --merge-output-format mp4 --cookies cookies.txt "${videoUrl}"`
    );
    const json = JSON.parse(stdout);

    let formats = (json.formats || []).filter(
      (f) =>
        f.url && f.ext === "mp4" && f.vcodec !== "none" && f.acodec !== "none"
    );

    if (formats.length === 0 && json.url) {
      formats = [
        {
          url: json.url,
          format_id: "best",
          ext: "mp4",
          quality: "best",
          size: "Unknown",
        },
      ];
    }

    const simplified = formats.map((f) => ({
      url: f.url,
      format_id: f.format_id,
      ext: f.ext,
      quality: f.format_note || (f.height ? `${f.height}p` : "") || "default",
      size: f.filesize ? `${(f.filesize / 1048576).toFixed(2)} MB` : "Unknown",
    }));

    res.json({
      title: json.title || "Video",
      thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
      formats: simplified,
    });
  } catch (err) {
    console.error("download error:", err.message);
    res.status(500).json({ error: "Failed to retrieve video info." });
  }
});

const { https: followHttps } = require("follow-redirects");

app.get("/api/proxy", (req, res) => {
  const mediaUrl = req.query.url;
  if (!mediaUrl) return res.status(400).send("Missing media URL");

  const options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      Referer: "https://www.tiktok.com/",
      Origin: "https://www.tiktok.com",
      Accept: "*/*",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    },
  };

  followHttps
    .get(mediaUrl, options, (stream) => {
      const contentType =
        stream.headers["content-type"] || "application/octet-stream";
      const ext =
        mimeToExt[contentType] ||
        (contentType.startsWith("video/") ? contentType.split("/")[1] : "bin");

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Video.${ext}"`
      );

      if (stream.headers["content-length"]) {
        res.setHeader("Content-Length", stream.headers["content-length"]);
      }

      stream.pipe(res);
    })
    .on("error", (err) => {
      console.error("Proxy error:", err.message);
      res.status(500).send("Proxy failed");
    });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
