import { useState, useEffect, useRef } from 'react'
import { searchSongs } from '../services/search'
import SearchResults from './SearchResults'
import './SearchBar.css'

function SearchBar({ onBack }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchSongs(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  const handleInputChange = (e) => {
    setQuery(e.target.value)
  }

  return (
    <div className="search-screen">
      <SearchResults 
        results={results} 
        query={query}
      />
      <div className="search-bar search-bar-bottom">
        <div className="search-form">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, artists..."
            className="search-input"
            value={query}
            onChange={handleInputChange}
          />
          {isSearching && <span className="search-loading">...</span>}
          <button 
            type="button" 
            className="search-back-button"
            onClick={onBack}
            aria-label="Back"
          >
            ←
          </button>
        </div>
      </div>
    </div>
  )
}

export default SearchBar
