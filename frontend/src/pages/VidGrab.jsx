import { useState } from "react";
import {
  Download,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  Youtube,
  Instagram,
  Facebook,
} from "lucide-react";

const VidGrab = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [error, setError] = useState("");

  const platformIcons = {
    youtube: <Youtube className="w-6 h-6 text-red-500" />,
    instagram: <Instagram className="w-6 h-6 text-pink-500" />,
    facebook: <Facebook className="w-6 h-6 text-blue-600" />,
    tiktok: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
          fill="currentColor"
        />
      </svg>
    ),
  };

  const detectPlatform = (url) => {
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "youtube";
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("facebook.com") || url.includes("fb.watch"))
      return "facebook";
    if (url.includes("tiktok.com")) return "tiktok";
    return null;
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a video URL");
      return;
    }

    setLoading(true);
    setError("");
    setVideoData(null);

    try {
      const res = await fetch(
        `https://vidgrab-w2ne.onrender.com/api/download?url=${encodeURIComponent(
          url
        )}`
      );
      if (!res.ok) throw new Error("Failed to fetch video data");

      const data = await res.json();

      // 🔁 Normalize TikTok-style data into formats array
      let formats = [];

      if (data.formats && Array.isArray(data.formats)) {
        formats = data.formats;
      } else if (data.play || data.play_watermark) {
        if (data.play) {
          formats.push({
            url: data.play,
            quality: "No Watermark",
            ext: "mp4",
          });
        }
        if (data.play_watermark) {
          formats.push({
            url: data.play_watermark,
            quality: "With Watermark",
            ext: "mp4",
          });
        }
      }

      const allowedQualities = [
        "360p",
        "480p",
        "720p",
        "1080p",
        "no watermark",
        "with watermark",
      ];

      let filteredFormats = formats.filter((format) => {
        const quality = String(format.quality || "").toLowerCase();
        return allowedQualities.includes(quality);
      });

      if (filteredFormats.length === 0 && formats.length > 0) {
        filteredFormats = formats.slice(0, 3);
      }

      filteredFormats.sort((a, b) => {
        const qa = parseInt(a.quality);
        const qb = parseInt(b.quality);
        return isNaN(qb) ? -1 : qb - qa;
      });

      setVideoData({
        title: data.title || "Video Title",
        thumbnail: data.thumbnail || null,
        formats: filteredFormats,
      });
    } catch (err) {
      console.error(err);
      setError("Unable to fetch video. Please try another URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFormat = (downloadUrl, ext = "mp4") => {
    const filename = `video_${Date.now()}.${ext}`;
    const proxyUrl = `https://vidgrab-w2ne.onrender.com/api/proxy?url=${encodeURIComponent(
      downloadUrl
    )}&name=${filename}`;

    const link = document.createElement("a");
    link.href = proxyUrl;
    link.setAttribute("download", filename); // 👈 explicitly set filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-full max-w-[320px] h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-100 -left-32 w-full max-w-[320px] h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <header className="container mx-auto px-4 sm:px-6 py-8">
          <nav className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">VidGrab</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-300 hover:text-white transition-colors"
              >
                How it Works
              </a>
            </div>
          </nav>
        </header>

        <section className="container mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Download Videos From
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {" "}
                Anywhere
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
              Fast, free, & secure video downloads from YouTube, Instagram,
              Facebook, & TikTok. No registration required.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-6 mb-12">
              {Object.entries(platformIcons).map(([platform, icon]) => (
                <div
                  key={platform}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                    {icon}
                  </div>
                  <span className="text-gray-400 text-sm mt-2 capitalize group-hover:text-white transition-colors">
                    {platform}
                  </span>
                </div>
              ))}
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-0">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste URL Here"
                  className="w-full px-6 py-4 text-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === "Enter" && handleDownload()}
                />
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="w-full sm:w-auto sm:absolute sm:top-2 sm:right-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-7.5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-7.5" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-300">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {videoData && (
                <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
                    {videoData.thumbnail && (
                      <img
                        src={videoData.thumbnail}
                        alt={videoData.title || "Video thumbnail"}
                        className="w-full sm:w-32 h-24 object-cover rounded-xl"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    )}
                    <div className="flex-1 text-left">
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                        {videoData.title || "Video Title"}
                      </h3>
                      <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">
                          Ready To Download
                        </span>
                        {detectPlatform(url) && (
                          <div className="flex items-center space-x-1">
                            {platformIcons[detectPlatform(url)]}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-lg font-medium text-white">
                          Here Is Your Download
                        </h4>
                        {videoData.formats && videoData.formats.length > 0 ? (
                          videoData.formats.map((format, index) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row items-center justify-between bg-white/5 rounded-lg p-3 space-y-3 sm:space-y-0"
                            >
                              <div className="flex items-center space-x-3">
                                <Play className="w-4 h-4 text-gray-400" />
                                <span className="text-white font-medium">
                                  {format.format_id || "Unknown Quality"}
                                </span>
                                <span className="text-gray-400">
                                  ({format.ext || "mp4"})
                                </span>
                                <span className="text-gray-400">
                                  {format.size || "Unknown Size"}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleDownloadFormat(format.url, format.ext)
                                }
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center space-x-2"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-gray-400">
                              No formats available or check console for raw data
                            </p>
                            <details className="mt-2">
                              <summary className="text-gray-400 cursor-pointer hover:text-white">
                                Debug Info (Click to expand)
                              </summary>
                              <pre className="text-xs text-gray-300 mt-2 bg-black/20 p-2 rounded overflow-auto">
                                {JSON.stringify(videoData, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose VidGrab?
            </h2>
            <p className="text-xl text-gray-300">
              Fast, reliable, & completely free video downloads
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Lightning Fast
              </h3>
              <p className="text-gray-300">
                Download videos in seconds with our optimized servers and
                advanced processing technology.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Multiple Formats
              </h3>
              <p className="text-gray-300">
                Choose from various quality options and formats to suit your
                needs and device compatibility.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                No Registration
              </h3>
              <p className="text-gray-300">
                Start downloading immediately without creating accounts or
                providing personal information.
              </p>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="container mx-auto px-4 sm:px-6 py-20"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-300">
              Simple steps to download your favorite videos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Copy URL</h3>
              <p className="text-gray-300">
                Copy the video URL from YouTube, Instagram, Facebook, or TikTok
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                Paste & Process
              </h3>
              <p className="text-gray-300">
                Paste the URL in our input field and click the download button
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Download</h3>
              <p className="text-gray-300">
                Choose your preferred format and quality, then download
                instantly
              </p>
            </div>
          </div>
        </section>

        <footer className="container mx-auto px-4 sm:px-6 py-12 border-t border-white/20">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">VidGrab</span>
            </div>
            <p className="text-gray-400 mb-4">
              Fast, free, and secure video downloads
            </p>
            <p className="text-gray-500 text-sm">
              © 2025 VidGrab. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default VidGrab;
