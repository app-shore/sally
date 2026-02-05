'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface ApiSearchProps {
  onSearch: (query: string) => void
}

export function ApiSearch({ onSearch }: ApiSearchProps) {
  const [query, setQuery] = useState('')

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch(value.toLowerCase())
  }

  return (
    <div className="mb-4">
      <Input
        type="search"
        placeholder="Search endpoints..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full"
      />
    </div>
  )
}
