"use client";

import React from 'react';

export  const StartProcess = () => {
  const runProcess = () => {
    fetch("api/processes", {
      method: 'POST', // Use uppercase for the HTTP method
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // If you don't have data to send, this sends an empty object
    })
      .then((res) => {
        // Check if the response is not okay
        if (!res.ok) {
          throw new Error("Something went wrong");
        }
        return res.json();
      })
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  };

  return (
    <button className="bg-black color-white" onClick={runProcess}>
      Start Process
    </button>
  );
};

export default StartProcess; 