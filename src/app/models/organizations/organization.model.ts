export class Organization {
    _id: string;
    name: string;
    userIDs: string[];
    campaignIDs: number[];
    description: string;
    active: boolean;
    twilioAccount: object;
    phoneNumbers: object;
    orgTags: [];
    requests: [];
    funded: boolean;
    callPool: [];
    subscribed: boolean;
    subscription: Subscription;
}

export class Subscription
{
    cost: number;
    startDate: Date;
    expDate: Date;
}
export class UpdatedOrg {
    success:  boolean;
    org: Organization;
    msg: string;
}

export class TwilioAccount {
    status:  boolean;
    msg: string;
}

export class TwilioNumber {
    phoneNumber:  string;
    smsUrl: string;
}

