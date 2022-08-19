import {Name} from '../people/name.model';

export class UpdatedUser {
    success: boolean;
    user: User;
    jwt: string;
    msg: string;

    constructor(success, user, jwt, msg) {
    }
}

export class User {
    _id?: string;
    name?: Name;
    dev?: boolean;
    loginEmail: string;
    orgPermissions?: OrgPermissions[];
    dataManager?: [];
    userAgreements?: UserAgreement[];
    oauths?: [];
    homeOrgID?: string;

    constructor(name, dev, loginEmail, orgPermissions, dataManager, userAgreements, oauths) {
    }
}

export class OrgPermissions {
    orgID: string;
    level: string;

    constructor(orgID, level) {
    }
}

export class UserAgreement {
    version: string;
    date: string;

}

