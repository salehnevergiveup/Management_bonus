
const dispatchProgress =  async() => {  

}


const dispatchConfirmation = async() => {  

}


const dispatchVerificationOption = async() => {  

}


const dispatchVerificationCode =  async() => {  
    
}

export const eventDispatcher = {  
    "progress" :  () => dispatchProgress(), 
    "confirmation":  () =>  dispatchConfirmation(),  
    "options":  () =>   dispatchVerificationCode(),  
    "code":  () => dispatchVerificationOption()
}



