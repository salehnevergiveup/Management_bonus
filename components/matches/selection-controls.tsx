"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

interface SelectionControlsProps {
  selectedMatches: string[];
  onClearSelection: () => void;
}

export default function SelectionControls({
  selectedMatches,
  onClearSelection
}: SelectionControlsProps) {
  const { lang } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {selectedMatches.length} {t("matches", lang)} {t("selected", lang)}
      </span>
      
      <div className="flex items-center gap-2">
        {selectedMatches.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
          >
            {t("clear selection", lang)}
          </Button>
        )}
      </div>
    </div>
  );
} 