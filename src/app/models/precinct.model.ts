
export class RegistrationPrecinct {
    _id: string;
    properties: RegistrationPrecintProperties;
    geometry: string[];
}

export class RegistrationPrecintProperties {
    precinctID: string;
    description: string;
    state: string;
    county: number;
    cddist: string;
    registrationData: RegistrationData;
}

export class RegistrationData {
    dem: number;
    rep: number;
    dcl: number;
    totalReg: number;
    totalHH: number;

}