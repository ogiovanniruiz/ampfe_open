export class Polygon {
    _id: string;
    properties: Properties;
    geometry: string[];
}

export class Properties {
    name: string;
    description: string;
    orgID: string;
    campaignID: number;
    userID: string;
    date: Date;
    active: boolean;
    //electionData: ElectionData;
}
