'use client';

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Code, Eye, Pencil, PlusCircle } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import CodeEditorDialog from "@/components/ui/code-editor-dialog";

// Function for validating React component code
const validateReactCode = (code) => {
  // Basic validation - check if it contains React component structure
  if (!code.includes('export default') && !code.includes('return')) {
    return { isValid: false, errors: ['Missing export default or return statement'] };
  }
  
  // Check for basic JSX syntax
  if (!code.includes('<') || !code.includes('>')) {
    return { isValid: false, errors: ['No JSX found in component'] };
  }
  
  return { isValid: true, errors: [] };
};

// Function to validate that the edit component correctly updates the data
const validateEditComponent = (code, baselineData) => {
  try {
    // This is a simplified validation - in production you'd want to run the component
    // against test data and validate its behavior
    if (!code.includes('onChange') && !code.includes('setValue')) {
      return { isValid: false, errors: ['Edit component should include onChange handlers'] };
    }
    
    return { isValid: true, errors: [] };
  } catch (error) {
    return { isValid: false, errors: [`Validation error: ${error.message}`] };
  }
};

// Function to validate that the create component correctly forms new data
const validateCreateComponent = (code, baselineData) => {
  try {
    // Similar to edit validation but for create functionality
    if (!code.includes('onSubmit') && !code.includes('handleSubmit')) {
      return { isValid: false, errors: ['Create component should include submit handler'] };
    }
    
    return { isValid: true, errors: [] };
  } catch (error) {
    return { isValid: false, errors: [`Validation error: ${error.message}`] };
  }
};

