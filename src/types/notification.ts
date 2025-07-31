import { EventType } from "../constants/enums";
import { Event } from "../entities/event";
import { EventRequest } from "../entities/eventRequest";
import { User } from "../entities/user";

export interface NotificationInputDts {
  emit_event: string;
  title: string;
  message: string;
  metadata: {};
  eventType: EventType;
  event?: Event;
  request?: EventRequest;
  user?: User;
}
