# CV Recommendations UI Design

**Status**: ✅ **IMPLEMENTED** - This UI is live in production

**Last Updated**: August 2025

## Overview
The CV Recommendations UI presents AI-generated suggestions for different CV formats, industries, and purposes, helping users make informed decisions about their CV generation.

**Current Implementation**: Located in `/frontend/src/components/` and integrated into the main CV generation flow.

## UI Components

### 1. Recommendations Dashboard

```typescript
// components/RecommendationsDashboard.tsx
import React, { useState } from 'react';
import { CVRecommendations } from '../types/recommendations';

interface RecommendationsDashboardProps {
  recommendations: CVRecommendations;
  onSelectFormat: (format: string) => void;
  onSelectFeatures: (features: string[]) => void;
}

export const RecommendationsDashboard: React.FC<RecommendationsDashboardProps> = ({
  recommendations,
  onSelectFormat,
  onSelectFeatures
}) => {
  const [activeTab, setActiveTab] = useState<'formats' | 'industries' | 'purposes' | 'features'>('formats');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  return (
    <div className="recommendations-dashboard">
      <div className="recommendations-header">
        <h2>AI-Powered CV Recommendations</h2>
        <p>Based on your experience and goals, here are our personalized recommendations</p>
      </div>

      {/* Top Recommendations Summary */}
      <div className="top-recommendations">
        <h3>🎯 Top Recommendations</h3>
        <div className="recommendation-cards">
          {recommendations.topRecommendations.map((rec, index) => (
            <div key={index} className="recommendation-card priority">
              <span className="badge">#{index + 1}</span>
              <p>{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Strategy */}
      <div className="overall-strategy">
        <h3>📊 Overall Strategy</h3>
        <p className="strategy-text">{recommendations.overallStrategy}</p>
      </div>

      {/* Tabbed Content */}
      <div className="recommendations-tabs">
        <div className="tab-nav">
          <button 
            className={activeTab === 'formats' ? 'active' : ''}
            onClick={() => setActiveTab('formats')}
          >
            📄 Formats
          </button>
          <button 
            className={activeTab === 'industries' ? 'active' : ''}
            onClick={() => setActiveTab('industries')}
          >
            🏢 Industries
          </button>
          <button 
            className={activeTab === 'purposes' ? 'active' : ''}
            onClick={() => setActiveTab('purposes')}
          >
            🎯 Purposes
          </button>
          <button 
            className={activeTab === 'features' ? 'active' : ''}
            onClick={() => setActiveTab('features')}
          >
            ✨ Features
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'formats' && (
            <FormatRecommendations 
              formats={recommendations.formatRecommendations}
              onSelect={setSelectedFormat}
            />
          )}
          {activeTab === 'industries' && (
            <IndustryRecommendations 
              industries={recommendations.industryVersions}
              onSelect={setSelectedIndustry}
            />
          )}
          {activeTab === 'purposes' && (
            <PurposeRecommendations 
              purposes={recommendations.purposeVersions}
            />
          )}
          {activeTab === 'features' && (
            <FeatureRecommendations 
              features={recommendations.interactiveFeatures}
              onSelectFeatures={onSelectFeatures}
            />
          )}
        </div>
      </div>

      {/* Visual Enhancement Preview */}
      <VisualEnhancementPreview 
        enhancements={recommendations.visualEnhancements}
      />

      {/* Keyword Optimization Panel */}
      <KeywordOptimizationPanel 
        keywords={recommendations.keywordOptimization}
      />

      {/* Action Buttons */}
      <div className="recommendation-actions">
        <button 
          className="btn-primary"
          onClick={() => onSelectFormat(selectedFormat)}
        >
          Generate CV with Recommendations
        </button>
        <button className="btn-secondary">
          Customize Further
        </button>
      </div>
    </div>
  );
};
```

### 2. Format Recommendations Component

