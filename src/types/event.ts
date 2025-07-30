export interface AddEventDts {
  eventDetails: EventDetails;
  vehicleInfo: VehicleInfo;
  paymentDetails: PaymentDetails;
}

export interface EditEventDts extends AddEventDts {
  event: string;
}

export interface CreateEventDts {
  host: string;
  cohosts: string[];
  slug: string;
}

export interface RequestEventDts {
  eventDetails: EventDetails;
  vehicleInfo: VehicleInfo;
}

export interface ApproveRequestDts extends PaymentDetails {
  cohosts: string[];
}

interface EventDetails {
  eventType: string;
  clientName: string;
  phoneNumber: string;
  pickupDate: string;
  dropOffDate: string;
  pickupTime: string;
  location: string;
  stops: string[];
}

interface VehicleInfo {
  vehicleName: string;
  numberOfPassengers: number;
  hoursReserved: number;
}

export interface PaymentDetails {
  totalAmount: number;
  pendingAmount: number;
  equityDivision: number;
}
