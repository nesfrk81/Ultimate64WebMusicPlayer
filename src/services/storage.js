const DB_NAME = 'Ultimate64MusicPlayer'
const DB_VERSION = 1

let db = null

const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // Create object stores
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('favourites')) {
        database.createObjectStore('favourites', { keyPath: 'songId' })
      }
      if (!database.objectStoreNames.contains('playlists')) {
        database.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true })
      }
      if (!database.objectStoreNames.contains('songTimes')) {
        database.createObjectStore('songTimes', { keyPath: 'songId' })
      }
      if (!database.objectStoreNames.contains('songlengths')) {
        database.createObjectStore('songlengths', { keyPath: 'md5' })
      }
      if (!database.objectStoreNames.contains('playHistory')) {
        database.createObjectStore('playHistory', { keyPath: 'songId' })
      }
    }
  })
}

// ========== SETTINGS ==========

export const getSettings = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readonly')
    const store = transaction.objectStore('settings')
    const request = store.get('main')

    request.onsuccess = () => {
      resolve(request.result ? request.result.data : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export const saveSettings = async (settings) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readwrite')
    const store = transaction.objectStore('settings')
    const request = store.put({ id: 'main', data: settings })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ========== FAVOURITES ==========

export const addFavourite = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['favourites'], 'readwrite')
    const store = transaction.objectStore('favourites')
    const request = store.put({ songId, addedAt: Date.now() })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const removeFavourite = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['favourites'], 'readwrite')
    const store = transaction.objectStore('favourites')
    const request = store.delete(songId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const isFavourite = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['favourites'], 'readonly')
    const store = transaction.objectStore('favourites')
    const request = store.get(songId)

    request.onsuccess = () => {
      resolve(!!request.result)
    }
    request.onerror = () => reject(request.error)
  })
}

export const getAllFavourites = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['favourites'], 'readonly')
    const store = transaction.objectStore('favourites')
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result.map(item => item.songId))
    }
    request.onerror = () => reject(request.error)
  })
}

// ========== PLAYLISTS ==========

export const createPlaylist = async (name, songs = []) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    const playlist = {
      name,
      songs,
      createdAt: Date.now()
    }
    const request = store.add(playlist)

    request.onsuccess = () => {
      resolve({ ...playlist, id: request.result })
    }
    request.onerror = () => reject(request.error)
  })
}

export const getAllPlaylists = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playlists'], 'readonly')
    const store = transaction.objectStore('playlists')
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  })
}

export const getPlaylist = async (id) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playlists'], 'readonly')
    const store = transaction.objectStore('playlists')
    const request = store.get(id)

    request.onsuccess = () => {
      resolve(request.result || null)
    }
    request.onerror = () => reject(request.error)
  })
}

export const updatePlaylist = async (id, updates) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const playlist = getRequest.result
      if (!playlist) {
        reject(new Error('Playlist not found'))
        return
      }
      const updated = { ...playlist, ...updates }
      const putRequest = store.put(updated)
      putRequest.onsuccess = () => resolve(updated)
      putRequest.onerror = () => reject(putRequest.error)
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export const deletePlaylist = async (id) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const addSongToPlaylist = async (playlistId, songId) => {
  const playlist = await getPlaylist(playlistId)
  if (!playlist) {
    throw new Error('Playlist not found')
  }
  if (!playlist.songs.includes(songId)) {
    playlist.songs.push(songId)
    await updatePlaylist(playlistId, { songs: playlist.songs })
  }
  return playlist
}

export const removeSongFromPlaylist = async (playlistId, songId) => {
  const playlist = await getPlaylist(playlistId)
  if (!playlist) {
    throw new Error('Playlist not found')
  }
  playlist.songs = playlist.songs.filter(id => id !== songId)
  await updatePlaylist(playlistId, { songs: playlist.songs })
  return playlist
}

// ========== SONG TIMES ==========

export const getSongTime = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['songTimes'], 'readonly')
    const store = transaction.objectStore('songTimes')
    const request = store.get(songId)

    request.onsuccess = () => {
      resolve(request.result ? request.result.customTime : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export const setSongTime = async (songId, customTime) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['songTimes'], 'readwrite')
    const store = transaction.objectStore('songTimes')
    const request = store.put({ songId, customTime })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const removeSongTime = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['songTimes'], 'readwrite')
    const store = transaction.objectStore('songTimes')
    const request = store.delete(songId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ========== SONGLENGTHS ==========

export const importSonglengths = async (songlengths) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['songlengths'], 'readwrite')
    const store = transaction.objectStore('songlengths')
    
    const requests = songlengths.map(item => store.put(item))
    Promise.all(requests.map(req => new Promise((res, rej) => {
      req.onsuccess = () => res()
      req.onerror = () => rej(req.error)
    })))
      .then(() => resolve())
      .catch(reject)
  })
}

export const getSonglength = async (md5) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['songlengths'], 'readonly')
    const store = transaction.objectStore('songlengths')
    const request = store.get(md5)

    request.onsuccess = () => {
      resolve(request.result ? request.result.durations : null)
    }
    request.onerror = () => reject(request.error)
  })
}

// ========== PLAY HISTORY ==========

export const recordPlay = async (songId) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playHistory'], 'readwrite')
    const store = transaction.objectStore('playHistory')
    const request = store.put({ songId, playedAt: Date.now() })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const getPlayHistory = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playHistory'], 'readonly')
    const store = transaction.objectStore('playHistory')
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  })
}

export const clearPlayHistory = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['playHistory'], 'readwrite')
    const store = transaction.objectStore('playHistory')
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
