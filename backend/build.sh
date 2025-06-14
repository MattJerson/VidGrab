#!/usr/bin/env bash

# Update and install ffmpeg
apt-get update
apt-get install -y ffmpeg

# Upgrade pip and install yt-dlp
pip install --upgrade pip
pip install yt-dlp

# Install Node.js dependencies (your Express backend)
npm install
