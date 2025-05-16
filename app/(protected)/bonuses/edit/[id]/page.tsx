'use client';

import { useState, useEffect} from 'react';
import { turnoverData, exchangeRates } from '@/data/bonus-test-data';
import { 
  validateBonusResultType, 
  validateFunctionSignature, 
  validateJsonFormat 
} from '@/lib/verifyBonusFunctionData';
import { functionGenerator } from "@/lib/convertStringToFunction";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { use } from "react";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, Code, Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import CodeEditorDialog from "@/components/ui/code-editor-dialog";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";


export default function EditBonusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { auth, isLoading: authLoading } = useUser();
  const router = useRouter();

  const [bonusFunction, setBonusFunction] = useState('');
  const [baseline, setBaseLine] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalBonus, setOriginalBonus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Validation states
  const [functionErrors, setFunctionErrors] = useState<string[]>([]);
  const [baselineErrors, setBaselineErrors] = useState<string[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationPassed, setValidationPassed] = useState(false);

  const { lang, setLang } = useLanguage()
  
  // Preview/confirmation states
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[] | null>(null);
  const [showTestData, setShowTestData] = useState(false);
  
  // Editor dialog states
  const [functionEditorOpen, setFunctionEditorOpen] = useState(false);
  const [baselineEditorOpen, setBaselineEditorOpen] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the bonus data
  useEffect(() => {
    const fetchBonus = async () => {
      if (!id) return;
      
      try {
        const response = await fetch(`/api/bonuses/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch bonus");
        }
        
        const data = await response.json();
        setOriginalBonus(data.bonus);
        setName(data.bonus.name);
        setDescription(data.bonus.description || '');
        setBonusFunction(data.bonus.function || '');
        setBaseLine(typeof data.bonus.baseline === 'string' 
            ? data.bonus.baseline 
            : JSON.stringify(data.bonus.baseline, null, 2));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching bonus:', error);
        setFetchError('Failed to load bonus data. Please try again.');
        setIsLoading(false);
      }
    };
    
    if (auth && !authLoading) {
      fetchBonus();
    }
  }, [id, auth, authLoading]);

  // Authorization check
  useEffect(() => {
    if (auth) {
      if (!auth.can("bonus:edit")) {
        router.push("/dashboard");
      }
    }
  }, [auth, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/bonuses')}>
            Back to Bonuses
          </Button>
        </div>
      </div>
    );
  }

  // Check if required fields are filled
  const checkRequiredFields = () => {
    const missingFields: string[] = [];
    
    if (!name.trim()) missingFields.push('Bonus Name');
    if (!description.trim()) missingFields.push('Description');
    if (!bonusFunction.trim()) missingFields.push('Bonus Function');
    
    return {
      passed: missingFields.length === 0,
      missing: missingFields
    };
  };

  // Validate the function signature and structure
  const validateFunction = () => {
    if (!bonusFunction.trim()) {
      return { isValid: false, errors: ['Function is required'] };
    }
    
    const functionSignatureResult = validateFunctionSignature(bonusFunction);
    return functionSignatureResult;
  };

  // Validate the baseline JSON format
  const validateBaseline = () => {
    if (!baseline.trim()) {
      return { isValid: true, errors: [] }; // Baseline is optional
    }
    
    return validateJsonFormat(baseline);
  };

  // Test the function execution and output format
  const testFunction = () => {
    try {
      const newFunction = functionGenerator(bonusFunction);
      let baselineData = null;
      
      if (baseline.trim()) {
        try {
          baselineData = JSON.parse(baseline);
        } catch (error: any) {
          setBaselineErrors(['Invalid JSON format in baseline data']);
          return { executed: false, results: null };
        }
      }
      
      // Execute the function with test data
      const results = newFunction(turnoverData, exchangeRates, baselineData);
      
      // Validate the output format
      const outputValidation = validateBonusResultType(results);
      if (!outputValidation.isValid) {
        setFunctionErrors(prevErrors => [...prevErrors, ...outputValidation.errors]);
        return { executed: true, results, valid: false };
      }
      
      return { executed: true, results, valid: true };
    } catch (error: any) {
      setFunctionErrors(prevErrors => [...prevErrors, `Function execution error: ${error.message}`]);
      return { executed: false, results: null };
    }
  };

  // Handle the validation check button click
  const handleValidate = () => {
    setIsValidating(true);
    setGeneralErrors([]);
    setFunctionErrors([]);
    setBaselineErrors([]);
    setValidationPassed(false);
    
    // Check required fields
    const fieldCheck = checkRequiredFields();
    if (!fieldCheck.passed) {
      setGeneralErrors([`Missing required fields: ${fieldCheck.missing.join(', ')}`]);
      setIsValidating(false);
      return;
    }
    
    // Validate function
    const functionValidation = validateFunction();
    if (!functionValidation.isValid) {
      setFunctionErrors(functionValidation.errors);
      setIsValidating(false);
      return;
    }
    
    // Validate baseline
    const baselineValidation = validateBaseline();
    if (!baselineValidation.isValid) {
      setBaselineErrors(baselineValidation.errors);
      setIsValidating(false);
      return;
    }
    
    // Test function execution
    const result = testFunction();
    
    if (result.executed && result.valid) {
      setPreviewResults(result.results);
      setValidationPassed(true);
      toast.success("Validation passed! Please review results before submitting.");
      setShowPreview(true);
    }
    
    setIsValidating(false);
  };

  // Handle the final submission after confirmation
  const handleUpdate = async () => {
    setIsSubmitting(true);
    
    const bonusData = {
      name,
      baseline: baseline.trim() ? baseline : null,
      function: bonusFunction,
      description,
    };
    
    try {
      const response = await fetch(`/api/bonuses/${id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(bonusData)
      });
      
      if (!response.ok) {
        throw new Error("Unable to update bonus");
      }
      
      const data = await response.json();
      toast.success(data.message || "Bonus updated successfully!");
      setTimeout(() => {
        router.push('/bonuses');
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update bonus");
      setIsSubmitting(false);
    }
  };

  // Check if form has changed
  const hasChanges = () => {
    if (!originalBonus) return false;
    
    return (
      name !== originalBonus.name ||
      description !== (originalBonus.description || '') ||
      bonusFunction !== (originalBonus.function || '') ||
      baseline !== (originalBonus.baseline || '')
    );
  };

  // Example baseline data for the sample
  const exampleBaselineData = {
    games: {
      "blackjack": "high",
      "roulette": "high",
      "slots": "low",
      "baccarat": "high"
    },
    turnoverThresholds: {
      "high": [
        { turnover: 500, payout: 10 },
        { turnover: 1000, payout: 25 },
        { turnover: 5000, payout: 100 }
      ],
      "low": [
        { turnover: 200, payout: 5 },
        { turnover: 500, payout: 15 },
        { turnover: 2000, payout: 50 }
      ]
    },
    defaultCurrency: "USD"
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("bonuses", lang), href: "/bonuses" }, { label: t("edit", lang) }]} />

      {/* Validation Errors */}
      {generalErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("validation_failed", lang)}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {generalErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("edit_bonus_rule", lang)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("bonus_name", lang)}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("enter_bonus_name_placeholder", lang)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description", lang)}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("describe_bonus_placeholder", lang)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="bonusFunction">{t("bonus_function", lang)}</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowTestData(true)}>
                  {t("view_test_data", lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFunctionEditorOpen(true)}>
                  <Code className="h-4 w-4 mr-2" />
                  {t("edit_function", lang)}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border min-h-[100px] font-mono text-sm overflow-auto">
              {bonusFunction ? (
                <pre className="whitespace-pre-wrap">
                  {bonusFunction.length > 300 ? bonusFunction.substring(0, 300) + "..." : bonusFunction}
                </pre>
              ) : (
                <span className="text-gray-400">{t("no_function_defined", lang)}</span>
              )}
            </div>

            {functionErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t("function_errors", lang)}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {functionErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="baseline">{t("baseline_data_optional", lang)}</Label>
              <Button variant="outline" size="sm" onClick={() => setBaselineEditorOpen(true)}>
                <Code className="h-4 w-4 mr-2" />
                {baseline ? t("edit_json", lang) : t("create_json", lang)}
              </Button>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border min-h-[50px] font-mono text-sm overflow-auto">
              {baseline ? (
                <pre className="whitespace-pre-wrap">
                  {baseline.length > 200 ? baseline.substring(0, 200) + "..." : baseline}
                </pre>
              ) : (
                <span className="text-gray-400">{t("no_baseline_data", lang)}</span>
              )}
            </div>

            {baselineErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t("baseline_data_errors", lang)}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {baselineErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/bonuses")}>
            {t("cancel", lang)}
          </Button>
          <div className="space-x-2">
            <Button onClick={handleValidate} disabled={isValidating || !hasChanges()}>
              {isValidating ? t("checking", lang) : t("update_bonus", lang)}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Function Editor Dialog */}
      <CodeEditorDialog
        open={functionEditorOpen}
        onOpenChange={setFunctionEditorOpen}
        title={t("edit_bonus_function", lang)}
        code={bonusFunction}
        onChange={setBonusFunction}
        language="javascript"
        onValidate={validateFunction}
        onSave={() => {
          toast.success(t("function_saved", lang))
        }}
        testSampleData={{
          turnoverData: turnoverData,
          exchangeRates: exchangeRates,
          baselineData: exampleBaselineData,
        }}
        testSampleLabel={t("function_parameters_sample", lang)}
      />

      {/* Baseline Editor Dialog */}
      <CodeEditorDialog
        open={baselineEditorOpen}
        onOpenChange={setBaselineEditorOpen}
        title={t("edit_baseline_json", lang)}
        code={baseline}
        onChange={setBaseLine}
        language="json"
        onValidate={validateBaseline}
        onSave={() => {
          toast.success(t("baseline_data_saved", lang))
        }}
        testSampleData={exampleBaselineData}
        testSampleLabel={t("example_baseline_data", lang)}
      />

      {/* Preview/Confirmation Dialog */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {validationPassed ? t("confirm_bonus_update", lang) : t("validation_results", lang)}
              </DialogTitle>
            </DialogHeader>

            {validationPassed ? (
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>{t("validation_passed_title", lang)}</AlertTitle>
                  <AlertDescription>{t("validation_passed_description", lang)}</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("function_output_preview", lang)}:</h3>
                  <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(previewResults, null, 2)}</pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("updated_bonus_details", lang)}:</h3>
                  <div className="space-y-1">
                    <p>
                      <span className="font-semibold">{t("name", lang)}:</span> {name}
                    </p>
                    <p>
                      <span className="font-semibold">{t("description", lang)}:</span> {description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>{t("validation_failed", lang)}</AlertTitle>
                  <AlertDescription>{t("fix_errors_before_continuing", lang)}</AlertDescription>
                </Alert>

                {functionErrors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{t("function_errors", lang)}:</h3>
                    <ul className="list-disc pl-5">
                      {functionErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {baselineErrors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{t("baseline_errors", lang)}:</h3>
                    <ul className="list-disc pl-5">
                      {baselineErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {validationPassed ? t("make_changes", lang) : t("close", lang)}
              </Button>
              {validationPassed && (
                <Button onClick={handleUpdate} disabled={isSubmitting}>
                  {isSubmitting ? t("updating", lang) : t("confirm_and_update", lang)}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Test Data Dialog */}
      {showTestData && (
        <Dialog open={showTestData} onOpenChange={setShowTestData}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t("test_data", lang)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              <div className="space-y-2">
                <h3 className="font-semibold">{t("turnover_data", lang)}:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(turnoverData, null, 2)}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">{t("exchange_rates", lang)}:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(exchangeRates, null, 2)}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">{t("example_baseline_data", lang)}:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(exampleBaselineData, null, 2)}</pre>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowTestData(false)}>{t("close", lang)}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}