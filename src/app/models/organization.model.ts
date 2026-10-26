export class Organization {
    _id: string;
    name: string;
    userIDs: string[];
    campaignIDs: number[];
    description: string;
    active: boolean;
    twilioAccount: TwilioAccount;
    requests: string[];
    subscription: string;
    termsAgreement: boolean;
    orgAgreements?: OrgAgreement[];
    signalWireAccount: SignalWireAccount;
    contactEmail: string;
    callingService: string;
}

export class OrgAgreement {
    version: string;
    userID: string;
    date: string;
}

export class TwilioAccount {
    sid: string;
    authToken: string;
    app_sid: string;
}

export class SignalWireAccount {
    brandID: string;
    accountID: string;
}

export class Subscription
{
    cost: number;
    startDate: Date;
    expDate: Date;
    paid:  boolean;
}
export class UpdatedOrg {
    success:  boolean;
    org: Organization;
    msg: string;
}

export class TwilioAccountStatus {
    status:  boolean;
    msg: string;
}

export class TwilioNumber {
    phoneNumber:  string;
    smsUrl: string;
}

export class Upload{
    _id?: string;
    // Tag values in the file that the tag doesn't offer (imported without a value)
    tagValueMissCount?: number;
    tagValueMisses?: {label: string, value: string, count: number}[];
    uploadName: string;
    fileName: string;
    userID: string;
    uploadFinished: boolean;
    geocoded: boolean;
    geographyFound: boolean;
    votersChecked: boolean;
    duplicatesChecked: boolean;
    voterOverwrite: boolean;
    orgID: string;
    date: Date;

}

export class CallPoolNumber {
    _id: string;
    orgID: string;
    available: boolean;
    number: string;
    dateUpdated: Date;
}


// One value a tag offers (a number of its range, or a word) and its color
export class TagValue {
    value: string;
    color: string;
}

// A tag with values and colors, e.g. "Immigrant Justice" 1-5
export class TagDefinition {
    label: string;
    valueType: 'none' | 'range' | 'list';
    range?: {min: number, max: number};
    values: TagValue[];
    color?: string; // valueType 'none'
    createdBy?: string;
    dateCreated?: Date;
}
