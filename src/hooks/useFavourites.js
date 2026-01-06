import { useState, useEffect } from 'react'
import { 
  getAllFavourites, 
  addFavourite, 
  removeFavourite, 
  isFavourite as checkIsFavourite
} from '../services/storage'

export function useFavourites() {
  const [favourites, setFavourites] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadFavourites()
  }, [])

  const loadFavourites = async () => {
    try {
      const allFavourites = await getAllFavourites()
      setFavourites(allFavourites)
    } catch (error) {
      console.error('Failed to load favourites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const add = async (songId) => {
    try {
      await addFavourite(songId)
      setFavourites(prev => [...prev, songId])
    } catch (error) {
      console.error('Failed to add favourite:', error)
      throw error
    }
  }

  const remove = async (songId) => {
    try {
      await removeFavourite(songId)
      setFavourites(prev => prev.filter(id => id !== songId))
    } catch (error) {
      console.error('Failed to remove favourite:', error)
      throw error
    }
  }

  const toggle = async (songId) => {
    const isFav = favourites.includes(songId)
    if (isFav) {
      await remove(songId)
    } else {
      await add(songId)
    }
  }

  const checkIsFav = async (songId) => {
    try {
      return await checkIsFavourite(songId)
    } catch (error) {
      console.error('Failed to check favourite:', error)
      return false
    }
  }

  return {
    favourites,
    isLoading,
    add,
    remove,
    toggle,
    isFavourite: (songId) => favourites.includes(songId),
    refresh: loadFavourites
  }
}
