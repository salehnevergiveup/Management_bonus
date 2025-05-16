'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';
import CodeEditor from './code-editor';
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface CodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  code: string;
  onChange: (code: string) => void;
  language: 'javascript' | 'json';
  onValidate?: () => ValidationResult;
  onSave?: () => void;
  readOnly?: boolean;
  testSampleData?: any;
  testSampleLabel?: string;
}

const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({
  open,
  onOpenChange,
  title,
  code,
  onChange,
  language,
  onValidate,
  onSave,
  readOnly = false,
  testSampleData,
  testSampleLabel,
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSample, setShowSample] = useState(false);

  const handleValidate = () => {
    if (onValidate) {
      const result = onValidate();
      setValidationResult(result);
      return result.isValid;
    }
    return true;
  };

  const handleSave = () => {
    if (onSave) {
      if (onValidate) {
        const isValid = handleValidate();
        if (isValid) {
          onSave();
          onOpenChange(false);
        }
      } else {
        onSave();
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const { lang, setLang } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>{title}</span>
            {testSampleData && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSample(!showSample)}
              >
                {showSample ? 'Hide' : 'View'} {t("sample_data", lang)}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {validationResult && (
            <Alert 
              variant={validationResult.isValid ? "default" : "destructive"}
              className={validationResult.isValid ? "bg-green-50 border-green-200" : ""}
            >
              {validationResult.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {validationResult.isValid ? 'Validation Passed' : 'Validation Failed'}
              </AlertTitle>
              {!validationResult.isValid && validationResult.errors.length > 0 && (
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              )}
            </Alert>
          )}

          <div className="min-h-[300px]">
            <CodeEditor
              value={code}
              onChange={onChange}
              language={language}
              height="300px"
              readOnly={readOnly}
            />
          </div>

          {showSample && testSampleData && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold">{testSampleLabel || t("sample_data", lang)}</h3>
              <CodeEditor
                value={typeof testSampleData === 'string' 
                  ? testSampleData 
                  : JSON.stringify(testSampleData, null, 2)}
                onChange={() => {}}
                language="json"
                height="200px"
                readOnly={true}
              />
            </div>
          )}
        </div>

        <DialogFooter className="space-x-2">
          {onValidate && !readOnly && (
            <Button variant="secondary" onClick={handleValidate}>
              {t("validate", lang)}
            </Button>
          )}
          {readOnly ? (
            <Button onClick={() => onOpenChange(false)}>
             {t("close", lang)}
            </Button>
          ) : (
            <Button onClick={handleSave}>
              {onSave ? t("save", lang) : t("close", lang)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CodeEditorDialog;