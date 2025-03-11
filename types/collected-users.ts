export interface CollectedUsers{ 
   username: string,  
   amount: number,  
   currency: string
}


export interface IncomingUser {
   username: string;
   game: string;
   turnover: number;
   currency: string;
   agent: string;
 }