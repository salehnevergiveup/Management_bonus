export enum AppColor {
    SUCCESS = "bg-green-100 text-green-800",
    WARNING = "bg-yellow-100 text-yellow-800",
    ERROR = "bg-red-100 text-red-800",
    INFO = "bg-blue-100 text-blue-800",
}

export enum EventOptionType {
    MFA = "mfa",
    OTP = "otp",
    EMAIL = "email",
    SMS = "sms",
}

export enum FormType {
    credential = "credential",
    verification = "verification",
}
  
export enum Roles {
Admin = "admin",
Management = "management"
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
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    SEM_COMPLETED = "sem-completed",
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
  