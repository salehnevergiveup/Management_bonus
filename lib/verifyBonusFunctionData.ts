/**
 * Validates if the output of a function matches the BonusResult type
 */
export function validateBonusResultType(output: any[]) {
  const errors: string[] = [];
  
  if (!Array.isArray(output)) {
    return { 
      isValid: false, 
      errors: ['Output is not an array'] 
    };
  }
  
  // If array is empty, technically valid but might be suspicious
  if (output.length === 0) {
    return { 
      isValid: true, 
      errors: ['Warning: Output array is empty'] 
    };
  }
  
  // Check each item in the array
  output.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Item at index ${index} is not an object`);
      return;
    }
    
    if (!('username' in item)) {
      errors.push(`Item at index ${index} is missing 'username' property`);
    } else if (typeof item.username !== 'string') {
      errors.push(`Item at index ${index} has 'username' that is not a string`);
    }

    if (!('turnover_id' in item)) {
      errors.push(`Item at index  is missing 'turnover id' property`);
    } else if (typeof item.turnover_id !== 'string') {
      errors.push(`Item at index  has 'turnover id' that is not a string`);
    }
    
    if (!('amount' in item)) {
      errors.push(`Item at index ${index} is missing 'amount' property`);
    } else if (typeof item.amount !== 'number' || isNaN(item.amount)) {
      errors.push(`Item at index ${index} has 'amount' that is not a number`);
    }

    if (!('game' in item)) {
      errors.push(`Item at index ${index} is missing 'game' property`);
    } else if (typeof item.amount !== 'number' || isNaN(item.amount)) {
      errors.push(`Item at index ${index} has 'game' that is not a number`);
    }
    
    if (!('currency' in item)) {
      errors.push(`Item at index ${index} is missing 'currency' property`);
    } else if (typeof item.currency !== 'string') {
      errors.push(`Item at index ${index} has 'currency' that is not a string`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates if a function has the correct parameter structure and sequence
 */
export function validateFunctionSignature(funcString: string) {
  const errors: string[] = [];
  
  // Extract function definition, ignoring any wrapper code
  const funcDef = funcString.trim();
  if (!funcDef.startsWith('function')) {
    errors.push('Not a function definition');
    return { isValid: false, errors };
  }
  
  // Extract parameter list
  const paramMatch = funcDef.match(/function\s+\w*\s*\((.*?)\)/);
  if (!paramMatch || !paramMatch[1]) {
    errors.push('Could not parse function parameters');
    return { isValid: false, errors };
  }
  
  // Get parameters
  const params = paramMatch[1].split(',').map(p => p.trim());
  
  // Check number of parameters
  if (params.length !== 3) {
    errors.push(`Function should take exactly 3 parameters, found ${params.length}`);
    return { isValid: false, errors };
  }
  
  // Check parameter order
  const expectedParams = ['turnoverData', 'exchangeRates', 'baselineData'];
  for (let i = 0; i < 3; i++) {
    // Check if the parameter exists
    if (!params[i]) {
      errors.push(`Missing parameter at position ${i+1}: expected '${expectedParams[i]}'`);
      continue;
    }
    
    // Extract parameter name (removing any type annotations)
    const paramName = params[i].split(':')[0].trim();
    
    // Check parameter name
    if (paramName !== expectedParams[i]) {
      errors.push(`Parameter at position ${i+1} should be named '${expectedParams[i]}', found '${paramName}'`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates if a string is valid JSON.
 * Returns an object with isValid: boolean, errors: string[]
 */
export function validateJsonFormat(data: string) {
  try {
    // Attempt to parse the string as JSON
    JSON.parse(data);
    
    // If we get here, parsing succeeded
    return {
      isValid: true,
      errors: []
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: [error.message]
    };
  }
}