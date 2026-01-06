import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Paths
const HVSC_PATH = path.join(projectRoot, 'HVSC')
const CGSC_PATH = path.join(projectRoot, 'CGSC')
const SONGLENGTHS_PATH = path.join(HVSC_PATH, 'DOCUMENTS', 'Songlengths.md5')
const OUTPUT_DIR = path.join(projectRoot, 'public', 'data')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Calculate MD5 hash of file (full content)
function calculateMD5(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(fileBuffer).digest('hex')
}

// Parse Songlengths.md5 file
function parseSonglengths() {
  const songlengths = new Map()
  
  if (!fs.existsSync(SONGLENGTHS_PATH)) {
    console.warn(`Warning: Songlengths.md5 not found at ${SONGLENGTHS_PATH}`)
    return songlengths
  }

  const content = fs.readFileSync(SONGLENGTHS_PATH, 'utf-8')
  const lines = content.split('\n')
  
  let currentPath = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines and database header
    if (!trimmed || trimmed === '[Database]') continue
    
    // Comment line with file path
    if (trimmed.startsWith(';')) {
      currentPath = trimmed.substring(1).trim()
      continue
    }
    
    // MD5 hash line
    if (trimmed.includes('=')) {
      const [md5, durations] = trimmed.split('=')
      if (md5 && durations) {
        const md5Hash = md5.trim()
        const durationList = durations.trim().split(/\s+/)
        songlengths.set(md5Hash, {
          path: currentPath,
          durations: durationList
        })
      }
    }
  }
  
  return songlengths
}

// Extract metadata from file path
function extractMetadata(filePath, collection) {
  const relativePath = path.relative(collection === 'hvsc' ? HVSC_PATH : CGSC_PATH, filePath)
  const pathParts = relativePath.split(path.sep)
  const filename = path.basename(filePath, collection === 'hvsc' ? '.sid' : '.mus')
  
  let category = 'UNKNOWN'
  let artist = null
  
  if (collection === 'hvsc') {
    // HVSC structure: 
    // - MUSICIANS/T/Tel_Jeroen/song.sid -> artist is at index 2 (Tel_Jeroen)
    // - DEMOS/A-F/demo.sid -> no specific artist
    // - GAMES/A-F/game.sid -> no specific artist
    if (pathParts.length > 0) {
      category = pathParts[0]
      if (category === 'MUSICIANS' && pathParts.length > 2) {
        // Format: MUSICIANS/<letter>/<artist_name>/song.sid
        // pathParts[2] is the artist folder name
        artist = pathParts[2].replace(/_/g, ' ') // Convert underscores to spaces
      }
    }
  } else if (collection === 'cgsc') {
    // CGSC structure: mostly artist folders
    if (pathParts.length > 0) {
      artist = pathParts[0].replace(/_/g, ' ')
      category = 'MUSICIANS'
    }
  }
  
  return {
    name: filename.replace(/_/g, ' '), // Also clean up filename
    path: '/' + relativePath.replace(/\\/g, '/'), // Normalize to forward slashes
    category,
    artist
  }
}

// Scan directory recursively for files
function scanDirectory(dirPath, extension, collection) {
  const files = []
  
  function scan(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      
      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
        files.push(fullPath)
      }
    }
  }
  
  scan(dirPath)
  return files
}

// Generate HVSC index
async function generateHVSCIndex(songlengths) {
  console.log('Scanning HVSC for SID files...')
  const sidFiles = scanDirectory(HVSC_PATH, '.sid', 'hvsc')
  console.log(`Found ${sidFiles.length} SID files`)
  
  const songs = []
  let processed = 0
  
  for (const filePath of sidFiles) {
    try {
      const md5 = calculateMD5(filePath)
      const metadata = extractMetadata(filePath, 'hvsc')
      const songlength = songlengths.get(md5)
      
      const song = {
        id: `hvsc_${processed + 1}`,
        name: metadata.name,
        path: metadata.path,
        category: metadata.category,
        artist: metadata.artist,
        type: 'sid',
        md5: md5
      }
      
      if (songlength) {
        song.songlengths = songlength.durations
        song.subsongs = songlength.durations.length
      }
      
      songs.push(song)
      processed++
      
      if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${sidFiles.length} files...`)
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message)
    }
  }
  
  console.log(`Generated HVSC index with ${songs.length} songs`)
  return songs
}

// Generate CGSC index
async function generateCGSCIndex() {
  console.log('Scanning CGSC for MUS files...')
  const musFiles = scanDirectory(CGSC_PATH, '.mus', 'cgsc')
  console.log(`Found ${musFiles.length} MUS files`)
  
  const songs = []
  let processed = 0
  
  for (const filePath of musFiles) {
    try {
      const metadata = extractMetadata(filePath, 'cgsc')
      
      const song = {
        id: `cgsc_${processed + 1}`,
        name: metadata.name,
        path: metadata.path,
        category: metadata.category,
        artist: metadata.artist,
        type: 'mus'
      }
      
      songs.push(song)
      processed++
      
      if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${musFiles.length} files...`)
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message)
    }
  }
  
  console.log(`Generated CGSC index with ${songs.length} songs`)
  return songs
}

// Main function
async function main() {
  console.log('Starting index generation...')
  console.log(`HVSC path: ${HVSC_PATH}`)
  console.log(`CGSC path: ${CGSC_PATH}`)
  
  // Parse songlengths
  console.log('\nParsing Songlengths.md5...')
  const songlengths = parseSonglengths()
  console.log(`Loaded ${songlengths.size} songlength entries`)
  
  // Generate indices
  console.log('\nGenerating HVSC index...')
  const hvscSongs = await generateHVSCIndex(songlengths)
  
  console.log('\nGenerating CGSC index...')
  const cgscSongs = await generateCGSCIndex()
  
  // Generate version timestamp
  const version = new Date().toISOString().split('T')[0]
  
  // Write output files
  console.log('\nWriting output files...')
  
  const hvscIndex = {
    version,
    songs: hvscSongs
  }
  
  const cgscIndex = {
    version,
    songs: cgscSongs
  }
  
  const versionInfo = {
    version,
    hvsc: version,
    cgsc: version
  }
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hvsc-index.json'),
    JSON.stringify(hvscIndex, null, 2)
  )
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'cgsc-index.json'),
    JSON.stringify(cgscIndex, null, 2)
  )
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  )
  
  console.log('\nIndex generation complete!')
  console.log(`- HVSC: ${hvscSongs.length} songs`)
  console.log(`- CGSC: ${cgscSongs.length} songs`)
  console.log(`- Output directory: ${OUTPUT_DIR}`)
}

// Run the script
main().catch(error => {
  console.error('Error generating indices:', error)
  process.exit(1)
})
