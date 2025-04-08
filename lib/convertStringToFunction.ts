export function functionGenerator(func: string) {  
    const funcRegex = /function\s+([a-zA-Z0-9_$]+)\s*\((.*?)\)\s*\{([\s\S]*?)\}\s*$/;
     const match = func.match(funcRegex);
     if (!match) {
     throw new Error("Could not parse the function from the string");
     }
     const originalName = match[1]; //no need   
     const paramsString = match[2];      
     const bodyString = match[3];   
    const paramArray = paramsString
   .split(",")         
   .map((p) => p.trim()) 
   .filter(Boolean);
   return new Function(...paramArray, bodyString);
 }