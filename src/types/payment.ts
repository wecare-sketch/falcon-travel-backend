import { MemberRole, PaymentStatus } from "../constants/enums";

export type ParticipantInvoice = {
  email: string;
  role: MemberRole | string;
  equityAmount: number;
  depositedAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  payments: Array<{
    id: string;
    amount: number;
    method?: string;
    paidAt?: Date;
    status: string | PaymentStatus;
  }>;
};

export type InvoicePayload = {
  event: {
    slug: string;
    name: string;
    clientName: string;
    phoneNumber: string;
    pickupDate: string | Date;
    pickup: string;
    dropOff: string;
    vehicle: string;
    hoursReserved: number;
    host?: string;
  };
  participants: ParticipantInvoice[];
  totals: {
    totalAmount: number;
    depositAmount: number;
    pendingAmount: number;
    participantCount: number;
    participantsPaidCount: number;
    participantsPendingCount: number;
  };
};
