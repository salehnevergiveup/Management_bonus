"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

interface MatchesTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  renderTable: () => React.ReactNode;
}

export default function MatchesTabs({
  activeTab,
  onTabChange,
  renderTable
}: MatchesTabsProps) {
  const { lang } = useLanguage();

  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="all">{t("all_players", lang)}</TabsTrigger>
        <TabsTrigger value="matched">{t("matched_players", lang)}</TabsTrigger>
        <TabsTrigger value="unmatched">{t("unmatched_players", lang)}</TabsTrigger>
        <TabsTrigger value="not_found">{t("not found players", lang)}</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        {renderTable()}
      </TabsContent>

      <TabsContent value="matched" className="mt-0">
        {renderTable()}
      </TabsContent>

      <TabsContent value="unmatched" className="mt-0">
        {renderTable()}
      </TabsContent>

      <TabsContent value="not_found" className="mt-0">
        {renderTable()}
      </TabsContent>
    </Tabs>
  );
} 