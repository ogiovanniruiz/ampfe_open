import {Name} from './name.model';
import {Address} from '../address/address.model'

export class Person {
    resident: {
        name: Name;
        userID: string;
        phones: Phone[];
        mobile: string[];
        landline: string[];
        emails: string[];
        creationInfo: CreationInfo;
    }

    address: Address;
}

export class Phone {
    type: string;
    number: string;
}

export class CreationInfo {
    createdBy: string;
    date: string;
    regType: string;
    location: object;

}