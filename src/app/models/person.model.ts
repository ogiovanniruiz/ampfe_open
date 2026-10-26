export class Membership {
    _id?: string;
    resident: Resident;
    address?: Address;
    tags?: MemberTag[];
    activityIDs?: string[];
    mergedPersonIDs?: string[];
    isRegisteredVoter?: boolean;
    geocoded?: boolean;
    fullAddress1?: string;
    fullAddress2?: string;
    accuracyType?: string;
    location?: Location;
    county?: string;
    blockID?: string;
    districts?: HHDistricts;
    electionPrecinctID?: string;
    registrationPrecinctID?: string;
    enrollment?: Enrollment;
}

// A tag on a member; value is one of the tag definition's values (none for plain tags).
// The color comes from the org's tag definition.
export class MemberTag {
    label: string;
    value?: string;
}

export class Consent {
    status: boolean;
    dateUpdated?: Date;
}

// How the member joined the org's list and what they agreed to
export class Enrollment {
    optinTexting?: Consent;
    optinEmail?: Consent;
    sourceID?: string;
    orgID?: string;
    source?: 'Texting' | 'Canvassing' | 'Phonebanking' | 'Petition' | 'Upload' | 'Manual';
    createdBy?: string;
    dateCreated?: Date;
}

export class Location{
    type: string;
    coordinates: number[];
} 

export class HHDistricts{
    countyID: string;
    bosID: string;
    citywideID: string;
    citywardID: string;
    assemblyID: string;
    senateID: string;
    congressionalID: string;
    recreationalID: string;
    schooldistrictID: string;
    waterID: string;
}

export class Resident {
    _id?: string;
    personID?: string;
    name: Name;
    phones?: Phone[];
    emails?: string[];
    pav?: boolean;
    age?: number;
    progressive?: boolean;
    segment?: string;
    ideology_score?: number;
    ethnicity?: string;
    gender?: string;
    party?: string;
    voterID?: string;
    ampID?: string;
    pdiid?: string;
    regDates?: Date[];
    generalPropensity?: number;
    primaryPropensity?: number;
    specialPropensity?: number;
    spanish_probable?: boolean;
    invalidnumber?: boolean;
}

export class Address {
    streetNum: string;
    prefix: string;
    street: string;
    suffix: string;
    unit: string;
    city: string;
    state: {name: string, abbrv: string};
    zip: string;
}

export class Name {
    firstName: string;
    lastName: string;
    middleName?: string;
    fullName: string;
}

export class Phone {
    type: string;
    number: string;
}

export class Person {
    resident: Resident;
    address: Address;
    fullAddress1: string;
    fullAddress2: string;
    accuracyType: string;
    location: Location;
    county: string;
    blockID?: string;
    districts: HHDistricts;
    electionPrecinctID?: string;
    registrationPrecinctID: string;
}

export class CreationInfo {
    createdBy: string;
    date: string;
    regType: string;
    location: object;

}

export class Household {
    _id: Address;
    residents: Resident[];
    fullAddress1: string;
    fullAddress2: string;
    accuracyType: string;
    location: Location;
    county: string;
    hhParties: string[];
    blockID?: string;
    districts: HHDistricts;
    electionPrecinctID?: string;
    registrationPrecinctID: string;
}

export class lockedHHResult {
    success: boolean;
    household: Household
}

export class FlatPerson {
    orgID: string;
    personID: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    addressLine1?: string;
    city?: string;
    county?: string;
    zip?: string;
    phone: string;
    email: string;
    race: string;
}
export class MemberSource {
    type: 'all' | 'upload' | 'tag' | 'organizer' | 'activity' | 'duplicates';
    id?: string;
}

export class MemberSummary {
    total: number;
    textable: number;
    emailable: number;
    voter: number;
    noContact: number;
    invalidNumber: number;
    notGeocoded: number;
}

export class MemberPage {
    members: Membership[];
    total: number;
    summary: MemberSummary;
    // In a tag's list: members per value of that tag ('' = no value)
    valueCounts?: {[value: string]: number};
}

export class MemberActivity {
    _id: string;
    name: string;
    activityType: string;
    count: number;
}

export class DuplicateGroup {
    key: string;
    reason: string;
    signature: string;
    members: Membership[];
}

export class MergeMembersResult {
    success: boolean;
    msg?: string;
    merged?: number;
    removed?: number;
}

export class MemberContact {
    date: Date;
    activityName: string;
    activityType: string;
    pass: number;
    complete: boolean;
    contactedBy: string;
    nonResponse: string;
    responses: {question: string, response: string}[];
}

export class MemberHistory {
    success: boolean;
    msg?: string;
    source: string;
    date: Date;
    upload: {uploadName: string, date: Date} | null;
    addedBy: string;
    activities: {_id: string, name: string, activityType: string}[];
    contacts: MemberContact[];
}
