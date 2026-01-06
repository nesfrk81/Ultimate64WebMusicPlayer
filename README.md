# Ultimate64 Web Music Player

A web-based music player for the [Ultimate64](https://ultimate64.com/) that lets you browse and play SID files from the High Voltage SID Collection (HVSC) directly on your C64/Ultimate64.

![C64 Logo](public/c64-logo.svg)

## 🎵 Features

- **Browse & Search**: Search through 50,000+ SID files from HVSC
- **Playlist Management**: Create custom playlists and organize your favorite tunes
- **Favourites**: Quick access to your most-loved tracks
- **Playback Controls**: Play, stop, previous, next, shuffle, and loop
- **Songlength Support**: Automatic song duration from HVSC Songlengths.md5
- **Mobile-First Design**: Optimized for use on phones and tablets
- **PWA Support**: Install as an app on your device
- **Multiple Themes**: C64 BASIC (classic purple) and Dark mode

## 🚀 Getting Started

### ⚠️ Important: Network Requirements

Due to browser security restrictions, **the GitHub Pages demo cannot directly control your Ultimate64**. This is because:

- GitHub Pages is served over HTTPS
- Your Ultimate64 uses HTTP on your local network
- Browsers block "mixed content" (HTTPS → HTTP requests)

### Recommended Setup: Run Locally

For the best experience, run the app on your local machine:

```bash
# Clone and install
git clone https://github.com/nesfrk81/Ultimate64WebMusicPlayer.git
cd Ultimate64WebMusicPlayer
npm install

# Run the development server
npm run dev
```

Then open `http://localhost:5173/Ultimate64WebMusicPlayer/` in your browser.

The local development server includes a proxy that handles the Ultimate64 communication properly.

### Alternative: GitHub Pages (Browse Only)

The GitHub Pages demo at **[https://nesfrk81.github.io/Ultimate64WebMusicPlayer/](https://nesfrk81.github.io/Ultimate64WebMusicPlayer/)** can be used to:

- Browse and search the HVSC catalog
- Create and manage playlists
- Preview the app interface

But **playback requires running locally** or self-hosting on your network.

## 📱 Screenshots

The player features a classic C64-inspired design with modern usability:

- **Home Screen**: View and manage your playlists
- **Search**: Find songs by name, artist, or path
- **Now Playing**: See current track with progress and controls
- **Settings**: Configure your Ultimate64 connection

## ⚙️ Setup

### Requirements

- A Commodore 64 Ultimate, Ultimate64 or Ultimate-II+ with network connectivity
- HVSC collection on your Ultimate64's storage (USB/SD)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Both devices must be on the same local network

### Configuration

1. Open the app and go to **Settings** (gear icon)
2. Enter your **Ultimate64 IP Address** (e.g., `192.168.1.64`)
3. Set the **HVSC Base Path** on your Ultimate64 (e.g., `/USB0/HVSC/`)
4. Save settings

### Finding Your Ultimate64 IP

- Check your router's connected devices
- Or use the Ultimate64's menu to view network settings

## 🎮 Usage

### Playing Music

1. Search for a song or browse your playlists
2. Tap a song to add it to a playlist
3. Open a playlist and tap **Play**
4. Use shuffle and loop options as desired

### Creating Playlists

1. From the home screen, tap **New**
2. Enter a playlist name
3. Search for songs and add them to your playlist

### Playback Options

- **Shuffle**: Play songs in random order
- **Loop**: Repeat the playlist when finished
- **Use SID Songlength**: Use accurate song durations from HVSC database

## 📲 Install as App (PWA)

You can install this web app on your phone or tablet for a native app-like experience.

### iOS (iPhone/iPad)

1. Open **Safari** and navigate to the app URL
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Give it a name and tap **"Add"**

### Android (Chrome)

1. Open **Chrome** and navigate to the app URL
2. Tap the **three-dot menu** (⋮) in the top right
3. Tap **"Add to Home screen"** or **"Install app"**
4. Confirm by tapping **"Add"** or **"Install"**

### Benefits

- **Full screen mode** - No browser UI
- **Home screen icon** - Quick access like a native app
- **Faster loading** - App resources are cached locally

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/nesfrk81/Ultimate64WebMusicPlayer.git
cd Ultimate64WebMusicPlayer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Self-Hosting on Your Network

To run the app on your local network (e.g., on a Raspberry Pi or NAS):

```bash
# Build the app
npm run build

# The built files are in the 'dist' folder
# Serve them with any static file server, for example:
npx serve dist -l 8080

# Or copy 'dist' contents to your web server
```

Access from any device on your network at `http://your-server-ip:8080/Ultimate64WebMusicPlayer/`

### Generating Song Index

The app uses a pre-generated index of HVSC songs. To regenerate:

```bash
# Run the index generator script
node scripts/generate-hvsc-index.js /path/to/HVSC

# Compress for deployment
gzip -k public/data/hvsc-index.json
```

## 🔧 Technical Details

### Architecture

- **Frontend**: React 18 with Vite
- **Styling**: CSS with CSS variables for theming
- **Storage**: IndexedDB for playlists, favourites, and settings
- **API**: REST communication with Ultimate64

### Ultimate64 API

The player communicates with the Ultimate64 REST API:

- `PUT /v1/runners:sidplay?file=<path>` - Play a SID file
- `PUT /v1/machine:reset` - Stop playback (soft reset)
- `GET /v1/info` - Get device information

### File Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── services/       # API and storage services
└── styles/         # Global styles and themes

public/
└── data/           # Song index files
```

## 📝 License

This project is open source. The HVSC collection has its own licensing terms.

## 🙏 Credits

- [High Voltage SID Collection (HVSC)](https://hvsc.c64.org/) for the amazing SID archive
- [Ultimate64](https://ultimate64.com/) for the incredible hardware
- The C64 community for keeping the magic alive

## 📬 Contact

- **Instagram**: [@nesfrk](https://www.instagram.com/nesfrk/)
- **YouTube**: [@nesfrk](https://www.youtube.com/@nesfrk)
- **X (Twitter)**: [@nesfreak](https://x.com/nesfreak/)
- **Twitch**: [nesfrk](https://www.twitch.tv/nesfrk)

---

Made with ❤️ for the C64 community by Nesfrk © 2026
