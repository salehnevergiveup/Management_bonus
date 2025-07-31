"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

interface SelectionControlsProps {
  selectedMatches: string[];
  hasSelectedNotFoundPlayers: boolean;
  onClearSelection: () => void;
  onUnselectNotFound: () => Promise<void>;
  onClearNotFoundFilter: () => Promise<void>;
  onSelectAllFiltered: () => void;
  hasActiveFilters: boolean;
  totalFilteredMatches: number;
  onRefresh?: () => void;
}

export default function SelectionControls({
  selectedMatches,
  hasSelectedNotFoundPlayers,
  onClearSelection,
  onUnselectNotFound,
  onClearNotFoundFilter,
  onSelectAllFiltered,
  hasActiveFilters,
  totalFilteredMatches,
  onRefresh
}: SelectionControlsProps) {
  const { lang } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {selectedMatches.length} {t("matches", lang)} {t("selected", lang)}
      </span>
      
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="text-gray-600 hover:text-gray-700"
          >
            {t("refresh", lang)}
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSelectAllFiltered}
            className="text-green-600 hover:text-green-700"
          >
            {t("select all filtered", lang)} ({totalFilteredMatches})
          </Button>
        )}
        {selectedMatches.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
          >
            {t("clear selection", lang)}
          </Button>
        )}
        {hasSelectedNotFoundPlayers && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => await onUnselectNotFound()}
            className="text-orange-600 hover:text-orange-700"
          >
            {t("unselect not found", lang)}
          </Button>
        )}
        {selectedMatches.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => await onClearNotFoundFilter()}
            className="text-blue-600 hover:text-blue-700"
          >
            {t("clear not found filter", lang)}
          </Button>
        )}
      </div>
    </div>
  );
} 