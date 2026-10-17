export class Survey {
    _id?: string;
    name: string;
    userID?: string;
    questions: Question[];
    campaignIDs: number[];
    active?: boolean;
    orgID?: string;
    optinOption: boolean
}

export class Question {
    question: string;
    responses: Response[];
    questionType: string;
    orgIDs: string[];
}

export class Response {
    response: string;
}

export class UpdatedSurvey {
    success: boolean;
    survey: Survey;
    msg: string;
}