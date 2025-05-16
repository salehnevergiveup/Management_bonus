"use client";

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {

  const { lang, setLang } = useLanguage()

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      <Link href="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-4 w-4 mr-1" />
        {t("home", lang)}
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

