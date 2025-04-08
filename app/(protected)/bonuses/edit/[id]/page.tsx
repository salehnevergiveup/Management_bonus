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
      <Breadcrumb items={[
        { label: "Bonuses", href: "/bonuses" }, 
        { label: "Edit" }
      ]} />
      
      {/* Validation Errors */}
      {generalErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Failed</AlertTitle>
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
          <CardTitle>Edit Bonus Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bonus Name</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for this bonus rule"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how this bonus works"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="bonusFunction">
                Bonus Function
              </Label>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTestData(true)}
                >
                  View Test Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFunctionEditorOpen(true)}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Edit Function
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md border min-h-[100px] font-mono text-sm overflow-auto">
              {bonusFunction ? (
                <pre className="whitespace-pre-wrap">
                  {bonusFunction.length > 300 
                    ? bonusFunction.substring(0, 300) + '...' 
                    : bonusFunction}
                </pre>
              ) : (
                <span className="text-gray-400">No function defined</span>
              )}
            </div>
            
            {functionErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Function Errors</AlertTitle>
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
              <Label htmlFor="baseline">Baseline Data (optional, JSON format)</Label>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setBaselineEditorOpen(true)}
              >
                <Code className="h-4 w-4 mr-2" />
                {baseline ? 'Edit JSON' : 'Create JSON'}
              </Button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md border min-h-[50px] font-mono text-sm overflow-auto">
                {baseline ? (
                    <pre className="whitespace-pre-wrap">
                    {baseline.length > 200 
                        ? baseline.substring(0, 200) + '...' 
                        : baseline}
                    </pre>
                ) : (
                    <span className="text-gray-400">No baseline data defined</span>
                )}
            </div>
                            
            {baselineErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Baseline Data Errors</AlertTitle>
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
          <Button 
            variant="outline" 
            onClick={() => router.push('/bonuses')}
          >
            Cancel
          </Button>
          <div className="space-x-2">
            <Button 
              onClick={handleValidate}
              disabled={isValidating || !hasChanges()}
            >
              {isValidating ? 'Checking...' : 'Update Bonus'}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Function Editor Dialog */}
      <CodeEditorDialog
        open={functionEditorOpen}
        onOpenChange={setFunctionEditorOpen}
        title="Edit Bonus Function"
        code={bonusFunction}
        onChange={setBonusFunction}
        language="javascript"
        onValidate={validateFunction}
        onSave={() => {
          toast.success('Function saved!');
        }}
        testSampleData={{
          turnoverData: turnoverData,
          exchangeRates: exchangeRates,
          baselineData: exampleBaselineData
        }}
        testSampleLabel="Function Parameters Sample"
      />

      {/* Baseline Editor Dialog */}
      <CodeEditorDialog
        open={baselineEditorOpen}
        onOpenChange={setBaselineEditorOpen}
        title="Edit Baseline JSON"
        code={baseline}
        onChange={setBaseLine}
        language="json"
        onValidate={validateBaseline}
        onSave={() => {
          toast.success('Baseline data saved!');
        }}
        testSampleData={exampleBaselineData}
        testSampleLabel="Example Baseline Data"
      />
      
      {/* Preview/Confirmation Dialog */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {validationPassed ? 'Confirm Bonus Update' : 'Validation Results'}
              </DialogTitle>
            </DialogHeader>
            
            {validationPassed ? (
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>Validation Passed</AlertTitle>
                  <AlertDescription>
                    The function has been validated and produces the correct output format.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Function Output Preview:</h3>
                  <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(previewResults, null, 2)}</pre>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Updated Bonus Details:</h3>
                  <div className="space-y-1">
                    <p><span className="font-semibold">Name:</span> {name}</p>
                    <p><span className="font-semibold">Description:</span> {description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Validation Failed</AlertTitle>
                  <AlertDescription>
                    Please fix the errors before continuing.
                  </AlertDescription>
                </Alert>
                
                {functionErrors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Function Errors:</h3>
                    <ul className="list-disc pl-5">
                      {functionErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {baselineErrors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Baseline Errors:</h3>
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
                {validationPassed ? 'Make Changes' : 'Close'}
              </Button>
              {validationPassed && (
                <Button 
                  onClick={handleUpdate} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Confirm & Update'}
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
              <DialogTitle>Test Data</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Turnover Data:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(turnoverData, null, 2)}</pre>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Exchange Rates:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(exchangeRates, null, 2)}</pre>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Example Baseline Data:</h3>
                <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
                  <pre>{JSON.stringify(exampleBaselineData, null, 2)}</pre>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowTestData(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}