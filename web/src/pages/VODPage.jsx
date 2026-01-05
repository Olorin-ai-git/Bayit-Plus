import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Film } from 'lucide-react'
import ContentCard from '@/components/content/ContentCard'
import { contentService } from '@/services/api'

export default function VODPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [content, setContent] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  )

  useEffect(() => {
    loadContent()
  }, [selectedCategory])

  const loadContent = async () => {
    setLoading(true)
    try {
      const [categoriesData, contentData] = await Promise.all([
        contentService.getCategories(),
        selectedCategory === 'all'
          ? contentService.getFeatured()
          : contentService.getByCategory(selectedCategory),
      ])
      setCategories(categoriesData.categories)
      setContent(contentData.items || contentData.categories?.flatMap(c => c.items) || [])
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId)
    if (categoryId === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', categoryId)
    }
    setSearchParams(searchParams)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="glass-btn-primary w-12 h-12 rounded-full flex items-center justify-center">
          <Film size={24} />
        </div>
        <h1 className="text-3xl font-bold">סרטים וסדרות</h1>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => handleCategoryChange('all')}
          className={`glass-tab-pill whitespace-nowrap ${
            selectedCategory === 'all' ? 'glass-tab-pill-active' : ''
          }`}
        >
          הכל
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`glass-tab-pill whitespace-nowrap ${
              selectedCategory === category.id ? 'glass-tab-pill-active' : ''
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-video skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Content Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {content.map((item) => (
              <ContentCard key={item.id} content={item} />
            ))}
          </div>

          {/* Empty State */}
          {content.length === 0 && (
            <div className="text-center py-16">
              <div className="glass-card inline-block p-12">
                <Film size={64} className="mx-auto text-dark-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">אין תוכן זמין</h2>
                <p className="text-dark-400">נסה לבחור קטגוריה אחרת</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
