"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

interface Bonus {
  id: string;
  name: string;
}

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  handleSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  bonusFilter: string;
  setBonusFilter: (filter: string) => void;
  availableBonuses: Bonus[];
}

export default function SearchFilters({
  searchTerm,
  setSearchTerm,
  handleSearch,
  handleSearchKeyPress,
  statusFilter,
  setStatusFilter,
  bonusFilter,
  setBonusFilter,
  availableBonuses
}: SearchFiltersProps) {
  const { lang } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("search_matches", lang)}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
        </div>
        <Button 
          size="sm" 
          onClick={handleSearch}
          className="h-10 px-4"
        >
          {t("search", lang)}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter by status", lang)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all statuses", lang)}</SelectItem>
            <SelectItem value="success">{t("success", lang)}</SelectItem>
            <SelectItem value="failed">{t("failed", lang)}</SelectItem>
            <SelectItem value="pending">{t("pending", lang)}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={bonusFilter} onValueChange={setBonusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter by bonus", lang)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all bonuses", lang)}</SelectItem>
            {availableBonuses.map((bonus) => (
              <SelectItem key={bonus.id} value={bonus.id}>
                {bonus.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 