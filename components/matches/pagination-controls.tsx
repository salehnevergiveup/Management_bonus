"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalMatches: number;
  pageSize: number;
  onGoToPage: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalMatches,
  pageSize,
  onGoToPage
}: PaginationControlsProps) {
  const { lang } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
      <div className="text-sm text-muted-foreground">
        {t("showing", lang)}{" "}
        <span className="font-medium">{1 + (currentPage - 1) * pageSize} - {Math.min(currentPage * pageSize, totalMatches)}</span>{" "}
        {t("of", lang)} <span className="font-medium">{totalMatches}</span> {t("matches", lang)}
      </div>

      {totalPages > 1 && pageSize !== -1 && (
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
          <Button
            variant="outline"
            onClick={() => onGoToPage(1)}
            disabled={currentPage <= 1}
            size="sm"
            className="h-8 px-2"
          >
            {t("first", lang)}
          </Button>
          <Button
            variant="outline"
            onClick={() => onGoToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            size="sm"
            className="h-8 px-2"
          >
            {t("previous", lang)}
          </Button>
          <span className="px-2 text-sm">
            {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              if (currentPage < totalPages) {
                onGoToPage(currentPage + 1)
              }
            }}
            disabled={currentPage >= totalPages}
            size="sm"
            className="h-8 px-2"
          >
            {t("next", lang)}
          </Button>
          <Button
            variant="outline"
            onClick={() => onGoToPage(totalPages)}
            disabled={currentPage >= totalPages}
            size="sm"
            className="h-8 px-2"
          >
            {t("last", lang)}
          </Button>
        </div>
      )}
    </div>
  );
} 