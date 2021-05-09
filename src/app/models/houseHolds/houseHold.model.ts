import {Address} from '../address/address.model'
import {Name} from '../people/name.model'
import {Phone} from '../people/person.model'

export class HouseHold {
    _id: Address;
    accuracyType: string;
    location: Location;
    county: {code: string, name: string};
    residents: Resident;
    hhParties: string[];
    blockgroupID: string;
    //districts: HHDistricts.schema,
    precinct: string;
    fullAddress1: string;
    fullAddress2: string;

}

export class lockedHHResult {
    success: boolean;
    houseHold: HouseHold
}

export class Resident {
    _id:  string;
    personID:  string;
    name: Name;
    userID:  string;
    phones: Phone;
    //landline: [ string];
    //mobile: [ string];
    emails: string[];
    pav:  boolean;
    dob:  Date;
    ethnicity:  string;
    party:  string;
    affidavit:  string;
    voterID:  string;
    regDates: Date[];
    generalPropensity:  number;
    primaryPropensity:  number;
    //creationInfo: CreationInfo.schema;
    doNotContact:  boolean;

}

