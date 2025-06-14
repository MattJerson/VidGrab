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
    console.log("[yt-dlp] Resolving:", videoUrl);

    const { stdout } = await asyncExec(
      `yt-dlp -j --no-warnings --cookies cookies.txt --merge-output-format mp4 "${videoUrl}"`
    );
    const data = JSON.parse(stdout);

    const formats = (data.formats || [])
      .filter(
        (f) =>
          f.url && f.ext === "mp4" && f.vcodec !== "none" && f.acodec !== "none"
      )
      .map((f) => ({
        url: f.url,
        format_id: f.format_id,
        ext: f.ext,
        quality:
          f.format_note || f.height
            ? `${f.height}p`
            : f.resolution || "Default",
        size: f.filesize
          ? `${(f.filesize / 1048576).toFixed(2)} MB`
          : "Unknown",
      }));

    return res.json({
      title: data.title || "Video",
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
      formats,
    });
  } catch (err) {
    console.error("yt-dlp error:", err.message);

    if (
      err.message.includes("Sign in to confirm") ||
      err.message.includes("captcha") ||
      err.message.includes("cookies")
    ) {
      return res.status(403).json({
        error: "This video requires login or CAPTCHA. Please try another one.",
      });
    }

    return res
      .status(500)
      .json({ error: "Failed to retrieve video info using yt-dlp." });
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

const { http, https } = require("follow-redirects");

app.get("/api/proxy", (req, res) => {
  const mediaUrl = req.query.url;
  const fileName = req.query.name || null;

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

  const get = mediaUrl.startsWith("https") ? https.get : http.get;
  console.log("Proxying:", mediaUrl);

  get(mediaUrl, options, (stream) => {
    const contentType =
      stream.headers["content-type"] || "application/octet-stream";
    const ext = contentType.split("/")[1] || "mp4";
    const finalName = fileName || `Video.${ext}`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${finalName}"`);
    if (stream.headers["content-length"]) {
      res.setHeader("Content-Length", stream.headers["content-length"]);
    }

    stream.pipe(res);
  }).on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
