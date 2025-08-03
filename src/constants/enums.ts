export enum MemberRole {
  HOST = "host",
  COHOST = "cohost",
  MEMBER = "member",
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  SUPER_ADMIN = "super_admin",
}

export enum EventType {
  PAYMENT = "payment",
  MESSAGE = "message",
  UPDATE = "update",
  REQUEST = "request",
  FEEDBACK = "feedback",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  DISCREPANCY = "discrepancy",
}

export enum EventStatus {
  PENDING = "pending",
  FINISHED = "finished",
  EXPIRED = "expired",
  CREATED = "created",
  STARTED = "started",
  DISCREPANCY = "discrepancy",
}

export enum notificationType {
  NEW_EVENT = "new_event",
  UPDATE_EVENT = "update_event",
  UPDATE_REQUEST = "update_request",
  EVENT_REQUEST = "event_request",
  PAYMENT = "payment",
}
