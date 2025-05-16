"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type LanguageContextType = {
  lang: "eng" | "ch";
  setLang: (lang: "eng" | "ch") => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<"eng" | "ch">("eng");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang === "ch" || storedLang === "eng") {
      setLangState(storedLang);
    }
  }, []);

  const setLang = (newLang: "eng" | "ch") => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
