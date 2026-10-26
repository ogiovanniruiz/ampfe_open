import { Location, Name } from "./person.model";
import { User } from "./user.model";

export class Dispatcher {
  name: Name;
  email: string;
  phonenumber: string;
  active_call?: boolean;
  on_duty?: boolean;
  orgID: string;
  userID: string;
}

export class Responder {
  _id?: string;
  name: Name;
  email: string;
  phonenumber: string;
  orgID: string;
  location?: Location;
  address?: IncidentAddress;
  audience?: string[];
}

export class Contact {
  _id?: string;
  name: Name;
  email: string;
  phonenumber: string;
  orgID: string;
  location?: Location;
  address?: IncidentAddress;
  blocked: boolean;
  audience?: string[];
}

export class Incident {
  _id?: string;
  categories: string[]; 
  status: string;
  orgID: string;
  severity: string;
  active?: boolean;
  created_by?: string;
  location?: Location;
  date_created?: Date;
  user: User;
  address: IncidentAddress;
  reports?: Report[];
}

export class Alert {
  orgID: string;
  incidentID: string;
  date_created?: Date;
  createdBy: string;
  textMessage: string;
  audiences: string[];
  coordinates: number[];
  radius: number;
}

export class Report {
  date_created?: Date;
  notes: string;
  userID?: string;
  userName: string;
}

export class HotlineCall {
  orgID: string;
  callSid: string;
  hotline_phonenumber: string;
  remote_phonenumber: string;
  remote_name: Name;
  dispatcher_phonenumber: string;
  dispatcher_name: Name;
  dispatcher_userID: string;
  date_created: Date;
  direction: string;
  call_status: string;
  notes: string;
}

export class HotlineMessage {
  orgID: string;
  internalPhonenumber: string;
  externalPhonenumber: string;
  textConversation: [{}]
  date_created?: Date;
  name: Name
}

export class IncidentAddress{
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  county: string;
}