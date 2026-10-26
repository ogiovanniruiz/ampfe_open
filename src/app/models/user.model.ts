//VALIDATED FINAL
import {Name} from './person.model';

export class User {
    _id?: string;
    name?: Name;
    dev?: boolean;
    loginEmail!: string;
    orgPermissions?: OrgPermissions[];
    dataManager?: [number];
    userAgreements?: UserAgreement[];
    oauths?: [];
    homeOrgID?: string;
}

export class OrgPermissions {
    orgID!: string;
    level!: string;
}

export class UserAgreement {
    version!: string;
    orgID?: string;
    date!: string;
}

export class UpdatedUser {
    success!: boolean;
    user!: User;
    jwt!: string;
    msg!: string;
}