```typescript
// components/FormatRecommendations.tsx
interface FormatRecommendationsProps {
  formats: FormatRecommendation[];
  onSelect: (format: string) => void;
}

const FormatRecommendations: React.FC<FormatRecommendationsProps> = ({ 
  formats, 
  onSelect 
}) => {
  const [expandedFormat, setExpandedFormat] = useState<string | null>(null);

  return (
    <div className="format-recommendations">
      <h3>Recommended CV Formats</h3>
      
      <div className="format-grid">
        {formats.map((format) => (
          <div 
            key={format.format}
            className={`format-card ${format.suitability > 80 ? 'highly-recommended' : ''}`}
            onClick={() => onSelect(format.format)}
          >
            <div className="format-header">
              <h4>{formatDisplayName(format.format)}</h4>
              <div className="suitability-score">
                <CircularProgress value={format.suitability} />
                <span>{format.suitability}% Match</span>
              </div>
            </div>

            <p className="reasoning">{format.reasoning}</p>

            <button 
              className="expand-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedFormat(expandedFormat === format.format ? null : format.format);
              }}
            >
              {expandedFormat === format.format ? 'Less' : 'More'} Details
            </button>

            {expandedFormat === format.format && (
              <div className="format-details">
                <div className="pros-cons">
                  <div className="pros">
                    <h5>✅ Pros</h5>
                    <ul>
                      {format.pros.map((pro, i) => (
                        <li key={i}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="cons">
                    <h5>❌ Cons</h5>
                    <ul>
                      {format.cons.map((con, i) => (
                        <li key={i}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="use-cases">
                  <h5>Best For:</h5>
                  <div className="tags">
                    {format.bestFor.map((use, i) => (
                      <span key={i} className="tag">{use}</span>
                    ))}
                  </div>
                </div>

                {format.avoid.length > 0 && (
                  <div className="avoid-cases">
                    <h5>Avoid If:</h5>
                    <div className="tags warning">
                      {format.avoid.map((avoid, i) => (
                        <span key={i} className="tag">{avoid}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="customizations">
                  <h5>Customization Options:</h5>
                  <ul>
                    {format.customizations.map((custom, i) => (
                      <li key={i}>{custom}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Industry-Specific Recommendations

```typescript
// components/IndustryRecommendations.tsx
const IndustryRecommendations: React.FC<{
  industries: IndustryVersion[];
  onSelect: (industry: string) => void;
}> = ({ industries, onSelect }) => {
  return (
    <div className="industry-recommendations">
      <h3>Industry-Specific CV Versions</h3>
      
      <div className="industry-selector">
        <label>Select Your Target Industry:</label>
        <select onChange={(e) => onSelect(e.target.value)}>
          <option value="">Choose an industry...</option>
          {industries.map((ind) => (
            <option key={ind.industry} value={ind.industry}>
              {ind.industry}
            </option>
          ))}
        </select>
      </div>

      {industries.map((industry) => (
        <div key={industry.industry} className="industry-card">
          <h4>{industry.industry}</h4>
          
          <div className="industry-details">
            <div className="emphasis-section">
              <h5>Key Areas to Emphasize:</h5>
              <div className="emphasis-items">
                {industry.emphasis.map((item, i) => (
                  <div key={i} className="emphasis-item">
                    <span className="icon">🎯</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="keywords-section">
              <h5>Industry Keywords:</h5>
              <div className="keyword-cloud">
                {industry.keywords.map((keyword, i) => (
                  <span key={i} className="keyword-tag">{keyword}</span>
                ))}
              </div>
            </div>

            <div className="style-recommendations">
              <div className="tone">
                <h5>Recommended Tone:</h5>
                <span className="tone-badge">{industry.tone}</span>
              </div>
              <div className="visual">
                <h5>Visual Style:</h5>
                <span className="style-badge">{industry.visualStyle}</span>
              </div>
            </div>

            <div className="content-guidance">
              <div className="must-include">
                <h5>Must Include:</h5>
                <ul>
                  {industry.mustInclude.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="can-omit">
                <h5>Can Omit:</h5>
                <ul>
                  {industry.canOmit.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 4. Interactive Features Ranking

```typescript
// components/FeatureRecommendations.tsx
const FeatureRecommendations: React.FC<{
  features: InteractiveFeatureRanking;
  onSelectFeatures: (features: string[]) => void;
}> = ({ features, onSelectFeatures }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(features.essential)
  );

  const toggleFeature = (feature: string) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(feature)) {
      newSelected.delete(feature);
    } else {
      newSelected.add(feature);
    }
    setSelectedFeatures(newSelected);
  };

  return (
    <div className="feature-recommendations">
      <h3>Recommended Interactive Features</h3>
      
      <div className="feature-categories">
        <div className="feature-category essential">
          <h4>🌟 Essential Features</h4>
          <p>These features are highly recommended for your profile</p>
          <div className="feature-list">
            {features.essential.map((feature) => (
              <FeatureCard
                key={feature}
                feature={feature}
                selected={selectedFeatures.has(feature)}
                onToggle={() => toggleFeature(feature)}
                priority="essential"
              />
            ))}
          </div>
        </div>

        <div className="feature-category recommended">
          <h4>👍 Recommended Features</h4>
          <p>These features would enhance your CV</p>
          <div className="feature-list">
            {features.recommended.map((feature) => (
              <FeatureCard
                key={feature}
                feature={feature}
                selected={selectedFeatures.has(feature)}
                onToggle={() => toggleFeature(feature)}
                priority="recommended"
              />
            ))}
          </div>
        </div>

        <div className="feature-category optional">
          <h4>🤔 Optional Features</h4>
          <p>Consider these based on your specific needs</p>
          <div className="feature-list">
            {features.optional.map((feature) => (
              <FeatureCard
                key={feature}
                feature={feature}
                selected={selectedFeatures.has(feature)}
                onToggle={() => toggleFeature(feature)}
                priority="optional"
              />
            ))}
          </div>
        </div>

        {features.notRecommended.length > 0 && (
          <div className="feature-category not-recommended">
            <h4>⚠️ Not Recommended</h4>
            <p>These features might not suit your profile or industry</p>
            <div className="feature-list disabled">
              {features.notRecommended.map((feature) => (
                <FeatureCard
                  key={feature}
                  feature={feature}
                  selected={false}
                  onToggle={() => {}}
                  priority="not-recommended"
                  disabled
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="feature-combos">
        <h4>💡 Powerful Feature Combinations</h4>
        {features.featureCombos.map((combo, index) => (
          <div key={index} className="combo-card">
            <div className="combo-features">
              {combo.features.map((f, i) => (
                <span key={i} className="feature-tag">{f}</span>
              ))}
            </div>
            <p className="synergy">{combo.synergy}</p>
            <p className="use-case">Best for: {combo.useCase}</p>
            <button 
              className="apply-combo"
              onClick={() => {
                const newSelected = new Set(selectedFeatures);
                combo.features.forEach(f => newSelected.add(f));
                setSelectedFeatures(newSelected);
              }}
            >
              Apply Combination
            </button>
          </div>
        ))}
      </div>

      <button 
        className="confirm-features"
        onClick={() => onSelectFeatures(Array.from(selectedFeatures))}
      >
        Confirm Feature Selection ({selectedFeatures.size} features)
      </button>
    </div>
  );
};
```

### 5. Visual Enhancement Preview

```typescript
// components/VisualEnhancementPreview.tsx
const VisualEnhancementPreview: React.FC<{
  enhancements: VisualEnhancement;
}> = ({ enhancements }) => {
  const [selectedScheme, setSelectedScheme] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);

  return (
    <div className="visual-enhancement-preview">
      <h3>Visual Enhancement Recommendations</h3>
      
      <div className="enhancement-sections">
        <div className="color-schemes">
          <h4>Color Schemes</h4>
          <div className="scheme-selector">
            {enhancements.colorSchemes.map((scheme, index) => (
              <div 
                key={index}
                className={`color-scheme ${selectedScheme === index ? 'selected' : ''}`}
                onClick={() => setSelectedScheme(index)}
              >
                <div className="color-preview">
                  <div 
                    className="color-swatch primary" 
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div 
                    className="color-swatch secondary" 
                    style={{ backgroundColor: scheme.secondary }}
                  />
                  <div 
                    className="color-swatch accent" 
                    style={{ backgroundColor: scheme.accent }}
                  />
                </div>
                <span className="scheme-name">{scheme.name}</span>
                <div className="suitable-for">
                  {scheme.suitable.map((s, i) => (
                    <span key={i} className="tag">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="font-pairings">
          <h4>Font Recommendations</h4>
          <div className="font-selector">
            {enhancements.fontPairings.map((pairing, index) => (
              <div 
                key={index}
                className={`font-pairing ${selectedFont === index ? 'selected' : ''}`}
                onClick={() => setSelectedFont(index)}
              >
                <h5 style={{ fontFamily: pairing.heading }}>
                  {pairing.heading}
                </h5>
                <p style={{ fontFamily: pairing.body }}>
                  {pairing.body}
                </p>
                <span className="style-tag">{pairing.style}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-recommendations">
          <h4>Recommended Visualizations</h4>
          <div className="chart-grid">
            {enhancements.recommendedCharts.map((chart, index) => (
              <div key={index} className="chart-recommendation">
                <div className="chart-icon">
                  {getChartIcon(chart.type)}
                </div>
                <h5>{chart.type}</h5>
                <p>{chart.data}</p>
                <small>{chart.reasoning}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="infographic-suggestions">
          <h4>Infographic Elements</h4>
          <div className="infographic-list">
            {enhancements.infographics.map((info, index) => (
              <div key={index} className="infographic-suggestion">
                <h5>{info.type}</h5>
                <p>{info.content}</p>
                <span className="placement">Placement: {info.placement}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="layout-style">
        <h4>Recommended Layout Style</h4>
        <div className="layout-preview">
          <div className={`layout-box ${enhancements.layoutStyle}`}>
            <span>{enhancements.layoutStyle}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 6. Keyword Optimization Panel

```typescript
// components/KeywordOptimizationPanel.tsx
const KeywordOptimizationPanel: React.FC<{
  keywords: KeywordOptimization;
}> = ({ keywords }) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="keyword-optimization-panel">
      <h3>Keyword Optimization</h3>
      
      <div className="keyword-sections">
        <div className="primary-keywords">
          <h4>🎯 Primary Keywords</h4>
          <p>Include these prominently in your CV</p>
          <div className="keyword-list">
            {keywords.primaryKeywords.map((keyword, i) => (
              <span key={i} className="keyword primary">{keyword}</span>
            ))}
          </div>
        </div>

        <div className="ats-keywords">
          <h4>🤖 ATS Keywords</h4>
          <p>Essential for applicant tracking systems</p>
          <div className="keyword-list">
            {keywords.atsKeywords.map((keyword, i) => (
              <span key={i} className="keyword ats">{keyword}</span>
            ))}
          </div>
        </div>

        <div className="industry-terms">
          <h4>🏢 Industry Terms</h4>
          <p>Demonstrate industry knowledge</p>
          <div className="keyword-list">
            {keywords.industryTerms.slice(0, showAll ? undefined : 10).map((term, i) => (
              <span key={i} className="keyword industry">{term}</span>
            ))}
          </div>
          {keywords.industryTerms.length > 10 && (
            <button 
              className="show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show ${keywords.industryTerms.length - 10} More`}
            </button>
          )}
        </div>

        <div className="linkedin-keywords">
          <h4>💼 LinkedIn SEO</h4>
          <p>Optimize your LinkedIn profile with these</p>
          <div className="keyword-list">
            {keywords.linkedinKeywords.map((keyword, i) => (
              <span key={i} className="keyword linkedin">{keyword}</span>
            ))}
          </div>
        </div>

        {keywords.avoidTerms.length > 0 && (
          <div className="avoid-terms">
            <h4>⚠️ Terms to Avoid</h4>
            <p>These may weaken your CV</p>
            <div className="keyword-list warning">
              {keywords.avoidTerms.map((term, i) => (
                <span key={i} className="keyword avoid">{term}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="keyword-density-meter">
        <h4>Keyword Density Check</h4>
        <p>Ensure balanced keyword usage without over-optimization</p>
        <div className="density-bar">
          <div className="optimal-range" />
          <div className="current-density" style={{ width: '65%' }} />
        </div>
        <span className="density-label">Good balance</span>
      </div>
    </div>
  );
};
```

### 7. Purpose-Specific Recommendations

```typescript
// components/PurposeRecommendations.tsx
const PurposeRecommendations: React.FC<{
  purposes: PurposeVersion[];
}> = ({ purposes }) => {
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');

  return (
    <div className="purpose-recommendations">
      <h3>Purpose-Specific CV Versions</h3>
      
      <div className="purpose-grid">
        {purposes.map((purpose) => (
          <div 
            key={purpose.purpose}
            className={`purpose-card ${selectedPurpose === purpose.purpose ? 'selected' : ''}`}
            onClick={() => setSelectedPurpose(purpose.purpose)}
          >
            <h4>{purpose.purpose}</h4>
            
            <div className="purpose-details">
              <div className="format-length">
                <span className="format">{purpose.format}</span>
                <span className="separator">•</span>
                <span className="length">{purpose.length} pages</span>
              </div>

              <div className="tone">
                <span>Tone: {purpose.tone}</span>
              </div>

              <div className="sections">
                <h5>Key Sections:</h5>
                <ul>
                  {purpose.sections.slice(0, 3).map((section, i) => (
                    <li key={i}>{section}</li>
                  ))}
                  {purpose.sections.length > 3 && (
                    <li>+{purpose.sections.length - 3} more</li>
                  )}
                </ul>
              </div>

              <div className="critical-elements">
                <h5>Must Include:</h5>
                <div className="element-tags">
                  {purpose.criticalElements.map((element, i) => (
                    <span key={i} className="element-tag critical">{element}</span>
                  ))}
                </div>
              </div>

              {purpose.callToAction && (
                <div className="call-to-action">
                  <h5>Call to Action:</h5>
                  <p>{purpose.callToAction}</p>
                </div>
              )}
            </div>

            <button className="use-template">
              Use This Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Recommendation Flow Integration

```typescript
// functions/src/functions/cvGeneration.ts
export const generateCVWithRecommendations = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB'
  })
  .https.onRequest(async (req, res) => {
    const { jobId, selectedOptions } = req.body;

    try {
      // Get parsed CV and recommendations
      const cvDoc = await admin.firestore()
        .collection('parsedCVs')
        .doc(jobId)
        .get();

      const { recommendations, ...cvData } = cvDoc.data();

      // Apply recommendations to CV generation
      const optimizedCV = applyRecommendations(
        cvData,
        recommendations,
        selectedOptions
      );

      // Generate CV with optimized content and format
      const generatedCV = await generateCV(
        optimizedCV,
        selectedOptions.format,
        selectedOptions.features
      );

      res.json({
        success: true,
        cvUrl: generatedCV.url,
        appliedRecommendations: selectedOptions
      });

    } catch (error) {
      console.error('Error generating CV with recommendations:', error);
      res.status(500).json({ error: 'Failed to generate CV' });
    }
  });

function applyRecommendations(
  cvData: any,
  recommendations: CVRecommendations,
  selectedOptions: any
): any {
  let optimizedCV = { ...cvData };

  // Apply content prioritization
  if (selectedOptions.format) {
    const formatRec = recommendations.formatRecommendations
      .find(f => f.format === selectedOptions.format);
    
    if (formatRec) {
      optimizedCV = prioritizeContent(optimizedCV, formatRec);
    }
  }

  // Apply industry-specific optimizations
  if (selectedOptions.industry) {
    const industryRec = recommendations.industryVersions
      .find(i => i.industry === selectedOptions.industry);
    
    if (industryRec) {
      optimizedCV = applyIndustryOptimizations(optimizedCV, industryRec);
    }
  }

  // Apply keyword optimization
  optimizedCV = injectKeywords(
    optimizedCV,
    recommendations.keywordOptimization,
    selectedOptions.keywordDensity || 'balanced'
  );

  // Apply visual enhancements
  optimizedCV.visualConfig = {
    colorScheme: selectedOptions.colorScheme || recommendations.visualEnhancements.colorSchemes[0],
    fontPairing: selectedOptions.fontPairing || recommendations.visualEnhancements.fontPairings[0],
    layoutStyle: recommendations.visualEnhancements.layoutStyle
  };

  return optimizedCV;
}
```

## Mobile Responsive Design

```typescript
// styles/recommendations.scss
.recommendations-dashboard {
  @media (max-width: 768px) {
    .recommendation-cards {
      grid-template-columns: 1fr;
    }

    .tab-nav {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      
      button {
        flex-shrink: 0;
        padding: 0.75rem 1rem;
      }
    }

    .format-grid,
    .purpose-grid {
      grid-template-columns: 1fr;
    }

    .pros-cons {
      flex-direction: column;
    }

    .keyword-sections {
      grid-template-columns: 1fr;
    }
  }
}
```

## Analytics Integration

```typescript
// Track recommendation usage
export const trackRecommendationUsage = async (
  jobId: string,
  recommendations: {
    format?: string;
    industry?: string;
    purpose?: string;
    features?: string[];
    keywords?: string[];
  }
): Promise<void> => {
  await admin.firestore()
    .collection('recommendation_analytics')
    .add({
      jobId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      selections: recommendations,
      conversionType: 'cv_generated'
    });

  // Update aggregate metrics
  await updateRecommendationMetrics(recommendations);
};
```