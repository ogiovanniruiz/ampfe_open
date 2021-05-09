import {Target} from '../targets/target.model';

export class Campaign {
    campaignID: number;
    name: string;
    orgIDs: string[];
    description: string;
    active: boolean;
    requests: string[];
    dataManagers: string[];
    targets: Target;
}

export class UpdatedCampaign {
    success: boolean;
    campaign: Campaign;
    msg: string;
}