export default function JsonUIBuilder({ onSubmit }) {
  const router = useRouter();

  // Data states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseline, setBaseline] = useState('');
  
  // UI component states
  const [viewUI, setViewUI] = useState('');
  const [editUI, setEditUI] = useState('');
  const [createUI, setCreateUI] = useState('');
  
  // Editor dialog states
  const [baselineEditorOpen, setBaselineEditorOpen] = useState(false);
  const [viewEditorOpen, setViewEditorOpen] = useState(false);
  const [editEditorOpen, setEditEditorOpen] = useState(false);
  const [createEditorOpen, setCreateEditorOpen] = useState(false);
  
  // Preview states
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState('view');
  const [previewData, setPreviewData] = useState(null);
  
  // Validation states
  const [baselineErrors, setBaselineErrors] = useState([]);
  const [viewErrors, setViewErrors] = useState([]);
  const [editErrors, setEditErrors] = useState([]);
  const [createErrors, setCreateErrors] = useState([]);
  const [generalErrors, setGeneralErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationPassed, setValidationPassed] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Example baseline data
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
  
  // Example UI component templates
  const viewUITemplate = `import React from 'react';

export default function ViewComponent({ data }) {
  // This component displays the baseline data in a table format
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Game Categories</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data.games).map(([game, category]) => (
              <tr key={game}>
                <td className="px-6 py-4 whitespace-nowrap">{game}</td>
                <td className="px-6 py-4 whitespace-nowrap">{category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <h2 className="text-xl font-semibold mt-8">Turnover Thresholds</h2>
      {Object.entries(data.turnoverThresholds).map(([category, thresholds]) => (
        <div key={category} className="mt-4">
          <h3 className="text-lg font-medium">{category.toUpperCase()}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {thresholds.map((threshold, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{threshold.turnover}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{threshold.payout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      <div className="mt-4">
        <p><strong>Default Currency:</strong> {data.defaultCurrency}</p>
      </div>
    </div>
  );
}`;

  const editUITemplate = `import React, { useState } from 'react';

export default function EditComponent({ data, onSave }) {
  // Create a state copy of the data to edit
  const [formData, setFormData] = useState({ ...data });
  
  // Handle changes to the game categories
  const handleGameCategoryChange = (game, category) => {
    setFormData({
      ...formData,
      games: {
        ...formData.games,
        [game]: category
      }
    });
  };
  
  // Handle changes to turnover thresholds
  const handleThresholdChange = (category, index, field, value) => {
    const newThresholds = [...formData.turnoverThresholds[category]];
    newThresholds[index] = { 
      ...newThresholds[index], 
      [field]: field === 'turnover' || field === 'payout' ? Number(value) : value 
    };
    
    setFormData({
      ...formData,
      turnoverThresholds: {
        ...formData.turnoverThresholds,
        [category]: newThresholds
      }
    });
  };
  
  // Handle currency change
  const handleCurrencyChange = (currency) => {
    setFormData({
      ...formData,
      defaultCurrency: currency
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Game Categories</h2>
        {Object.entries(formData.games).map(([game, category]) => (
          <div key={game} className="flex items-center space-x-4">
            <span className="w-24">{game}:</span>
            <select
              value={category}
              onChange={(e) => handleGameCategoryChange(game, e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="high">high</option>
              <option value="low">low</option>
            </select>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Thresholds</h2>
        {Object.entries(formData.turnoverThresholds).map(([category, thresholds]) => (
          <div key={category} className="mt-4">
            <h3 className="text-lg font-medium">{category.toUpperCase()}</h3>
            {thresholds.map((threshold, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Turnover</label>
                  <input
                    type="number"
                    value={threshold.turnover}
                    onChange={(e) => handleThresholdChange(category, index, 'turnover', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payout</label>
                  <input
                    type="number"
                    value={threshold.payout}
                    onChange={(e) => handleThresholdChange(category, index, 'payout', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Default Currency</label>
        <select
          value={formData.defaultCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}`;

  const createUITemplate = `import React, { useState } from 'react';

export default function CreateComponent({ onSubmit }) {
  // Initial empty form based on baseline structure
  const [formData, setFormData] = useState({
    games: {},
    turnoverThresholds: {
      high: [],
      low: []
    },
    defaultCurrency: "USD"
  });
  
  // State for the new game inputs
  const [newGame, setNewGame] = useState("");
  const [newGameCategory, setNewGameCategory] = useState("high");
  
  // State for new threshold inputs
  const [newThresholdCategory, setNewThresholdCategory] = useState("high");
  const [newTurnover, setNewTurnover] = useState("");
  const [newPayout, setNewPayout] = useState("");
  
  // Add a new game
  const handleAddGame = () => {
    if (!newGame.trim()) return;
    
    setFormData({
      ...formData,
      games: {
        ...formData.games,
        [newGame.trim()]: newGameCategory
      }
    });
    
    setNewGame("");
  };
  
  // Add a new threshold
  const handleAddThreshold = () => {
    if (!newTurnover || !newPayout) return;
    
    const turnoverValue = Number(newTurnover);
    const payoutValue = Number(newPayout);
    
    if (isNaN(turnoverValue) || isNaN(payoutValue)) return;
    
    setFormData({
      ...formData,
      turnoverThresholds: {
        ...formData.turnoverThresholds,
        [newThresholdCategory]: [
          ...formData.turnoverThresholds[newThresholdCategory],
          { turnover: turnoverValue, payout: payoutValue }
        ]
      }
    });
    
    setNewTurnover("");
    setNewPayout("");
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Add Games</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Game Name</label>
            <input
              type="text"
              value={newGame}
              onChange={(e) => setNewGame(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter game name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={newGameCategory}
              onChange={(e) => setNewGameCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="high">high</option>
              <option value="low">low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddGame}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Add Game
            </button>
          </div>
        </div>
        
        {/* Display added games */}
        {Object.keys(formData.games).length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium">Added Games</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(formData.games).map(([game, category]) => (
                    <tr key={game}>
                      <td className="px-6 py-4 whitespace-nowrap">{game}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Add Thresholds</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={newThresholdCategory}
              onChange={(e) => setNewThresholdCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="high">high</option>
              <option value="low">low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Turnover</label>
            <input
              type="number"
              value={newTurnover}
              onChange={(e) => setNewTurnover(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter turnover"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payout</label>
            <input
              type="number"
              value={newPayout}
              onChange={(e) => setNewPayout(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter payout"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddThreshold}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Add Threshold
            </button>
          </div>
        </div>
        
        {/* Display added thresholds */}
        {Object.entries(formData.turnoverThresholds).map(([category, thresholds]) => (
          thresholds.length > 0 && (
            <div key={category} className="mt-4">
              <h3 className="text-lg font-medium">{category.toUpperCase()} Thresholds</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {thresholds.map((threshold, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">{threshold.turnover}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{threshold.payout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Default Currency</label>
        <select
          value={formData.defaultCurrency}
          onChange={(e) => setFormData({...formData, defaultCurrency: e.target.value})}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Create New Configuration
        </button>
      </div>
    </form>
  );
}`;

  // Validate baseline JSON format
  const validateBaseline = () => {
    if (!baseline.trim()) {
      return { isValid: false, errors: ['Baseline data is required for UI creation'] };
    }
    
    try {
      JSON.parse(baseline);
      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [`Invalid JSON format: ${error.message}`] };
    }
  };
  
  // Check if required fields are filled
  const checkRequiredFields = () => {
    const missingFields = [];
    
    if (!name.trim()) missingFields.push('UI Name');
    if (!description.trim()) missingFields.push('Description');
    if (!baseline.trim()) missingFields.push('Baseline Data');
    if (!viewUI.trim()) missingFields.push('View UI Component');
    
    return {
      passed: missingFields.length === 0,
      missing: missingFields
    };
  };
  
  // Handle the validation check
  const handleValidate = () => {
    setIsValidating(true);
    setGeneralErrors([]);
    setBaselineErrors([]);
    setViewErrors([]);
    setEditErrors([]);
    setCreateErrors([]);
    setValidationPassed(false);
    
    // Check required fields
    const fieldCheck = checkRequiredFields();
    if (!fieldCheck.passed) {
      setGeneralErrors([`Missing required fields: ${fieldCheck.missing.join(', ')}`]);
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
    
    // Parse baseline data for further validations
    let baselineData;
    try {
      baselineData = JSON.parse(baseline);
    } catch (error) {
      setBaselineErrors([`Error parsing baseline: ${error.message}`]);
      setIsValidating(false);
      return;
    }
    
    // Validate view UI
    const viewValidation = validateReactCode(viewUI);
    if (!viewValidation.isValid) {
      setViewErrors(viewValidation.errors);
      setIsValidating(false);
      return;
    }
    
    // Validate edit UI if provided
    if (editUI.trim()) {
      const editValidation = validateEditComponent(editUI, baselineData);
      if (!editValidation.isValid) {
        setEditErrors(editValidation.errors);
        setIsValidating(false);
        return;
      }
    }
    
    // Validate create UI if provided
    if (createUI.trim()) {
      const createValidation = validateCreateComponent(createUI, baselineData);
      if (!createValidation.isValid) {
        setCreateErrors(createValidation.errors);
        setIsValidating(false);
        return;
      }
    }
    
    // If all validations pass
    setValidationPassed(true);
    setPreviewData(baselineData);
    toast.success("Validation passed! You can preview the UI components.");
    setIsValidating(false);
  };
  
  // Handle preview
  const handlePreview = (type) => {
    setPreviewType(type);
    setShowPreview(true);
  };
  
  // Handle final submission
  const handleSubmit = () => {
    setIsSubmitting(true);
    
    const uiData = {
      name: name,
      description: description,
      baseline: baseline,
      viewUI: viewUI,
      editUI: editUI || null,
      createUI: createUI || null
    };
    
    try {
      // Pass the data to the parent component
      onSubmit && onSubmit(uiData);
      
      toast.success("UI components validated and ready for use!");
      setIsSubmitting(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process UI components");
      setIsSubmitting(false);
    }
  };

  // Initialize the UI templates
  useEffect(() => {
    if (!viewUI) setViewUI(viewUITemplate);
    if (!editUI) setEditUI(editUITemplate);
    if (!createUI) setCreateUI(createUITemplate);
    if (!baseline) setBaseline(JSON.stringify(exampleBaselineData, null, 2));
  }, []);

  return (
    <div className="w-full">
      {/* Error Alerts */}
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
          <CardTitle>Create JSON UI Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">UI Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this UI set"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this UI is for"
                rows={1}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="baseline">Baseline Data (JSON format)</Label>
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
              <Alert variant="destructive" className="mt-2">
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
          
          <Tabs defaultValue="view" className="mt-8">
            <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="view" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View UI
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit UI
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create UI
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>View UI Component</Label>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePreview('view')}
                    disabled={!validationPassed}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewEditorOpen(true)}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {viewUI ? 'Edit Component' : 'Create Component'}
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border min-h-[100px] font-mono text-sm overflow-auto">
                {viewUI ? (
                  <pre className="whitespace-pre-wrap">
                    {viewUI.length > 300 
                      ? viewUI.substring(0, 300) + '...' 
                      : viewUI}
                  </pre>
                ) : (
                  <span className="text-gray-400">No view component defined</span>
                )}
              </div>
              
              {viewErrors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>View UI Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {viewErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="edit" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Edit UI Component (Optional)</Label>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePreview('edit')}
                    disabled={!validationPassed || !editUI.trim()}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditEditorOpen(true)}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {editUI ? 'Edit Component' : 'Create Component'}
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border min-h-[100px] font-mono text-sm overflow-auto">
                {editUI ? (
                  <pre className="whitespace-pre-wrap">
                    {editUI.length > 300 
                      ? editUI.substring(0, 300) + '...' 
                      : editUI}
                  </pre>
                ) : (
                  <span className="text-gray-400">No edit component defined</span>
                )}
              </div>
              
              {editErrors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Edit UI Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {editErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Create UI Component (Optional)</Label>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePreview('create')}
                    disabled={!validationPassed || !createUI.trim()}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCreateEditorOpen(true)}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {createUI ? 'Edit Component' : 'Create Component'}
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border min-h-[100px] font-mono text-sm overflow-auto">
                {createUI ? (
                  <pre className="whitespace-pre-wrap">
                    {createUI.length > 300 
                      ? createUI.substring(0, 300) + '...' 
                      : createUI}
                  </pre>
                ) : (
                  <span className="text-gray-400">No create component defined</span>
                )}
              </div>
              
              {createErrors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Create UI Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {createErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
          <div className="space-x-2">
            <Button 
              variant="outline"
              onClick={handleValidate}
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!validationPassed || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create UI Components'}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Baseline Editor Dialog */}
      <CodeEditorDialog
        open={baselineEditorOpen}
        onOpenChange={setBaselineEditorOpen}
        title="Edit Baseline JSON"
        code={baseline}
        onChange={setBaseline}
        language="json"
        onValidate={validateBaseline}
        onSave={() => {
          toast.success('Baseline data saved!');
        }}
        testSampleData={exampleBaselineData}
        testSampleLabel="Example Baseline Data"
      />
      
      {/* View UI Editor Dialog */}
      <CodeEditorDialog
        open={viewEditorOpen}
        onOpenChange={setViewEditorOpen}
        title="Edit View UI Component"
        code={viewUI}
        onChange={setViewUI}
        language="javascript"
        onValidate={validateReactCode}
        onSave={() => {
          toast.success('View UI component saved!');
        }}
        testSampleData={{
          data: exampleBaselineData
        }}
        testSampleLabel="Component Props"
      />
      
      {/* Edit UI Editor Dialog */}
      <CodeEditorDialog
        open={editEditorOpen}
        onOpenChange={setEditEditorOpen}
        title="Edit Edit UI Component"
        code={editUI}
        onChange={setEditUI}
        language="javascript"
        onValidate={(code) => validateEditComponent(code, JSON.parse(baseline || '{}'))}
        onSave={() => {
          toast.success('Edit UI component saved!');
        }}
        testSampleData={{
          data: exampleBaselineData,
          onSave: "(updatedData) => console.log('Saving data:', updatedData)"
        }}
        testSampleLabel="Component Props"
      />
      
      {/* Create UI Editor Dialog */}
      <CodeEditorDialog
        open={createEditorOpen}
        onOpenChange={setCreateEditorOpen}
        title="Edit Create UI Component"
        code={createUI}
        onChange={setCreateUI}
        language="javascript"
        onValidate={(code) => validateCreateComponent(code, JSON.parse(baseline || '{}'))}
        onSave={() => {
          toast.success('Create UI component saved!');
        }}
        testSampleData={{
          onSubmit: "(newData) => console.log('Creating new data:', newData)"
        }}
        testSampleLabel="Component Props"
      />
      
      {/* Preview Dialog */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {previewType === 'view' ? 'View UI Preview' : 
                 previewType === 'edit' ? 'Edit UI Preview' : 'Create UI Preview'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[70vh] p-4 border rounded-lg">
              {/* For a real application, you would render the actual React component here */}
              {/* This is a placeholder that would show how it might look */}
              <div className="bg-white p-6">
                <p className="text-gray-500 text-center">
                  {previewType === 'view' ? 
                    'This is where the View UI would render the baseline data.' : 
                   previewType === 'edit' ? 
                    'This is where the Edit UI would provide forms to modify the baseline data.' : 
                    'This is where the Create UI would provide forms to create new data entries.'}
                </p>
                
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <h3 className="font-medium">Component Code:</h3>
                  <pre className="mt-2 text-xs overflow-x-auto">
                    {previewType === 'view' ? viewUI : 
                     previewType === 'edit' ? editUI : createUI}
                  </pre>
                </div>
                
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <h3 className="font-medium">Data Structure:</h3>
                  <pre className="mt-2 text-xs overflow-x-auto">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowPreview(false)}>Close Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}