export class NonResponseSet {
    _id?: string;
    name: string;
    userID?: string;
    nonResponses: NonResponse[]
    campaignIDs: number[];
    active?: boolean;
    orgID?: string;
}

export class NonResponse {
    nonResponseType: string;
    nonResponse: string;
}

export class UpdatedNonResponseSet{
    success: boolean;
    nonResponseSet: NonResponseSet;
    msg: string;
}
