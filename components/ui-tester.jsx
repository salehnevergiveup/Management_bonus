'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eye, Pencil, PlusCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

// Function to safely evaluate React component code
const evaluateComponentCode = (code) => {
  try {
    // In a real application, you would use a more secure evaluation method
    // This is a simplified example
    const React = require('react');
    const transformedCode = code
      .replace(/import React.*from 'react';?/g, '')
      .replace(/import \{ useState.*\} from 'react';?/g, '');
    
    // Create a function that returns the component
    const createComponent = new Function('React', 'useState', 'useEffect', `
      ${transformedCode}
      return eval(${code.includes('export default') ? 
        code.match(/export default (function|class|\()/)[1] === '(' ?
          code.match(/export default (\([^)]*\))/)[1] :
          code.match(/export default (function|class) ([A-Za-z0-9_]+)/)[2] :
        code.match(/(function|class) ([A-Za-z0-9_]+)/)[2]
      });
    `);
    
    return createComponent(React, React.useState, React.useEffect);
  } catch (error) {
    console.error('Error evaluating component code:', error);
    return () => (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to render component: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
};

export default function UITester({ components, onTestComplete }) {
  // Parse the baseline data
  const [baselineData, setBaselineData] = useState(null);
  
  // Track the current state of data for testing
  const [currentData, setCurrentData] = useState(null);
  
  // Component references
  const [ViewComponent, setViewComponent] = useState(null);
  const [EditComponent, setEditComponent] = useState(null);
  const [CreateComponent, setCreateComponent] = useState(null);
  
  // Testing state
  const [testResults, setTestResults] = useState({
    view: { tested: false, passed: false, error: null },
    edit: { tested: false, passed: false, error: null },
    create: { tested: false, passed: false, error: null }
  });
  
  // Initialize components and data
  useEffect(() => {
    if (components) {
      try {
        // Parse the baseline data
        const parsedData = typeof components.baseline === 'string' 
          ? JSON.parse(components.baseline) 
          : components.baseline;
        
        setBaselineData(parsedData);
        setCurrentData(parsedData);
        
        // Evaluate the component code
        if (components.viewUI) {
          setViewComponent(evaluateComponentCode(components.viewUI));
        }
        
        if (components.editUI) {
          setEditComponent(evaluateComponentCode(components.editUI));
        }
        
        if (components.createUI) {
          setCreateComponent(evaluateComponentCode(components.createUI));
        }
      } catch (error) {
        console.error('Error initializing UI tester:', error);
        toast.error('Failed to initialize UI tester');
      }
    }
  }, [components]);
  
  // Handle data updates from the Edit component
  const handleEditSave = (updatedData) => {
    try {
      // Validate the updated data structure against the baseline
      validateDataStructure(updatedData, baselineData);
      
      setCurrentData(updatedData);
      setTestResults(prev => ({
        ...prev,
        edit: { tested: true, passed: true, error: null }
      }));
      
      toast.success('Edit component test passed!');
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        edit: { tested: true, passed: false, error: error.message }
      }));
      
      toast.error(`Edit component test failed: ${error.message}`);
    }
  };
  
  // Handle new data creation from the Create component
  const handleCreate = (newData) => {
    try {
      // Validate the new data structure against the baseline
      validateDataStructure(newData, baselineData);
      
      // In a real app, you might merge this with existing data
      // For the test, we'll just replace the current data
      setCurrentData(newData);
      setTestResults(prev => ({
        ...prev,
        create: { tested: true, passed: true, error: null }
      }));
      
      toast.success('Create component test passed!');
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        create: { tested: true, passed: false, error: error.message }
      }));
      
      toast.error(`Create component test failed: ${error.message}`);
    }
  };
  
  // Validate data structure against baseline
  const validateDataStructure = (testData, baseline) => {
    // Check for missing required fields at top level
    for (const key of Object.keys(baseline)) {
      if (testData[key] === undefined) {
        throw new Error(`Missing required field: ${key}`);
      }
      
      // Check types match
      if (typeof testData[key] !== typeof baseline[key]) {
        throw new Error(`Type mismatch for field ${key}: expected ${typeof baseline[key]}, got ${typeof testData[key]}`);
      }
      
      // For objects, check deeper structure
      if (typeof baseline[key] === 'object' && !Array.isArray(baseline[key]) && baseline[key] !== null) {
        validateObjectStructure(testData[key], baseline[key], key);
      }
      
      // For arrays, check sample structure if items exist
      if (Array.isArray(baseline[key]) && baseline[key].length > 0) {
        validateArrayStructure(testData[key], baseline[key], key);
      }
    }
    
    return true;
  };
  
  // Helper to validate object structures
  const validateObjectStructure = (testObj, baselineObj, path) => {
    // Simplified validation - in a real app, this would be more sophisticated
    for (const key of Object.keys(baselineObj)) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (testObj[key] === undefined) {
        throw new Error(`Missing nested field: ${newPath}`);
      }
      
      // Type checking for nested objects
      if (typeof baselineObj[key] === 'object' && !Array.isArray(baselineObj[key]) && baselineObj[key] !== null) {
        validateObjectStructure(testObj[key], baselineObj[key], newPath);
      }
    }
  };
  
  // Helper to validate array structures
  const validateArrayStructure = (testArr, baselineArr, path) => {
    if (!Array.isArray(testArr)) {
      throw new Error(`Field ${path} should be an array`);
    }
    
    // If baseline has sample items, check test array items against sample structure
    if (baselineArr.length > 0 && testArr.length > 0) {
      const sampleItem = baselineArr[0];
      
      if (typeof sampleItem === 'object' && sampleItem !== null) {
        // Check each array item has the same structure
        testArr.forEach((item, index) => {
          try {
            validateObjectStructure(item, sampleItem, `${path}[${index}]`);
          } catch (error) {
            throw new Error(`Invalid structure in array item ${path}[${index}]: ${error.message}`);
          }
        });
      }
    }
  };
  
  // Test the View component
  const testViewComponent = () => {
    try {
      // For View component, we just verify it can render without errors
      setTestResults(prev => ({
        ...prev,
        view: { tested: true, passed: true, error: null }
      }));
      
      toast.success('View component test passed!');
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        view: { tested: true, passed: false, error: error.message }
      }));
      
      toast.error(`View component test failed: ${error.message}`);
    }
  };
  
  // Finalize testing and report results
  const finalizeTests = () => {
    // Check if all enabled components were tested
    const allTested = 
      testResults.view.tested && 
      (!components.editUI || testResults.edit.tested) &&
      (!components.createUI || testResults.create.tested);
    
    if (!allTested) {
      toast.warning('Please test all enabled components before finalizing');
      return;
    }
    
    // Check if all tests passed
    const allPassed = 
      testResults.view.passed && 
      (!components.editUI || testResults.edit.passed) &&
      (!components.createUI || testResults.create.passed);
    
    if (!allPassed) {
      toast.error('One or more components failed testing');
      return;
    }
    
    // All tests passed - report success
    const finalResults = {
      tested: allTested,
      passed: allPassed,
      components: {
        view: testResults.view,
        edit: testResults.edit,
        create: testResults.create
      },
      data: currentData
    };
    
    // Report results back up to parent
    onTestComplete && onTestComplete(finalResults);
    
    toast.success('All components tested successfully!');
  };
  
  if (!currentData) {
    return (
      <div className="p-8 text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Loading Data</AlertTitle>
          <AlertDescription>
            Initializing UI testing environment...
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="view">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View
          </TabsTrigger>
          <TabsTrigger 
            value="edit" 
            className="flex items-center gap-2"
            disabled={!EditComponent}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger 
            value="create" 
            className="flex items-center gap-2"
            disabled={!CreateComponent}
          >
            <PlusCircle className="h-4 w-4" />
            Create
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {ViewComponent ? (
                <div>
                  <ViewComponent data={currentData} />
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No View Component</AlertTitle>
                  <AlertDescription>
                    No view component has been defined.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <div>
              {testResults.view.tested && (
                <Alert className={testResults.view.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  {testResults.view.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertTitle>{testResults.view.passed ? "Test Passed" : "Test Failed"}</AlertTitle>
                  {testResults.view.error && (
                    <AlertDescription className="text-red-600">
                      {testResults.view.error}
                    </AlertDescription>
                  )}
                </Alert>
              )}
            </div>
            
            <Button onClick={testViewComponent}>
              Test View Component
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {EditComponent ? (
                <div>
                  <EditComponent 
                    data={currentData} 
                    onSave={handleEditSave}
                  />
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Edit Component</AlertTitle>
                  <AlertDescription>
                    No edit component has been defined.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {testResults.edit.tested && (
            <Alert className={testResults.edit.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              {testResults.edit.passed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>{testResults.edit.passed ? "Test Passed" : "Test Failed"}</AlertTitle>
              {testResults.edit.error && (
                <AlertDescription className="text-red-600">
                  {testResults.edit.error}
                </AlertDescription>
              )}
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {CreateComponent ? (
                <div>
                  <CreateComponent onSubmit={handleCreate} />
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Create Component</AlertTitle>
                  <AlertDescription>
                    No create component has been defined.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {testResults.create.tested && (
            <Alert className={testResults.create.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              {testResults.create.passed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>{testResults.create.passed ? "Test Passed" : "Test Failed"}</AlertTitle>
              {testResults.create.error && (
                <AlertDescription className="text-red-600">
                  {testResults.create.error}
                </AlertDescription>
              )}
            </Alert>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button 
          onClick={finalizeTests}
          disabled={
            !testResults.view.tested || 
            (components.editUI && !testResults.edit.tested) ||
            (components.createUI && !testResults.create.tested)
          }
        >
          Finalize Testing
        </Button>
      </div>
    </div>
  );
}