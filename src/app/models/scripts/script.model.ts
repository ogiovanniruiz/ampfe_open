export class Script {
    _id?: string;
    title: string;
    createdBy?: string;
    questions: Question[];
    campaignIDs?: number[];
    orgStatus?: {orgID: string, active?: boolean};
    participatingOrgs?: any[]
}

export class Question {
    question: string;
    responses: Response[];
    questionType: string;
}

export class Response {
    idType: string;
    response: string;
}

export class UpdatedScript {
    success: boolean;
    script: Script;
    msg: string;
}