export class Group {
    _id?: string;
    groupBy: string;
    name: string;
    queries: Query;
    orgID: string;
    campaignID: number;
    campaignWide: boolean;
    includesPolygon: boolean;
    includesSurvey: boolean;
    active: boolean;
}

export class Query {
    polygons?: any;
    not_surveys?: any[];
    and_surveys?: any[];
    party?: any[];
}

export class SurveyValues {
    name: string;
    question: string;
    response: string;
    _id: string;
}

export class EstimateResults{
    totalResidents: number;
    totalHHs: number;
    totalPhones: number;
    totalTextable: number;
    locations: number[]
}

export class Estimate{
    orgID: string;
    campaignID: number;
    queries: Query;
    groupBy: string;
    campaignWide: boolean;
}