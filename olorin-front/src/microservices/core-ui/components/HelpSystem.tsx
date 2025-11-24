import React, { useState, useEffect } from 'react';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
<<<<<<< HEAD
=======
import { useEventEmitter } from '@shared/events/UnifiedEventBus';

>>>>>>> 001-modify-analyzer-method

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  type: 'article' | 'video' | 'faq';
  url?: string;
  duration?: string;
}

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  articles: HelpArticle[];
}

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultSearchTerm?: string;
}

<<<<<<< HEAD
=======
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

>>>>>>> 001-modify-analyzer-method
const helpData: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of using Olorin',
    icon: BookOpenIcon,
    articles: [
      {
        id: 'intro',
        title: 'Introduction to Olorin',
        content: 'Olorin is an AI-powered fraud detection and investigation platform...',
        category: 'getting-started',
        tags: ['basics', 'overview'],
        lastUpdated: '2024-01-15',
        type: 'article',
      },
      {
        id: 'first-investigation',
        title: 'Creating Your First Investigation',
        content: 'Learn how to set up and run your first investigation...',
        category: 'getting-started',
        tags: ['tutorial', 'investigation'],
        lastUpdated: '2024-01-14',
        type: 'video',
        duration: '5 min',
      },
    ],
  },
  {
    id: 'investigations',
    name: 'Investigations',
    description: 'How to create and manage investigations',
    icon: MagnifyingGlassIcon,
    articles: [
      {
<<<<<<< HEAD
        id: 'autonomous-vs-manual',
        title: 'Autonomous vs Manual Investigations',
        content: 'Understanding the difference between autonomous and manual investigations...',
        category: 'investigations',
        tags: ['autonomous', 'manual', 'comparison'],
=======
        id: 'structured-vs-manual',
        title: 'Structured vs Manual Investigations',
        content: 'Understanding the difference between structured and manual investigations...',
        category: 'investigations',
        tags: ['structured', 'manual', 'comparison'],
>>>>>>> 001-modify-analyzer-method
        lastUpdated: '2024-01-13',
        type: 'article',
      },
      {
        id: 'agent-configuration',
        title: 'Configuring Investigation Agents',
        content: 'How to configure and customize AI agents for investigations...',
        category: 'investigations',
        tags: ['agents', 'configuration'],
        lastUpdated: '2024-01-12',
        type: 'article',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Understanding analytics and reporting',
    icon: ChartBarIcon,
    articles: [
      {
        id: 'dashboard-overview',
        title: 'Analytics Dashboard Overview',
        content: 'Navigate and understand the analytics dashboard...',
        category: 'analytics',
        tags: ['dashboard', 'metrics'],
        lastUpdated: '2024-01-11',
        type: 'article',
      },
    ],
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Common issues and solutions',
    icon: ExclamationCircleIcon,
    articles: [
      {
        id: 'connection-issues',
        title: 'Connection Issues',
        content: 'How to resolve connection problems...',
        category: 'troubleshooting',
        tags: ['connection', 'network'],
        lastUpdated: '2024-01-10',
        type: 'faq',
      },
    ],
  },
];

<<<<<<< HEAD
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

=======
>>>>>>> 001-modify-analyzer-method
const HelpSearch: React.FC<{
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onArticleSelect: (article: HelpArticle) => void;
}> = ({ searchTerm, onSearchChange, onArticleSelect }) => {
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);

  useEffect(() => {
    if (searchTerm.trim().length > 2) {
      const allArticles = helpData.flatMap(category => category.articles);
      const filtered = allArticles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search help articles..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Search Results</h3>
          {searchResults.map((article) => (
            <button
              key={article.id}
              onClick={() => onArticleSelect(article)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{article.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {article.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {article.category}
                    </span>
                    {article.type === 'video' && (
                      <span className="inline-flex items-center text-xs text-gray-500">
                        <VideoCameraIcon className="h-3 w-3 mr-1" />
                        {article.duration}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ArticleView: React.FC<{
  article: HelpArticle;
  onBack: () => void;
}> = ({ article, onBack }) => {
<<<<<<< HEAD
=======
  const { emitNotification } = useEventEmitter();

>>>>>>> 001-modify-analyzer-method
  const getTypeIcon = () => {
    switch (article.type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-blue-500" />;
      case 'faq':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-green-500" />;
      default:
        return <BookOpenIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/help/${article.category}/${article.id}`;
    navigator.clipboard.writeText(url);
<<<<<<< HEAD
    // TODO: Show notification
=======
    emitNotification("success", "Link copied to clipboard");
>>>>>>> 001-modify-analyzer-method
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to help
        </button>
        <button
          onClick={handleCopyLink}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
        >
          <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
          Copy link
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          {getTypeIcon()}
          <h1 className="text-xl font-semibold text-gray-900">{article.title}</h1>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Updated {new Date(article.lastUpdated).toLocaleDateString()}</span>
          {article.duration && (
            <span className="flex items-center">
              <VideoCameraIcon className="h-4 w-4 mr-1" />
              {article.duration}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose prose-sm max-w-none">
        {article.type === 'video' && article.url ? (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Video content would be embedded here</p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Watch Video
              </a>
            </div>
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{article.content}</div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Was this article helpful?</h3>
        <div className="flex space-x-2">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            👍 Yes
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            👎 No
          </button>
        </div>
      </div>
    </div>
  );
};

export const HelpSystem: React.FC<HelpSystemProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  defaultSearchTerm = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(defaultCategory || null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    setSearchTerm('');
  };

  const handleArticleSelect = (article: HelpArticle) => {
    setSelectedArticle(article);
  };

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <QuestionMarkCircleIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Help & Documentation</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {selectedArticle ? (
              <ArticleView article={selectedArticle} onBack={handleBack} />
            ) : selectedCategory ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Back to categories
                  </button>
                </div>

                {(() => {
                  const category = helpData.find(c => c.id === selectedCategory);
                  if (!category) return null;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <category.icon className="h-6 w-6 text-blue-500" />
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {category.articles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => handleArticleSelect(article)}
                            className="text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {article.type === 'video' && <VideoCameraIcon className="h-4 w-4 text-blue-500" />}
                                  {article.type === 'faq' && <ChatBubbleLeftIcon className="h-4 w-4 text-green-500" />}
                                  {article.type === 'article' && <BookOpenIcon className="h-4 w-4 text-gray-500" />}
                                  <h3 className="font-medium text-gray-900">{article.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {article.content.substring(0, 150)}...
                                </p>
                                <div className="flex items-center mt-2 space-x-2">
                                  <span className="text-xs text-gray-500">
                                    Updated {new Date(article.lastUpdated).toLocaleDateString()}
                                  </span>
                                  {article.duration && (
                                    <span className="text-xs text-gray-500">• {article.duration}</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-6">
                <HelpSearch
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onArticleSelect={handleArticleSelect}
                />

                {searchTerm.trim().length <= 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Browse by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {helpData.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className="text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150"
                        >
                          <div className="flex items-start space-x-3">
                            <category.icon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{category.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {category.articles.length} article{category.articles.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};