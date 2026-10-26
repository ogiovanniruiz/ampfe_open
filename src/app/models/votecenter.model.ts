export interface VoteCenterProperties {
    Name?: string;
    Address?: string;
    Street?: string;
    City?: string;
    State?: string;
    Zip?: string;
    Hours?: string;
    'Location Type'?: string;
    County?: string;
    Election?: string;
    formatted_address?: string;
    accuracy?: number;
    accuracy_type?: string;
    Kind?: 'vote_center' | 'dropoff';
    EarlyHours?: string;
    ElectionDayHours?: string;
    Room?: string;
}

// One point from getNearestVoteCenters; `properties` lists every site at that point
export class VoteCenter {
    geometry: any;
    properties: VoteCenterProperties[];
    distanceMiles?: number;
}

// Vote centers take in-person votes and ballots; every other site only takes ballots
export function isVoteCenter(site: VoteCenterProperties): boolean {
    return site?.Kind === 'vote_center'
}

// These geocodes only put the address somewhere on its street or in its town (sometimes a
// same-named street in another city), so nearest sites and distances from them can't be trusted
const APPROXIMATE_ACCURACY = ['street_center', 'place']

export function hasPreciseLocation(household: {location?: any, accuracyType?: string}): boolean {
    return !!household?.location?.coordinates?.length && !APPROXIMATE_ACCURACY.includes(household.accuracyType)
}
