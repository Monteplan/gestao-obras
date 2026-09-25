import React from 'react';
import { Work } from '../../../types';
import { RealLeafletWorksMap } from './RealLeafletWorksMap';

export interface WorksInteractiveMapContainerProps {
  works: Work[];
  onNavigateToWorkDetail: (workId: string) => void;
  onFilterChange?: (filter: { state?: string; city?: string }) => void;
}

export const WorksInteractiveMapContainer: React.FC<WorksInteractiveMapContainerProps> = ({
  works,
  onNavigateToWorkDetail,
  onFilterChange,
}) => {
  return (
    <RealLeafletWorksMap
      works={works}
      onNavigateToWorkDetail={onNavigateToWorkDetail}
      onFilterChange={onFilterChange}
    />
  );
};
