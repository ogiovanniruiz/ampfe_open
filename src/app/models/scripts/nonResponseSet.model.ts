export class NonResponseSet {
    _id?: string;
    title: string;
    createdBy?: string;
    nonResponses: NonResponse[]
    campaignIDs?: number[];
    orgStatus?: {orgID: string, active?: boolean};


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
