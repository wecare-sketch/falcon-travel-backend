import { EventStatus, EventType } from "../constants/enums";

export interface AddEventDts {
  eventDetails: EventDetails;
  vehicleInfo: VehicleInfo;
  paymentDetails: PaymentDetails;
}

export interface EditEventDts extends AddEventDts {
  event: string;
  participants?: string[];
}

export interface EditRequestDts {
  eventDetails: EventDetails;
  vehicleInfo: VehicleInfo;
  request: string;
  participants?: string[];
}

export interface CreateEventDts {
  host: string;
  cohosts: string[];
  slug: string;
}

export interface RequestEventDts {
  eventDetails: EventDetails;
  vehicleInfo: VehicleInfo;
  cohosts: string[];
}

export interface ApproveRequestDts extends PaymentDetails {}

interface EventDetails {
  name: string;
  eventType: string;
  clientName: string;
  phoneNumber: string;
  pickupDate: string;
  dropOffDate: string;
  pickupTime: string;
  location: string[];
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

export interface SharedEventResponse {
  trip_id: string;
  status: string;
  ETA: string;
  passengerInfo: {
    name: string;
    phone: string;
  };
  routeDetails: {
    route: string[];
  };
  vehicleInfo: {
    name: string;
    passengerCount: number;
    hoursLocked: Date;
  };
  tripNotes: string[];
}
