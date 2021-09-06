import {Person} from '../people/person.model'

export class Activity {
    _id: string;
    name: string;
    activityType: string;
    active: boolean;
    targetID: string;
    campaignID: number;
    textMetaData?: TextMetaData;
    orgIDs: string[];
    userIDs: string[];
    nonResponseSetID: string;
    scriptID: string;
    passes: number;
    idByHousehold: string;
}

export class TextMetaData {
    initTextMsg: string;
    activityPhonenums: Object[];
    quickResponses: string[];
    sendSenderName: boolean;
    sendReceiverName: boolean;
    attachImage: boolean;
    imageUrl: string;
}

export class TextContactRecord  {
    _id: string;
    person: Person;
    personID: string;
    orgID: string;
    activityID: string;
    campaignID: number;
    userID: string;
    textConvo: TextConvo[]
    residentPhonenum: string;
    userPhonenum: string;
    textInitDate: Date;
    textSuccessful: boolean;
    textReceived: {status: string, date: Date};
    pass: number;
    complete: boolean;
}
export class TextConvo  {
   origin: string;
   msg: string;
   error: string;
}
