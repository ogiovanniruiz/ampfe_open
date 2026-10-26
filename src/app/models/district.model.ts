// VALIDATED FINAL
export class District {
    _id: string;
    properties: Properties;
    geometry: string[];
}

export class Properties {
    name: string;
    districtType: string;
    identifier: string;
    electionData: ElectionData;
}

export class ElectionData {
    
    representive: string;
    election: string;
    nextElection: string;
}



