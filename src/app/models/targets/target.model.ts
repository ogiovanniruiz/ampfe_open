export class Target {
    properties: object;
    type: string;
    geometry?: object;

}

export class Query {
    name: string;
    queryType: string;
    children?: Query[];
}

/** Flat node with expandable and level information */
export class ExampleFlatNode {
    expandable: boolean;
    name: string;
    level: number;
}

/** Flat node with expandable and level information */
export class Estimate{
    totalResidents: number;
    totalHouseHolds: number;
    filter: object;
    houseHolds: unknown;
}
