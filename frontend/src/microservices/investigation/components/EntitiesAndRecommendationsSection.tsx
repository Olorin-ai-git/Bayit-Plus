import React from 'react';
import { EntityCard, RecommendationsList } from '../../../shared/components';
import type { Entity } from '../../../shared/types/wizard.types';
import type { Recommendation } from '../../../shared/components';

interface EntitiesAndRecommendationsSectionProps {
  entities: Entity[];
  recommendations: Recommendation[];
}

export const EntitiesAndRecommendationsSection: React.FC<EntitiesAndRecommendationsSectionProps> = ({
  entities,
  recommendations
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
          Investigated Entities
        </h2>
        <div className="space-y-3">
          {entities.map((entity: Entity, index: number) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              riskScore={70 + index * 5}
              findingsCount={2 + index}
            />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">
          Recommendations
        </h2>
        <RecommendationsList recommendations={recommendations} maxHeight="max-h-96" />
      </div>
    </div>
  );
};

export default EntitiesAndRecommendationsSection;
