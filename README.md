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

## 🚀 Live Demo

Access the player at: **[https://nesfrk81.github.io/Ultimate64WebMusicPlayer/](https://nesfrk81.github.io/Ultimate64WebMusicPlayer/)**

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
