export enum AppColor {
    SUCCESS = "bg-green-100 text-green-800",
    WARNING = "bg-yellow-100 text-yellow-800",
    ERROR = "bg-red-100 text-red-800",
    INFO = "bg-blue-100 text-blue-800",
}

export enum EventOptionType {
    TFA = "tfa",
    OTP = "phone number verification",
    EMAIL = "email",
    SMS = "sms",
}

export enum FormType {
    verification_method = "verification_method",
    verification = "verification",
}
  
export enum Roles {
Admin = "admin",
Management = "management"
}

export enum AgentAccountStatus  {  
NO_PROCESS= "no process",  
UNDER_PROCESS = "under process"
}

export enum TransferAccountStatus {  
NO_PROCESS =  "no process",  
UNDER_PROCESS = "under process"
}

export enum TransferAccountTypes {  
    MAIN_ACCOUNT = "main_account",  
    SUB_ACCOUNT =  "sub_account"
}

export enum NotificationStatus {
    READ = "read",
    UNREAD = "unread",
}
 
export enum NotificationType {
    ERROR = "error",
    SUCCESS = "success",
    WARNING = "warning",
    INFO = "info",
}

export enum ProcessStatus {
    PENDING = "pending", // one the process finished the stage one and not start the stage two 
    PROCESSING = "processing", // while the process is under processing 
    COMPLETED = "completed",
    FAILED = "failed"
}
  
export enum MatchStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed"
}

export enum RequestStatus {
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    PENDING = "pending",
}

export enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    BANNED = "banned",
}
  